# frozen_string_literal: true

require "spec_helper"

describe CustomerSurchargeController do
  describe "GET #calculate_all with tax-inclusive pricing" do
    before(:each) do
      @seller = create(:user)
    end

    it "returns tax in tax_included_cents for tax-inclusive products" do
      product = create(:product, user: @seller, price_cents: 1190, tax_inclusive: true)
      tax_rate = create(:zip_tax_rate, country: "DE", zip_code: nil, state: nil, combined_rate: 0.19, is_seller_responsible: false)

      post :calculate_all, params: {
        products: [{
          permalink: product.unique_permalink,
          quantity: 1,
          price: "1190"
        }],
        country: "DE",
        postal_code: "10115"
      }, as: :json

      json_response = JSON.parse(response.body)
      
      expect(json_response["tax_cents"]).to eq(0)
      expect(json_response["tax_included_cents"]).to eq(190) # 1190 * (0.19 / 1.19)
      expect(json_response["subtotal"]).to eq(1190)
    end

    it "returns tax in tax_cents for tax-exclusive products" do
      product = create(:product, user: @seller, price_cents: 1000, tax_inclusive: false)
      tax_rate = create(:zip_tax_rate, country: "DE", zip_code: nil, state: nil, combined_rate: 0.19, is_seller_responsible: false)

      post :calculate_all, params: {
        products: [{
          permalink: product.unique_permalink,
          quantity: 1,
          price: "1000"
        }],
        country: "DE",
        postal_code: "10115"
      }, as: :json

      json_response = JSON.parse(response.body)
      
      expect(json_response["tax_cents"]).to eq(190) # 1000 * 0.19
      expect(json_response["tax_included_cents"]).to eq(0)
      expect(json_response["subtotal"]).to eq(1000)
    end

    it "handles mixed tax-inclusive and tax-exclusive products" do
      inclusive_product = create(:product, user: @seller, price_cents: 1190, tax_inclusive: true)
      exclusive_product = create(:product, user: @seller, price_cents: 1000, tax_inclusive: false)
      tax_rate = create(:zip_tax_rate, country: "DE", zip_code: nil, state: nil, combined_rate: 0.19, is_seller_responsible: false)

      post :calculate_all, params: {
        products: [
          {
            permalink: inclusive_product.unique_permalink,
            quantity: 1,
            price: "1190"
          },
          {
            permalink: exclusive_product.unique_permalink,
            quantity: 1,
            price: "1000"
          }
        ],
        country: "DE",
        postal_code: "10115"
      }, as: :json

      json_response = JSON.parse(response.body)
      
      expect(json_response["tax_cents"]).to eq(190) # Only from exclusive product
      expect(json_response["tax_included_cents"]).to eq(190) # Only from inclusive product
      expect(json_response["subtotal"]).to eq(2190) # 1190 + 1000
    end
  end
end