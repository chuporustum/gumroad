# frozen_string_literal: true

class SegmentPolicy < ApplicationPolicy
  def index?
    seller_user?
  end

  def show?
    seller_user? && record.user_id == user.id
  end

  def create?
    seller_user?
  end

  def update?
    seller_user? && record.user_id == user.id
  end

  def destroy?
    seller_user? && record.user_id == user.id
  end

  def preview?
    seller_user?
  end

  def generate_with_ai?
    seller_user?
  end

  private

  def seller_user?
    user.present? && user.role_owner_for?(user)
  end
end 
