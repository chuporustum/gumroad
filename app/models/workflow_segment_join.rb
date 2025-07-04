# frozen_string_literal: true

class WorkflowSegmentJoin < ApplicationRecord
  belongs_to :workflow
  belongs_to :segment

  validates :workflow_id, uniqueness: { scope: :segment_id }
end 
