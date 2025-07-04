class CreateWorkflowSegmentJoins < ActiveRecord::Migration[7.1]
  def change
    create_table :workflow_segment_joins do |t|
      t.integer :workflow_id, null: false
      t.references :segment, null: false, foreign_key: true

      t.timestamps
    end

    add_foreign_key :workflow_segment_joins, :workflows, column: :workflow_id
    add_index :workflow_segment_joins, [:workflow_id, :segment_id], unique: true
  end
end
