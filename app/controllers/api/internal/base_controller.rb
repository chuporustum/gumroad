# frozen_string_literal: true

class Api::Internal::BaseController < ApplicationController
  skip_before_action :verify_authenticity_token
end
