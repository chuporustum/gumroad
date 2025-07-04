class CreateAudienceMemberFilterGroups < ActiveRecord::Migration[7.1]
  def change
    create_table :audience_member_filter_groups do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name

      t.timestamps
    end

    add_index :audience_member_filter_groups, [:user_id, :id]
  end
end
