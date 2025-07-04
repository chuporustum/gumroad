class AddPreheaderAndInternalTagToInstallments < ActiveRecord::Migration[7.1]
  def change
    add_column :installments, :preheader, :string
    add_column :installments, :internal_tag, :string
  end
end
