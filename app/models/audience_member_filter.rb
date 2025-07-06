# frozen_string_literal: true

class AudienceMemberFilter < ApplicationRecord
  belongs_to :user
  belongs_to :audience_member_filter_group

  FILTER_TYPES = %w[date product payment location email_engagement].freeze

  enum filter_type: FILTER_TYPES.index_with(&:itself)

  validates :filter_type, inclusion: { in: FILTER_TYPES }
  validate :config_matches_schema

  before_validation :set_default_config

  scope :by_type, ->(type) { where(filter_type: type) }

  def self.filter(user_id)
    AudienceMember.where(seller_id: user_id)
  end

  def filter(user_id)
    base_relation = AudienceMember.where(seller_id: user_id)

    case filter_type
    when 'date'
      filter_by_date(base_relation)
    when 'product'
      filter_by_product(base_relation)
    when 'payment'
      filter_by_payment(base_relation)
    when 'location'
      filter_by_location(base_relation)
    when 'email_engagement'
      filter_by_email_engagement(base_relation, user_id)
    else
      base_relation.none
    end
  end

  private

  def set_default_config
    self.config ||= {}
  end

  def config_matches_schema
    return unless filter_type.present? && config.present?

    schema_path = Rails.root.join("lib", "json_schemas", "audience_member_filters", "#{filter_type}.json")
    return unless File.exist?(schema_path)

    schema = JSON.parse(File.read(schema_path))
    errors_list = JSON::Validator.fully_validate(schema, config, strict: true)
    
    errors_list.each { |error| errors.add(:config, error) }
  end

  def filter_by_date(relation)
    operator = config['operator']
    
    case operator
    when 'is_after'
      date = Date.parse(config['date'])
      relation.where('min_created_at >= ?', date.beginning_of_day)
    when 'is_before'
      date = Date.parse(config['date'])
      relation.where('max_created_at <= ?', date.end_of_day)
    when 'between'
      start_date = Date.parse(config['start_date'])
      end_date = Date.parse(config['end_date'])
      relation.where(min_created_at: start_date.beginning_of_day..end_date.end_of_day)
    else
      relation.none
    end
  rescue Date::Error
    relation.none
  end

  def filter_by_product(relation)
    operator = config['operator']
    product_ids = config['product_ids']
    
    return relation.none if product_ids.blank?

    case operator
    when 'has_bought'
      relation.joins("INNER JOIN JSON_TABLE(details, '$.purchases[*]' COLUMNS (product_id INT PATH '$.product_id')) AS jt")
              .where('jt.product_id IN (?)', product_ids)
    when 'has_not_bought'
      subquery = relation.joins("INNER JOIN JSON_TABLE(details, '$.purchases[*]' COLUMNS (product_id INT PATH '$.product_id')) AS jt")
                         .where('jt.product_id IN (?)', product_ids)
                         .select(:id)
      relation.where.not(id: subquery)
    else
      relation.none
    end
  end

  def filter_by_payment(relation)
    operator = config['operator']
    
    case operator
    when 'is_more_than'
      amount_cents = config['amount_cents']
      relation.where('min_paid_cents > ?', amount_cents)
    when 'is_less_than'
      amount_cents = config['amount_cents']
      relation.where('max_paid_cents < ?', amount_cents)
    when 'is_between'
      min_amount = config['min_amount_cents']
      max_amount = config['max_amount_cents']
      relation.where(min_paid_cents: min_amount..max_amount)
              .where(max_paid_cents: min_amount..max_amount)
    else
      relation.none
    end
  end

  def filter_by_location(relation)
    operator = config['operator']
    conditions = []
    values = []

    if config['country'].present?
      country_condition = "JSON_CONTAINS(details, JSON_QUOTE(?), '$.purchases[*].country')"
      conditions << country_condition
      values << config['country']
    end

    return relation.none if conditions.empty?

    final_condition = conditions.join(' OR ')
    
    case operator
    when 'is'
      relation.where(final_condition, *values)
    when 'is_not'
      relation.where.not(final_condition, *values)
    else
      relation.none
    end
  end

  def filter_by_email_engagement(relation, user_id)
    operator = config['operator']
    days = config['days']

    return relation.none if days.blank?

    cutoff_date = days.to_i.days.ago

    case operator
    when 'in_last'
      # Find audience members who opened emails in the last X days
      # We'll use a simpler approach - check if they have any email engagement
      # In a real implementation, you'd join with email tracking tables
      
      # For now, return a subset of active audience members as a placeholder
      # This should be replaced with actual email tracking logic
      relation.where('updated_at >= ?', cutoff_date)
      
    when 'not_in_last'
      # Find audience members who have NOT opened emails in the last X days
      relation.where('updated_at < ?', cutoff_date)
      
    else
      relation.none
    end
  end
end
