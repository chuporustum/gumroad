# frozen_string_literal: true

require "spec_helper"

describe SalesTaxCalculator do
  describe "tax-inclusive pricing" do
    before(:each) do
      @seller = create(:user)
    end

    describe "with lookup table" do
      it "calculates tax correctly for tax-inclusive pricing in EU" do
        tax_rate = create(:zip_tax_rate, country: "DE", zip_code: nil, state: nil, combined_rate: 0.19, is_seller_responsible: false)
        product = create(:product, user: @seller, price_cents: 1190, tax_inclusive: true)

        calculator = SalesTaxCalculator.new(
          product: product,
          price_cents: 1190,
          buyer_location: { country: "DE" }
        )

        result = calculator.calculate

        # For 19% tax rate: tax = 1190 * (0.19 / 1.19) = 190
        expect(result.tax_cents.round).to eq(190)
        expect(result.price_cents).to eq(1190)
      end

      it "calculates tax correctly for tax-exclusive pricing in EU" do
        tax_rate = create(:zip_tax_rate, country: "DE", zip_code: nil, state: nil, combined_rate: 0.19, is_seller_responsible: false)
        product = create(:product, user: @seller, price_cents: 1000, tax_inclusive: false)

        calculator = SalesTaxCalculator.new(
          product: product,
          price_cents: 1000,
          buyer_location: { country: "DE" }
        )

        result = calculator.calculate

        # For 19% tax rate on 1000: tax = 1000 * 0.19 = 190
        expect(result.tax_cents).to eq(190)
        expect(result.price_cents).to eq(1000)
      end

      it "calculates tax correctly for tax-inclusive pricing with 25% rate" do
        tax_rate = create(:zip_tax_rate, country: "SE", zip_code: nil, state: nil, combined_rate: 0.25, is_seller_responsible: false)
        product = create(:product, user: @seller, price_cents: 1250, tax_inclusive: true)

        calculator = SalesTaxCalculator.new(
          product: product,
          price_cents: 1250,
          buyer_location: { country: "SE" }
        )

        result = calculator.calculate

        # For 25% tax rate: tax = 1250 * (0.25 / 1.25) = 250
        expect(result.tax_cents).to eq(250)
        expect(result.price_cents).to eq(1250)
      end
    end

  end
end