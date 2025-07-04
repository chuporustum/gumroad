class CreateSegments < ActiveRecord::Migration[7.1]
  def change
    create_table :segments do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name
      t.text :description
      t.json :with_filtering

      t.timestamps
    end
  end
end
