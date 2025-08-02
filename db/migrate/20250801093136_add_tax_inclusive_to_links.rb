# frozen_string_literal: true

class AddTaxInclusiveToLinks < ActiveRecord::Migration[7.1]
  def up
    # Add tax_inclusive column with default true for new products
    add_column :links, :tax_inclusive, :boolean, default: true, null: false
    add_index :links, :tax_inclusive

    # Update existing products to be tax-exclusive (backward compatibility)
    # Only products created before this migration should default to false
    Link.where("created_at < ?", Time.current).update_all(tax_inclusive: false)
  end

  def down
    remove_column :links, :tax_inclusive
  end
end
