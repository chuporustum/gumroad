class CreateAudienceMemberFilters < ActiveRecord::Migration[7.1]
  def change
    create_table :audience_member_filters do |t|
      t.references :user, null: false, foreign_key: true
      t.string :filter_type, null: false
      t.json :config, null: false
      t.references :audience_member_filter_group, null: false
      t.integer :lock_version, default: 0, null: false

      t.timestamps
    end

    add_index :audience_member_filters, [:user_id, :filter_type]
    add_index :audience_member_filters, :audience_member_filter_group_id, name: 'index_audience_member_filters_on_filter_group_id'
  end
end
