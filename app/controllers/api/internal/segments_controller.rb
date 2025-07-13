# frozen_string_literal: true

class Api::Internal::SegmentsController < Api::Internal::BaseController
  before_action :authenticate_user!
  after_action :verify_authorized
  before_action :set_segment, only: %i[show update destroy]

  def index
    authorize Segment

    segments = current_seller.segments.includes(audience_member_filter_groups: :audience_member_filters)

    render json: {
      segments: segments.map do |segment|
        {
          id: segment.id,
          name: segment.name,
          audience_count: segment.audience_count,
          created_at: segment.created_at,
          updated_at: segment.updated_at,
          last_used_at: segment.updated_at, # For now, using updated_at as last_used_at
          audience_member_filter_groups: segment.audience_member_filter_groups.map do |filter_group|
            {
              id: filter_group.id,
              name: filter_group.name,
              audience_member_filters: filter_group.audience_member_filters.map do |filter|
                {
                  id: filter.id,
                  filter_type: filter.filter_type,
                  config: serialize_filter_config(filter.config)
                }
              end
            }
          end
        }
      end
    }
  end

  def show
    render json: {
      segment: {
        id: @segment.id,
        name: @segment.name,
        audience_type: @segment.respond_to?(:audience_type) ? @segment.audience_type : "customer",
        audience_count: @segment.audience_count,
        created_at: @segment.created_at,
        updated_at: @segment.updated_at,
        audience_member_filter_groups: @segment.audience_member_filter_groups.includes(:audience_member_filters).map do |filter_group|
          {
            id: filter_group.id,
            name: filter_group.name,
            audience_member_filters: filter_group.audience_member_filters.map do |filter|
              {
                id: filter.id,
                filter_type: filter.filter_type,
                config: serialize_filter_config(filter.config)
              }
            end
          }
        end
      }
    }
  end

  def create
    authorize Segment

    ActiveRecord::Base.transaction do
      @segment = current_seller.segments.create!(segment_params)

      # Create filter groups if provided
      if params[:filter_groups].present?
        params[:filter_groups].each do |filter_group_params|
          filter_group = @segment.audience_member_filter_groups.create!(
            user: current_seller,
            name: filter_group_params[:name] || "Filter Group"
          )

          if filter_group_params[:filters].present?
            filter_group_params[:filters].each do |filter_params|
              filter_group.audience_member_filters.create!(
                user: current_seller,
                filter_type: filter_params[:filter_type],
                config: filter_params[:config]
              )
            end
          end
        end
      end
    end

    render json: { 
      success: true, 
      segment: {
        id: @segment.id,
        name: @segment.name,
        audience_type: @segment.respond_to?(:audience_type) ? @segment.audience_type : "customer",
        audience_count: @segment.audience_count,
        created_at: @segment.created_at,
        updated_at: @segment.updated_at,
        audience_member_filter_groups: @segment.audience_member_filter_groups.includes(:audience_member_filters).map do |filter_group|
          {
            id: filter_group.id,
            name: filter_group.name,
            audience_member_filters: filter_group.audience_member_filters.map do |filter|
              {
                id: filter.id,
                filter_type: filter.filter_type,
                config: serialize_filter_config(filter.config)
              }
            end
          }
        end
      }
    }, status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { success: false, errors: e.record.errors.full_messages }
  end

  def update
    ActiveRecord::Base.transaction do
      @segment.update!(segment_params)

      # Update filter groups if provided
      if params[:filter_groups].present?
        # Remove existing filter groups
        @segment.audience_member_filter_groups.destroy_all

        # Create new filter groups
        params[:filter_groups].each do |filter_group_params|
          filter_group = @segment.audience_member_filter_groups.create!(
            user: current_seller,
            name: filter_group_params[:name] || "Filter Group"
          )

          if filter_group_params[:filters].present?
            filter_group_params[:filters].each do |filter_params|
              filter_group.audience_member_filters.create!(
                user: current_seller,
                filter_type: filter_params[:filter_type],
                config: filter_params[:config]
              )
            end
          end
        end
      end
    end

    render json: {
      success: true,
      segment: {
        id: @segment.id,
        name: @segment.name,
        audience_count: @segment.audience_count,
        created_at: @segment.created_at,
        updated_at: @segment.updated_at,
        audience_member_filter_groups: @segment.audience_member_filter_groups.includes(:audience_member_filters).map do |filter_group|
          {
            id: filter_group.id,
            name: filter_group.name,
            audience_member_filters: filter_group.audience_member_filters.map do |filter|
              {
                id: filter.id,
                filter_type: filter.filter_type,
                config: serialize_filter_config(filter.config)
              }
            end
          }
        end
      }
    }
  rescue ActiveRecord::RecordInvalid => e
    render json: { success: false, errors: e.record.errors.full_messages }
  end

  def destroy
    @segment.destroy!
    render json: { success: true }
  end

  def preview
    authorize Segment

    # Build temporary segment with provided filter groups
    segment = Segment.new(user: current_seller)

    if params[:filter_groups].present?
      audience_member_ids = Set.new

      params[:filter_groups].each do |filter_group_params|
        if filter_group_params[:filters].present?
          # Start with all audience members for this seller
          group_audience_ids = AudienceMember.where(seller_id: current_seller.id)

          filter_group_params[:filters].each do |filter_params|
            filter = AudienceMemberFilter.new(
              user: current_seller,
              filter_type: filter_params[:filter_type],
              config: filter_params[:config]
            )

            # Apply filter to narrow down the audience
            filtered_relation = filter.filter(current_seller.id)
            # Apply the filtering to the current group
            group_audience_ids = group_audience_ids.merge(filtered_relation)
          end

          # Get the IDs for this filter group
          group_ids = group_audience_ids.pluck(:id)

          if audience_member_ids.empty?
            audience_member_ids = Set.new(group_ids)
          else
            audience_member_ids |= group_ids  # Union (OR) between filter groups
          end
        end
      end

      audience_count = audience_member_ids.size
      preview_emails = if audience_member_ids.any?
        AudienceMember.where(id: audience_member_ids.to_a).limit(5).pluck(:email)
      else
        []
      end
    else
      audience_count = 0
      preview_emails = []
    end

    render json: {
      audience_count: audience_count,
      preview_emails: preview_emails
    }
  end

  def generate_with_ai
    authorize Segment

    description = params[:description]

    if description.blank?
      render json: { success: false, error: "Description is required" }, status: :bad_request
      return
    end

    result = SegmentAiGeneratorService.new(user: current_seller, description: description).generate

    if result[:success]
      render json: {
        success: true,
        filter_groups: result[:filter_groups],
        suggested_name: result[:suggested_name]
      }
    else
      render json: {
        success: false,
        error: result[:error] || "Failed to generate segment"
      }, status: :unprocessable_entity
    end
  end

  private

  def set_segment
    @segment = current_seller.segments.find(params[:id])
    authorize @segment
  end

  def segment_params
    params.require(:segment).permit(:name, :audience_type, :description)
  end

  def serialize_filter_config(config)
    # Ensure config is always a hash/object, not a JSON string
    return config if config.is_a?(Hash)
    return JSON.parse(config) if config.is_a?(String)
    config
  rescue JSON::ParserError
    {}
  end
end
