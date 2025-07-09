# frozen_string_literal: true

class InstallmentPresenter
  include ActionView::Helpers::NumberHelper
  include ActionView::Helpers::TextHelper
  include ApplicationHelper

  attr_reader :installment, :seller

  def initialize(seller:, installment: nil)
    @seller = seller
    @installment = installment
  end

  def props
    attrs = {
      name: installment.displayed_name,
      message: installment.message || "",
      preheader: installment.preheader || "",
      internal_tag: installment.internal_tag || "",
      files: installment.alive_product_files.map(&:as_json),
      published_at: installment.published_at,
      updated_at: installment.updated_at,
      external_id: installment.external_id,
      stream_only: installment.has_stream_only_files?,
      call_to_action_text: installment.call_to_action_text || "",
      call_to_action_url: installment.call_to_action_url || "",
      streamable: installment.streamable?,
      sent_count: installment.customer_count,
      click_count: installment.unique_click_count,
      open_count: installment.unique_open_count,
      click_rate: installment.click_rate_percent&.round(1),
      open_rate: installment.open_rate_percent&.round(1),
      send_emails: installment.send_emails?,
      shown_on_profile: installment.shown_on_profile?,
      installment_type: installment.installment_type || "",
      paid_more_than_cents: installment.paid_more_than_cents,
      paid_less_than_cents: installment.paid_less_than_cents,
      allow_comments: installment.allow_comments?,
      segment_ids: installment.segment_ids,
    }

    attrs.merge!(installment.json_filters)
    if installment.product_type? || installment.variant_type?
      attrs[:unique_permalink] = installment.link.unique_permalink || ""
      attrs[:variant_external_id] = installment.base_variant.external_id if installment.variant_type?
    end

    if installment.workflow_id.present?
      attrs.merge!(
        published_once_already: installment.workflow_installment_published_once_already || installment.published?,
        member_cancellation: installment.member_cancellation_trigger?,
        new_customers_only: installment.is_for_new_customers_of_workflow,
        delayed_delivery_time_duration: installment.installment_rule.displayable_time_duration,
        delayed_delivery_time_period: installment.installment_rule.time_period,
        displayed_delayed_delivery_time_period: installment.installment_rule.time_period.humanize.pluralize(installment.installment_rule.displayable_time_duration)
      )
    else
      attrs.merge!(
        clicked_urls: installment.clicked_urls.map do |(url, clicks_count)|
          {
            url: url == CreatorEmailClickEvent::VIEW_ATTACHMENTS_URL ? "View content" : url.truncate(70),
            count: clicks_count
          }
        end,
        view_count: installment.shown_on_profile? ? installment.installment_events_count : nil,
        full_url: installment.full_url || "",
        has_been_blasted: installment.has_been_blasted?,
        shown_in_profile_sections: seller.seller_profile_posts_sections.filter_map { _1.external_id if _1.shown_posts.include?(installment.id) },
        bounce_count: bounce_count,
        unsubscribe_count: unsubscribe_count,
      )

      unless installment.published?
        attrs[:recipient_description] = recipient_description || ""
        attrs[:to_be_published_at] = installment.installment_rule.to_be_published_at if installment.ready_to_publish?
      end
    end

    attrs.except(:paid_more_than, :paid_less_than)
  end

  def new_page_props(copy_from: nil)
    reference_installment = seller.installments.not_workflow_installment.alive.find_by_external_id(copy_from) if copy_from.present?
    installment_props = self.class.new(seller:, installment: reference_installment).props.except(:external_id) if reference_installment.present?

    { context: installment_form_context_props, installment: installment_props }
  end

  def edit_page_props
    { context: installment_form_context_props, installment: props }
  end

  private
    def bounce_count
      return 0 unless installment.send_emails?
      
      # Count bounced emails from email_infos table
      begin
        CreatorContactingCustomersEmailInfo.where(installment_id: installment.id, state: 'bounced').count
      rescue
        0
      end
    end

    def unsubscribe_count
      return 0 unless installment.send_emails?
      
      # Count unsubscribe events related to this installment
      # This is a simplified approach - you may need to adjust based on your unsubscribe tracking
      begin
        # If you have specific unsubscribe tracking, add it here
        # For now, return 0 as a placeholder
        0
      rescue
        0
      end
    end

    def recipient_description
      # Handle new filtering system with segments first
      if installment.segment_ids.present?
        begin
          segment_names = installment.segments.pluck(:name)
          if segment_names.length == 1
            "Segment: #{segment_names.first}"
          else
            "#{segment_names.length} segments"
          end
        rescue
          "Custom segments"
        end
      # Check for audience_type getter method if it exists
      elsif installment.respond_to?(:audience_type) && installment.audience_type.present?
        case installment.audience_type.to_s
        when 'customer'
          "Your customers"
        when 'subscriber'
          "Your subscribers"
        when 'affiliate'
          "Your affiliates"
        when 'everyone'
          "Everyone"
        else
          "Your customers and followers"
        end
      # Legacy fallback logic
      elsif installment.seller_type?
        "Your customers"
      elsif installment.product_type?
        "Customers of #{installment.link.name}"
      elsif installment.variant_type?
        "Customers of #{installment.link.name} - #{installment.base_variant.name}"
      elsif installment.follower_type?
        "Your followers"
      elsif installment.audience_type?
        "Your customers and followers"
      elsif installment.is_affiliate_product_post?
        "Affiliates of #{installment.affiliate_product_name}"
      elsif installment.affiliate_type?
        "Your affiliates"
      else
        "Recipients"
      end
    end

    def installment_form_context_props
      user_presenter = UserPresenter.new(user: seller)
      allow_comments_by_default = seller.installments.not_workflow_installment.order(:created_at).last&.allow_comments?

      {
        audience_types: user_presenter.audience_types,
        products: user_presenter.products_for_filter_box.map do |product|
          {
            permalink: product.unique_permalink,
            name: product.name,
            archived: product.archived?,
            variants: (product.is_physical? ? product.skus_alive_not_default : product.alive_variants).map { { id: _1.external_id, name: _1.name } }
          }
        end,
        affiliate_products: user_presenter.affiliate_products_for_filter_box.map do |product|
          {
            permalink: product.unique_permalink,
            name: product.name,
            archived: product.archived?
          }
        end,
        timezone: ActiveSupport::TimeZone[seller.timezone].now.strftime("%Z"),
        currency_type: seller.currency_type.to_s,
        countries: ([Compliance::Countries::USA.common_name] + Compliance::Countries.for_select.map(&:last)).uniq,
        profile_sections: seller.seller_profile_posts_sections.map { { id: _1.external_id, name: _1.header } },
        has_scheduled_emails: Installment.alive.not_workflow_installment.scheduled.where(seller:).exists?,
        aws_access_key_id: AWS_ACCESS_KEY,
        s3_url: s3_bucket_url,
        user_id: seller.external_id,
        allow_comments_by_default: allow_comments_by_default.nil? ? true : allow_comments_by_default,
      }
    end
end
