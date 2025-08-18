# frozen_string_literal: true

require "spec_helper"

RSpec.describe Link, type: :model do
  describe "#publish! with verification requirements" do
    let(:user) { create(:user) }
    let(:product) { create(:product, user: user, purchase_disabled_at: Time.current) }

    it "blocks publishing without identity verification" do
      allow(user).to receive(:identity_verified?).and_return(false)
      allow(user).to receive(:bank_account_verified?).and_return(true)

      expect { product.publish! }.to raise_error(Link::LinkInvalid, /verify your identity/)
    end

    it "blocks publishing without payment method" do
      allow(user).to receive(:identity_verified?).and_return(true)
      allow(user).to receive(:bank_account_verified?).and_return(false)

      expect { product.publish! }.to raise_error(Link::LinkInvalid, /bank account or payment method/)
    end

    it "allows publishing with both verifications" do
      allow(user).to receive(:identity_verified?).and_return(true)
      allow(user).to receive(:bank_account_verified?).and_return(true)
      allow(user).to receive(:confirmed?).and_return(true)
      allow(product).to receive(:publishable?).and_return(true)

      expect { product.publish! }.not_to raise_error
      expect(product.purchase_disabled_at).to be_nil
    end
  end
end