# frozen_string_literal: true

class Segment < ApplicationRecord
  include WithFiltering

  belongs_to :user
  has_many :audience_member_filter_groups, as: :filterable, dependent: :destroy
  has_many :installment_segment_joins, dependent: :destroy
  has_many :installments, through: :installment_segment_joins
  has_many :workflow_segment_joins, dependent: :destroy
  has_many :workflows, through: :workflow_segment_joins

  validates :name, presence: true
  validates :name, uniqueness: { scope: :user_id }

  scope :for_user, ->(user) { where(user: user) }

  # Temporary method to provide default audience_type until migration can be run
  def audience_type
    # Check if the column exists in the database
    if self.class.column_names.include?('audience_type')
      self[:audience_type] || 'customer'
    else
      'customer'
    end
  end

  def audience_type=(value)
    # Only set if column exists
    if self.class.column_names.include?('audience_type')
      self[:audience_type] = value
    end
    # Otherwise ignore the assignment silently
  end

  def filter(user_id)
    # Start with an empty relation
    base_relation = AudienceMember.where(seller_id: user_id)
    
    # If no filter groups, return empty
    return base_relation.none if audience_member_filter_groups.empty?
    
    # Combine all filter groups with OR logic
    combined_relation = audience_member_filter_groups.first.filter(user_id)
    
    audience_member_filter_groups.drop(1).each do |filter_group|
      combined_relation = combined_relation.or(filter_group.filter(user_id))
    end
    
    combined_relation
  end

  def audience_count(limit = nil)
    query = filter(user_id)
    query = query.limit(limit) if limit
    query.count
  end

  def preview_emails(limit = 5)
    filter(user_id).limit(limit).pluck(:email)
  end
end
