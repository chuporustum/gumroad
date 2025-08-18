# frozen_string_literal: true

require "spec_helper"

RSpec.describe Link, type: :model do
  describe "#publish! with identity and bank verification" do
    let(:user) { create(:user) }
    let(:product) { create(:product, user: user, purchase_disabled_at: Time.current) }

    context "when user has no identity verification" do
      before do
        allow(user).to receive(:identity_verified?).and_return(false)
        allow(user).to receive(:bank_account_verified?).and_return(true)
      end

      it "raises an error when trying to publish" do
        expect { product.publish! }.to raise_error(Link::LinkInvalid, "You must verify your identity before you can publish products.")
      end

      it "adds an error to the product" do
        expect { product.publish! }.to raise_error(Link::LinkInvalid)
        expect(product.errors[:base]).to include("You must verify your identity before you can publish products.")
      end
    end

    context "when user has no bank account verification" do
      before do
        allow(user).to receive(:identity_verified?).and_return(true)
        allow(user).to receive(:bank_account_verified?).and_return(false)
      end

      it "raises an error when trying to publish" do
        expect { product.publish! }.to raise_error(Link::LinkInvalid, "You must add and verify a bank account or payment method before you can publish products.")
      end

      it "adds an error to the product" do
        expect { product.publish! }.to raise_error(Link::LinkInvalid)
        expect(product.errors[:base]).to include("You must add and verify a bank account or payment method before you can publish products.")
      end
    end

    context "when user has both identity and bank account verification" do
      let!(:compliance_info) { create(:user_compliance_info, user: user) }
      let!(:bank_account) { create(:ach_account, user: user) }

      before do
        allow(user).to receive(:identity_verified?).and_return(true)
        allow(user).to receive(:bank_account_verified?).and_return(true)
        allow(user).to receive(:confirmed?).and_return(true)
        allow(product).to receive(:publishable?).and_return(true)
      end

      it "successfully publishes the product" do
        expect { product.publish! }.not_to raise_error
        expect(product.purchase_disabled_at).to be_nil
        expect(product.draft).to eq(false)
      end
    end

    context "when user has identity verification but uses Stripe Connect instead of bank account" do
      let!(:compliance_info) { create(:user_compliance_info, user: user) }
      let!(:merchant_account) { create(:merchant_account, user: user, charge_processor_id: StripeChargeProcessor.charge_processor_id) }

      before do
        allow(user).to receive(:identity_verified?).and_return(true)
        allow(user).to receive(:has_stripe_account_connected?).and_return(true)
        allow(user).to receive(:bank_account_verified?).and_return(true)
        allow(user).to receive(:confirmed?).and_return(true)
        allow(product).to receive(:publishable?).and_return(true)
      end

      it "successfully publishes the product" do
        expect { product.publish! }.not_to raise_error
        expect(product.purchase_disabled_at).to be_nil
        expect(product.draft).to eq(false)
      end
    end

    context "when user has identity verification but uses PayPal Connect instead of bank account" do
      let!(:compliance_info) { create(:user_compliance_info, user: user) }
      let!(:merchant_account) { create(:merchant_account, user: user, charge_processor_id: PaypalChargeProcessor.charge_processor_id) }

      before do
        allow(user).to receive(:identity_verified?).and_return(true)
        allow(user).to receive(:has_paypal_account_connected?).and_return(true)
        allow(user).to receive(:bank_account_verified?).and_return(true)
        allow(user).to receive(:confirmed?).and_return(true)
        allow(product).to receive(:publishable?).and_return(true)
      end

      it "successfully publishes the product" do
        expect { product.publish! }.not_to raise_error
        expect(product.purchase_disabled_at).to be_nil
        expect(product.draft).to eq(false)
      end
    end
  end

  describe "#publishable?" do
    let(:user) { create(:user) }
    let(:product) { create(:product, user: user) }

    context "when user cannot publish products due to missing verification" do
      before do
        allow(user).to receive(:can_publish_products?).and_return(false)
      end

      it "returns false" do
        expect(product.publishable?).to eq(false)
      end
    end

    context "when user can publish products with verification" do
      before do
        allow(user).to receive(:can_publish_products?).and_return(true)
      end

      it "returns true" do
        expect(product.publishable?).to eq(true)
      end
    end
  end
end