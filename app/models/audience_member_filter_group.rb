# frozen_string_literal: true

class AudienceMemberFilterGroup < ApplicationRecord
  belongs_to :user
  belongs_to :filterable, polymorphic: true, optional: true
  has_many :audience_member_filters, dependent: :destroy

  validates :name, presence: true

  def filter(user_id)
    # Start with all audience members for the user
    relation = AudienceMember.where(seller_id: user_id)
    
    # Apply each filter with AND logic
    audience_member_filters.includes(:audience_member_filter_group).each do |filter|
      relation = relation.merge(filter.filter(user_id))
    end
    
    relation
  end

  def audience_count(user_id, limit = nil)
    query = filter(user_id)
    query = query.limit(limit) if limit
    query.count
  end
end
