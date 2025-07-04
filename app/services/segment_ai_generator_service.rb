# frozen_string_literal: true

class SegmentAiGeneratorService
  OPENAI_REQUEST_TIMEOUT_IN_SECONDS = 10
  SYSTEM_PROMPT = <<~PROMPT
    You are a JSON generator for email marketing segments. 
    You MUST return ONLY valid JSON, no explanations or markdown.
    
    Available filter types:
    - payment: Filter by payment amounts
    - date: Filter by dates  
    - product: Filter by products purchased
    - location: Filter by geographic location
    - email_engagement: Filter by email engagement
    
    Payment operators: \"is_more_than\", \"is_less_than\", \"is_between\"
    Date operators: \"is_after\", \"is_before\", \"between\"
    Product operators: \"has_bought\", \"has_not_bought\"
    Location operators: \"is\", \"is_not\"
    Email operators: \"in_last\", \"not_in_last\"
    
    EXACT JSON FORMAT REQUIRED:
    {
      \"filter_groups\": [
        {
          \"name\": \"High Value Customers\",
          \"filters\": [
            {
              \"filter_type\": \"payment\",
              \"config\": {
                \"operator\": \"is_more_than\",
                \"amount_cents\": 10000
              }
            },
            {
              \"filter_type\": \"product\",
              \"config\": {
                \"operator\": \"has_bought\",
                \"product_ids\": [\"12345\"]
              }
            }
          ]
        }
      ]
    }
    
    For product filters, ALWAYS use \"product_ids\" as an array of strings.
    For payment filters with \"is_between\", use \"min_amount_cents\" and \"max_amount_cents\".
    For location filters, use \"country\" field.
    For email engagement filters, use \"days\" field.
    Convert dollars to cents (multiply by 100).
    Return ONLY the JSON above, nothing else.
  PROMPT

  attr_reader :user, :description

  def initialize(user:, description:)
    @user = user
    @description = description
  end

  def generate
    return { error: "Description is required" } if description.blank?

    with_retries do
      response = OpenAI::Client.new(request_timeout: OPENAI_REQUEST_TIMEOUT_IN_SECONDS).chat(
        parameters: {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: "Create segments for: #{description}" }
          ],
          temperature: 0.2,  # Lower temperature for more consistent results
          max_tokens: 500   # More tokens for complex filter combinations
        }
      )

      content = response.dig("choices", 0, "message", "content")

      # Strip markdown code blocks if present
      cleaned_content = content.to_s.strip
      if cleaned_content.start_with?("```json") || cleaned_content.start_with?("```")
        cleaned_content = cleaned_content.gsub(/^```(?:json)?\s*/, '').gsub(/\s*```$/, '')
      end

      begin
        parsed_response = JSON.parse(cleaned_content)

        # Enhanced validation of the response structure
        if validate_ai_response(parsed_response)
          {
            success: true,
            filter_groups: sanitize_filter_groups(parsed_response["filter_groups"]),
            suggested_name: generate_segment_name(description)
          }
        else
          Rails.logger.error("AI response validation failed: #{parsed_response}")
          { error: "AI generated invalid filter structure" }
        end
      rescue JSON::ParserError => e
        Rails.logger.error("Failed to parse AI response: #{e.message}. Content: #{content}")
        { error: "AI response was not valid JSON" }
      end
    end
  rescue => e
    Rails.logger.error("AI segment generation failed: #{e.message}")
    { error: "AI generation temporarily unavailable" }
  end

  private

  def validate_ai_response(response)
    return false unless response.is_a?(Hash)
    return false unless response["filter_groups"].is_a?(Array)
    return false if response["filter_groups"].empty?

    response["filter_groups"].all? do |group|
      group.is_a?(Hash) &&
      group["name"].is_a?(String) &&
      group["filters"].is_a?(Array) &&
      group["filters"].all? { |filter| valid_filter?(filter) }
    end
  end

  def valid_filter?(filter)
    return false unless filter.is_a?(Hash)
    return false unless filter["filter_type"].is_a?(String)
    return false unless %w[date payment location product email_engagement].include?(filter["filter_type"])
    return false unless filter["config"].is_a?(Hash)

    # Type-specific validation
    case filter["filter_type"]
    when "date"
      valid_date_filter?(filter["config"])
    when "payment"
      valid_payment_filter?(filter["config"])
    when "location"
      valid_location_filter?(filter["config"])
    when "product"
      valid_product_filter?(filter["config"])
    when "email_engagement"
      valid_email_engagement_filter?(filter["config"])
    else
      false
    end
  end

  def valid_date_filter?(config)
    valid_operators = %w[is_after is_before between]
    return false unless valid_operators.include?(config["operator"])

    case config["operator"]
    when "between"
      config["start_date"].present? && config["end_date"].present?
    else
      config["date"].present?
    end
  end

  def valid_payment_filter?(config)
    valid_operators = %w[is_more_than is_less_than is_between]
    return false unless valid_operators.include?(config["operator"])

    case config["operator"]
    when "is_between"
      config["min_amount_cents"].is_a?(Integer) && config["max_amount_cents"].is_a?(Integer)
    else
      config["amount_cents"].is_a?(Integer)
    end
  end

  def valid_location_filter?(config)
    %w[is is_not].include?(config["operator"]) && config["country"].present?
  end

  def valid_product_filter?(config)
    %w[has_bought has_not_bought].include?(config["operator"]) &&
    config["product_ids"].is_a?(Array) &&
    config["product_ids"].all? { |id| id.is_a?(String) }
  end

  def valid_email_engagement_filter?(config)
    valid_operators = %w[in_last not_in_last]
    return false unless valid_operators.include?(config["operator"])

    config["days"].is_a?(Integer) && config["days"] > 0
  end

  def sanitize_filter_groups(groups)
    groups.map do |group|
      {
        "name" => group["name"].to_s.strip,
        "filters" => group["filters"].map { |filter| sanitize_filter(filter) }
      }
    end
  end

  def sanitize_filter(filter)
    {
      "filter_type" => filter["filter_type"],
      "config" => filter["config"]
    }
  end

  def generate_segment_name(description)
    # Use AI to generate strategic, marketing-focused names
    response = OpenAI::Client.new(request_timeout: OPENAI_REQUEST_TIMEOUT_IN_SECONDS).chat(
      parameters: {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a marketing strategist. Create concise, actionable segment names (2-4 words) that clearly communicate the audience's value and purpose. Focus on business outcomes and marketing intent. Examples: 'VIP Customers', 'Growth Prospects', 'Win-Back Targets', 'Premium Buyers', 'Engagement Ready'."
          },
          {
            role: "user",
            content: "Create a segment name for: #{description}"
          }
        ],
        temperature: 0.3,
        max_tokens: 20
      }
    )

    ai_name = response.dig("choices", 0, "message", "content")&.strip&.gsub(/['""]/, '')

    # Strip markdown code blocks if present
    if ai_name && (ai_name.start_with?("```") || ai_name.include?("```"))
      ai_name = ai_name.gsub(/^```(?:json)?\s*/, '').gsub(/\s*```$/, '').strip
    end

    # Fallback to pattern-based generation if AI fails
    ai_name.presence || generate_fallback_name(description)
  rescue => e
    Rails.logger.error("AI name generation failed: #{e.message}")
    generate_fallback_name(description)
  end

  def generate_fallback_name(description)
    words = description.downcase.split(/\s+/)

    # Strategic pattern matching for business-focused names
    case
    when words.any? { |w| w.match?(/vip|premium|high.*value|expensive|luxury/) }
      "VIP Customers"
    when words.any? { |w| w.match?(/new|recent|fresh|latest/) } && words.any? { |w| w.match?(/subscriber|follow/) }
      "New Subscribers"
    when words.any? { |w| w.match?(/win.*back|return|inactive|dormant/) }
      "Win-Back Targets"
    when words.any? { |w| w.match?(/international|global|foreign|overseas/) }
      "Global Audience"
    when words.any? { |w| w.match?(/potential|prospect|haven.*bought|not.*purchase/) }
      "Growth Prospects"
    when words.any? { |w| w.match?(/loyal|long.*term|repeat/) }
      "Loyal Customers"
    when words.any? { |w| w.match?(/engage|active|frequent/) }
      "Engaged Users"
    when words.any? { |w| w.match?(/budget|low.*spend|cheap/) }
      "Budget Segment"
    when words.any? { |w| w.match?(/affiliate|partner/) }
      "Partner Network"
    when words.any? { |w| w.match?(/digital|online|course/) }
      "Digital Buyers"
    else
      # Extract key business terms and capitalize
      key_terms = description.split(/\s+/)
                             .map(&:downcase)
                             .select { |w| w.length > 3 && !w.match?(/the|and|for|with|from|that|this/) }
                             .first(2)
                             .map(&:capitalize)

      key_terms.any? ? key_terms.join(" ") + " Segment" : "Custom Segment"
    end
  end

  def with_retries(max_tries: 3, delay: 1)
    tries = 0
    begin
      tries += 1
      yield
    rescue => e
      if tries < max_tries
        Rails.logger.info("AI generation attempt #{tries}/#{max_tries} failed: #{e.message}")
        sleep(delay)
        retry
      else
        Rails.logger.error("AI generation failed after #{max_tries} attempts: #{e.message}")
        raise
      end
    end
  end
end
