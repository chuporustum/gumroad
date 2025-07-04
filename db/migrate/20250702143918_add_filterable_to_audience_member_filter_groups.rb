class AddFilterableToAudienceMemberFilterGroups < ActiveRecord::Migration[7.1]
  def change
    add_reference :audience_member_filter_groups, :filterable, polymorphic: true, null: true
    add_index :audience_member_filter_groups, [:filterable_type, :filterable_id]
  end
end
