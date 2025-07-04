# frozen_string_literal: true

class InstallmentSegmentJoin < ApplicationRecord
  belongs_to :installment
  belongs_to :segment

  validates :installment_id, uniqueness: { scope: :segment_id }
end 
