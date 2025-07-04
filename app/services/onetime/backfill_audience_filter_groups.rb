# frozen_string_literal: true

class Onetime::BackfillAudienceFilterGroups
  def self.run!
    new.run!
  end

  def run!
    puts "Starting backfill of AudienceMemberFilterGroups..."
    
    backfilled_installments = 0
    backfilled_workflows = 0
    
    # Backfill Installments
    Installment.includes(:seller).find_each do |installment|
      next unless installment.respond_to?(:audience_member_filter_groups)
      next if installment.audience_member_filter_groups.any? # Skip if already has filter groups
      
      if backfill_item(installment)
        backfilled_installments += 1
        puts "Backfilled Installment #{installment.id}"
      end
    end
    
    # Backfill Workflows
    Workflow.includes(:seller).find_each do |workflow|
      next unless workflow.respond_to?(:audience_member_filter_groups)
      next if workflow.audience_member_filter_groups.any? # Skip if already has filter groups
      
      if backfill_item(workflow)
        backfilled_workflows += 1
        puts "Backfilled Workflow #{workflow.id}"
      end
    end
    
    puts "Backfill completed!"
    puts "Installments backfilled: #{backfilled_installments}"
    puts "Workflows backfilled: #{backfilled_workflows}"
  end

  private

  def backfill_item(item)
    return false unless has_legacy_filters?(item)
    
    ActiveRecord::Base.transaction do
      # Create a filter group for this item
      filter_group = AudienceMemberFilterGroup.create!(
        user: item.seller,
        name: "Legacy Filters for #{item.class.name} #{item.id}",
        filterable: item
      )
      
      # Create individual filters based on the legacy JSON data
      create_filters_from_legacy_data(item, filter_group)
      
      true
    end
  rescue => e
    puts "Error backfilling #{item.class.name} #{item.id}: #{e.message}"
    false
  end

  def has_legacy_filters?(item)
    item.bought_products.present? ||
    item.not_bought_products.present? ||
    item.bought_variants.present? ||
    item.not_bought_variants.present? ||
    item.paid_more_than_cents.present? ||
    item.paid_less_than_cents.present? ||
    item.created_after.present? ||
    item.created_before.present? ||
    item.bought_from.present? ||
    item.affiliate_products.present?
  end

  def create_filters_from_legacy_data(item, filter_group)
    # Date filters
    if item.created_after.present? || item.created_before.present?
      create_date_filter(item, filter_group)
    end
    
    # Product filters
    if item.bought_products.present? || item.not_bought_products.present?
      create_product_filters(item, filter_group)
    end
    
    # Payment filters
    if item.paid_more_than_cents.present? || item.paid_less_than_cents.present?
      create_payment_filter(item, filter_group)
    end
    
    # Location filters
    if item.bought_from.present?
      create_location_filter(item, filter_group)
    end
    
    # Recipient type filter (approximate based on item type)
    create_recipient_filter(item, filter_group)
  end

  def create_date_filter(item, filter_group)
    config = {}
    
    if item.created_after.present? && item.created_before.present?
      config = {
        operator: 'between',
        start_date: item.created_after.to_date.iso8601,
        end_date: item.created_before.to_date.iso8601
      }
    elsif item.created_after.present?
      config = {
        operator: 'is_after',
        date: item.created_after.to_date.iso8601
      }
    elsif item.created_before.present?
      config = {
        operator: 'is_before',
        date: item.created_before.to_date.iso8601
      }
    end
    
    AudienceMemberFilter.create!(
      user: item.seller,
      filter_type: 'date',
      config: config,
      audience_member_filter_group: filter_group
    )
  end

  def create_product_filters(item, filter_group)
    if item.bought_products.present?
      # Get product IDs from permalinks
      product_ids = Link.where(unique_permalink: item.bought_products).pluck(:id)
      
      AudienceMemberFilter.create!(
        user: item.seller,
        filter_type: 'product',
        config: {
          operator: 'has_bought',
          product_ids: product_ids
        },
        audience_member_filter_group: filter_group
      )
    end
    
    if item.not_bought_products.present?
      # Get product IDs from permalinks
      product_ids = Link.where(unique_permalink: item.not_bought_products).pluck(:id)
      
      AudienceMemberFilter.create!(
        user: item.seller,
        filter_type: 'product',
        config: {
          operator: 'has_not_bought',
          product_ids: product_ids
        },
        audience_member_filter_group: filter_group
      )
    end
  end

  def create_payment_filter(item, filter_group)
    config = {}
    
    if item.paid_more_than_cents.present? && item.paid_less_than_cents.present?
      config = {
        operator: 'is_between',
        min_amount_cents: item.paid_more_than_cents,
        max_amount_cents: item.paid_less_than_cents
      }
    elsif item.paid_more_than_cents.present?
      config = {
        operator: 'is_more_than',
        amount_cents: item.paid_more_than_cents
      }
    elsif item.paid_less_than_cents.present?
      config = {
        operator: 'is_less_than',
        amount_cents: item.paid_less_than_cents
      }
    end
    
    AudienceMemberFilter.create!(
      user: item.seller,
      filter_type: 'payment',
      config: config,
      audience_member_filter_group: filter_group
    )
  end

  def create_location_filter(item, filter_group)
    AudienceMemberFilter.create!(
      user: item.seller,
      filter_type: 'location',
      config: {
        operator: 'is',
        country: item.bought_from
      },
      audience_member_filter_group: filter_group
    )
  end

  def create_recipient_filter(item, filter_group)
    # Determine recipient type based on the item's type and context
    recipient_type = case
    when item.audience_type?
      'everyone'
    when item.seller_type?
      'customer'
    when item.follower_type?
      'subscriber'
    when item.affiliate_type?
      'affiliate'
    else
      'customer' # Default fallback
    end
    
    AudienceMemberFilter.create!(
      user: item.seller,
      filter_type: 'recipient',
      config: {
        operator: 'is',
        type: recipient_type
      },
      audience_member_filter_group: filter_group
    )
  end
end 
