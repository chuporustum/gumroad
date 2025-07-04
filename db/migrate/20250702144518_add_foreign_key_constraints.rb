class AddForeignKeyConstraints < ActiveRecord::Migration[7.1]
  def change
    add_foreign_key :audience_member_filters, :audience_member_filter_groups, column: :audience_member_filter_group_id
  end
end
