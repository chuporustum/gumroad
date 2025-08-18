# frozen_string_literal: true

require "spec_helper"

RSpec.describe User::FeatureStatus do
  describe "#identity_verified?" do
    let(:user) { create(:user) }

    context "when user has no compliance info" do
      it "returns false" do
        expect(user.identity_verified?).to eq(false)
      end
    end

    context "when user has incomplete compliance info" do
      let!(:compliance_info) do
        create(:user_compliance_info, 
               user: user,
               first_name: "John",
               last_name: "Doe",
               individual_tax_id: nil) # Missing tax ID
      end

      before do
        allow(compliance_info).to receive(:has_completed_compliance_info?).and_return(false)
        allow(user).to receive(:alive_user_compliance_info).and_return(compliance_info)
      end

      it "returns false" do
        expect(user.identity_verified?).to eq(false)
      end
    end

    context "when user has complete compliance info" do
      let!(:compliance_info) { create(:user_compliance_info, user: user) }

      before do
        allow(compliance_info).to receive(:has_completed_compliance_info?).and_return(true)
        allow(user).to receive(:alive_user_compliance_info).and_return(compliance_info)
      end

      it "returns true" do
        expect(user.identity_verified?).to eq(true)
      end
    end
  end

  describe "#bank_account_verified?" do
    let(:user) { create(:user) }

    context "when user has no bank account or payment method" do
      it "returns false" do
        expect(user.bank_account_verified?).to eq(false)
      end
    end

    context "when user has an active bank account" do
      let!(:bank_account) { create(:ach_account, user: user) }

      it "returns true" do
        expect(user.bank_account_verified?).to eq(true)
      end
    end

    context "when user has Stripe account connected" do
      before do
        allow(user).to receive(:has_stripe_account_connected?).and_return(true)
      end

      it "returns true" do
        expect(user.bank_account_verified?).to eq(true)
      end
    end

    context "when user has PayPal account connected" do
      before do
        allow(user).to receive(:has_paypal_account_connected?).and_return(true)
      end

      it "returns true" do
        expect(user.bank_account_verified?).to eq(true)
      end
    end

    context "when user has multiple payment methods" do
      let!(:bank_account) { create(:ach_account, user: user) }

      before do
        allow(user).to receive(:has_stripe_account_connected?).and_return(true)
        allow(user).to receive(:has_paypal_account_connected?).and_return(true)
      end

      it "returns true" do
        expect(user.bank_account_verified?).to eq(true)
      end
    end
  end

  describe "#can_publish_products?" do
    let(:user) { create(:user) }

    context "when user has no identity verification" do
      before do
        allow(user).to receive(:identity_verified?).and_return(false)
        allow(user).to receive(:bank_account_verified?).and_return(true)
      end

      it "returns false" do
        expect(user.can_publish_products?).to eq(false)
      end
    end

    context "when user has no bank account verification" do
      before do
        allow(user).to receive(:identity_verified?).and_return(true)
        allow(user).to receive(:bank_account_verified?).and_return(false)
      end

      it "returns false" do
        expect(user.can_publish_products?).to eq(false)
      end
    end

    context "when user has both verifications but no merchant account when required" do
      before do
        allow(user).to receive(:identity_verified?).and_return(true)
        allow(user).to receive(:bank_account_verified?).and_return(true)
        allow(user).to receive(:check_merchant_account_is_linked).and_return(true)
        allow(user.merchant_accounts).to receive_message_chain(:alive, :charge_processor_alive, :exists?).and_return(false)
      end

      it "returns false" do
        expect(user.can_publish_products?).to eq(false)
      end
    end

    context "when user has all required verifications and merchant account" do
      let!(:compliance_info) { create(:user_compliance_info, user: user) }
      let!(:bank_account) { create(:ach_account, user: user) }
      let!(:merchant_account) { create(:merchant_account, user: user) }

      before do
        allow(user).to receive(:identity_verified?).and_return(true)
        allow(user).to receive(:bank_account_verified?).and_return(true)
        allow(user).to receive(:check_merchant_account_is_linked).and_return(true)
        allow(user.merchant_accounts).to receive_message_chain(:alive, :charge_processor_alive, :exists?).and_return(true)
      end

      it "returns true" do
        expect(user.can_publish_products?).to eq(true)
      end
    end

    context "when merchant account linking is not required" do
      before do
        allow(user).to receive(:identity_verified?).and_return(true)
        allow(user).to receive(:bank_account_verified?).and_return(true)
        allow(user).to receive(:check_merchant_account_is_linked).and_return(false)
      end

      it "returns true" do
        expect(user.can_publish_products?).to eq(true)
      end
    end
  end
end