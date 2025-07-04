# frozen_string_literal: true

# Test data for Email Segments feature
# Run with: rails runner db/seeds/test_data_for_segments.rb

puts "Creating test data for Email Segments feature..."

# Find or create a test seller
seller = User.find_by(email: "seller@gumroad.com") || User.create!(
  name: "Test Seller",
  email: "seller@gumroad.com",
  username: "testseller",
  password: "password123",
  role: "owner",
  confirmed_at: Time.current
)

puts "✓ Created test seller: #{seller.email}"

# Create some test products (or use existing ones)
products = seller.links.limit(3)
if products.empty?
  puts "No existing products found. Creating test products..."
  3.times do |i|
    # Let the model generate its own unique permalink
    product = seller.links.build(
      name: "Test Product #{i + 1}",
      price_cents: (i + 1) * 1000, # $10, $20, $30
      description: "Test product #{i + 1} for segment testing",
      filetype: "digital",
      filegroup: "digital"
    )
    product.save!
    products = [product] + products.to_a
    puts "✓ Created product: #{product.name} ($#{product.price_cents / 100})"
  end
else
  products = products.to_a
  puts "✓ Using existing products: #{products.map(&:name).join(', ')}"
end

# Create test customers with purchases
customers = []
20.times do |i|
  customer_email = "customer#{i + 1}@example.com"
  
  # Create purchase for random product
  product = products.sample
  purchase = Purchase.create!(
    email: customer_email,
    seller: seller,
    link: product,
    price_cents: product.price_cents,
    state: "successful",
    created_at: rand(90.days).seconds.ago,
    country: ["United States", "Canada", "United Kingdom", "Germany", "France"].sample
  )
  
  # Create audience member
  audience_member = AudienceMember.create!(
    email: customer_email,
    seller: seller,
    audience_type: "customer",
    created_at: purchase.created_at
  )
  
  customers << { purchase: purchase, audience_member: audience_member }
  puts "✓ Created customer: #{customer_email} (bought #{product.name})"
end

# Create test followers
10.times do |i|
  follower_email = "follower#{i + 1}@example.com"
  
  follower = Follower.create!(
    email: follower_email,
    seller: seller,
    created_at: rand(60.days).seconds.ago
  )
  
  audience_member = AudienceMember.create!(
    email: follower_email,
    seller: seller,
    audience_type: "subscriber",
    created_at: follower.created_at
  )
  
  puts "✓ Created follower: #{follower_email}"
end

# Create test segments
segments_data = [
  {
    name: "High Value Customers",
    description: "Customers who spent more than $25",
    filters: [
      {
        filter_type: "payment",
        config: {
          operator: "greater_than",
          min_amount_cents: 2500
        }
      }
    ]
  },
  {
    name: "Recent Customers",
    description: "Customers who bought in the last 30 days",
    filters: [
      {
        filter_type: "date",
        config: {
          operator: "in_last_days",
          days: 30
        }
      }
    ]
  },
  {
    name: "US Customers",
    description: "Customers from the United States",
    filters: [
      {
        filter_type: "location",
        config: {
          operator: "is",
          country: "United States"
        }
      }
    ]
  },
  {
    name: "Product 1 Buyers",
    description: "Customers who bought Test Product 1",
    filters: [
      {
        filter_type: "product",
        config: {
          operator: "purchased",
          product_ids: [products.first.unique_permalink]
        }
      }
    ]
  }
]

segments_data.each do |segment_data|
  segment = seller.segments.create!(
    name: segment_data[:name],
    description: segment_data[:description],
    audience_type: "customer"
  )
  
  # Create filter group
  filter_group = segment.audience_member_filter_groups.create!(
    user: seller,
    name: "Default Group"
  )
  
  # Create filters
  segment_data[:filters].each do |filter_data|
    filter_group.audience_member_filters.create!(
      user: seller,
      filter_type: filter_data[:filter_type],
      config: filter_data[:config]
    )
  end
  
  puts "✓ Created segment: #{segment.name} (#{segment.audience_count} members)"
end

# Create a test email engagement segment (if email tracking data exists)
if seller.installments.any?
  engagement_segment = seller.segments.create!(
    name: "Engaged Subscribers",
    description: "Subscribers who opened emails in last 30 days",
    audience_type: "subscriber"
  )
  
  filter_group = engagement_segment.audience_member_filter_groups.create!(
    user: seller,
    name: "Engagement Group"
  )
  
  filter_group.audience_member_filters.create!(
    user: seller,
    filter_type: "email_engagement",
    config: {
      operator: "opened_in_last_days",
      days: 30
    }
  )
  
  puts "✓ Created engagement segment: #{engagement_segment.name}"
end

puts "\n🎉 Test data creation complete!"
puts "\nSummary:"
puts "- Seller: #{seller.email}"
puts "- Products: #{products.count}"
puts "- Customers: #{customers.count}"
puts "- Followers: #{AudienceMember.where(seller: seller, audience_type: "subscriber").count}"
puts "- Segments: #{seller.segments.count}"
puts "\nYou can now test the email segments feature at:"
puts "- Segments: https://gumroad.dev/emails/segments"
puts "- New Email: https://gumroad.dev/emails/new"
puts "\nLogin with: seller@gumroad.com / password123" 
