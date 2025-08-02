# frozen_string_literal: true

require "spec_helper"

describe SalesTaxCalculator do
  describe "tax-inclusive pricing for bundles" do
    before(:each) do
      @seller = create(:user)
    end

    describe "bundle tax calculations" do
      it "calculates tax correctly for tax-inclusive bundles" do
        tax_rate = create(:zip_tax_rate, country: "DE", zip_code: nil, state: nil, combined_rate: 0.19, is_seller_responsible: false)
        bundle = create(:product, user: @seller, price_cents: 2380, tax_inclusive: true, is_bundle: true)

        calculator = SalesTaxCalculator.new(
          product: bundle,
          price_cents: 2380,
          buyer_location: { country: "DE" }
        )

        result = calculator.calculate

        # For 19% tax rate: tax = 2380 * (0.19 / 1.19) = 380
        expect(result.tax_cents.round).to eq(380)
        expect(result.price_cents).to eq(2380)
      end

      it "calculates tax correctly for tax-exclusive bundles" do
        tax_rate = create(:zip_tax_rate, country: "DE", zip_code: nil, state: nil, combined_rate: 0.19, is_seller_responsible: false)
        bundle = create(:product, user: @seller, price_cents: 2000, tax_inclusive: false, is_bundle: true)

        calculator = SalesTaxCalculator.new(
          product: bundle,
          price_cents: 2000,
          buyer_location: { country: "DE" }
        )

        result = calculator.calculate

        # For 19% tax rate on 2000: tax = 2000 * 0.19 = 380
        expect(result.tax_cents).to eq(380)
        expect(result.price_cents).to eq(2000)
      end

    end
  end
end