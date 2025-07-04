class CreateInstallmentSegmentJoins < ActiveRecord::Migration[7.1]
  def change
    create_table :installment_segment_joins do |t|
      t.integer :installment_id, null: false
      t.references :segment, null: false, foreign_key: true

      t.timestamps
    end

    add_foreign_key :installment_segment_joins, :installments, column: :installment_id
    add_index :installment_segment_joins, [:installment_id, :segment_id], unique: true
  end
end
