-- psql -h aws-0-ap-southeast-1.pooler.supabase.com -U postgres.pbrravmvyawomfjjzhde -d postgres -a -f seeder.sql

CREATE OR REPLACE FUNCTION validate_percentage(percentage TEXT) RETURNS BOOLEAN AS $$
BEGIN
    RETURN percentage ~ '^\d{1,3}%$' AND
           CAST(replace(percentage, '%', '') AS INTEGER) BETWEEN 0 AND 100;
END;
$$ LANGUAGE plpgsql;

-- Create the category table 
CREATE TABLE category (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  lft INTEGER NOT NULL,
  rgt INTEGER NOT NULL,
  parent_id INTEGER REFERENCES category(id) ON DELETE SET NULL,
  UNIQUE (name, lft, rgt)
);


-- Create the base_product table with constraints on JSONB fields
CREATE TABLE base_products (
    id SERIAL PRIMARY KEY,
    asin TEXT NOT NULL,
    url TEXT NOT NULL,
    image TEXT,
    title TEXT NOT NULL,

    -- Price JSONB with constraints
    price JSONB NOT NULL CHECK (
      (price ? 'amount' IS FALSE OR jsonb_typeof(price->'amount') = 'number') AND
      (price ? 'currency' IS FALSE OR jsonb_typeof(price->'currency') = 'string') AND
      (price ? 'displayAmount' IS FALSE OR jsonb_typeof(price->'displayAmount') = 'string') AND
      (price ? 'currentPrice' IS FALSE OR jsonb_typeof(price->'currentPrice') = 'number') AND
      (price ? 'originalPrice' IS FALSE OR jsonb_typeof(price->'originalPrice') = 'number') AND
      (price ? 'highestPrice' IS FALSE OR jsonb_typeof(price->'highestPrice') = 'number') AND
      (price ? 'lowestPrice' IS FALSE OR jsonb_typeof(price->'lowestPrice') = 'number') AND
      (price ? 'savings' IS FALSE OR (
          jsonb_typeof(price->'savings') = 'object' AND
          (price->'savings' ? 'amount' IS FALSE OR jsonb_typeof(price->'savings'->'amount') = 'number') AND
          (price->'savings' ? 'currency' IS FALSE OR jsonb_typeof(price->'savings'->'currency') = 'string') AND
          (price->'savings' ? 'displayAmount' IS FALSE OR jsonb_typeof(price->'savings'->'displayAmount') = 'string') AND
          (price->'savings' ? 'percentage' IS FALSE OR 
              (jsonb_typeof(price->'savings'->'percentage') = 'string' AND 
              (price->'savings'->>'percentage' = '' OR validate_percentage(price->'savings'->>'percentage')))
          )
      ))
    ),

    -- Histogram JSONB with constraints
    histogram JSONB NOT NULL CHECK (
        histogram ? '5 star' AND 
        histogram ? '4 star' AND 
        histogram ? '3 star' AND 
        histogram ? '2 star' AND 
        histogram ? '1 star' AND
        jsonb_typeof(histogram->'5 star') = 'string' AND
        jsonb_typeof(histogram->'4 star') = 'string' AND
        jsonb_typeof(histogram->'3 star') = 'string' AND
        jsonb_typeof(histogram->'2 star') = 'string' AND
        jsonb_typeof(histogram->'1 star') = 'string' AND
        validate_percentage(histogram->>'5 star') AND
        validate_percentage(histogram->>'4 star') AND
        validate_percentage(histogram->>'3 star') AND
        validate_percentage(histogram->>'2 star') AND
        validate_percentage(histogram->>'1 star')
    ),

    -- Average Sentiment Analysis JSONB with constraints
    average_sentiment_analysis JSONB NOT NULL CHECK (
        average_sentiment_analysis ? 'score' AND
        average_sentiment_analysis ? 'emotion' AND
        jsonb_typeof(average_sentiment_analysis->'score') = 'number' AND
        jsonb_typeof(average_sentiment_analysis->'emotion') = 'string'
    ),
    category INTEGER REFERENCES category(id) ON DELETE CASCADE,
    number_of_comments INTEGER,
    average_rating DECIMAL(3, 2),
    is_out_of_stock BOOLEAN,
    brand TEXT,
    retailer TEXT DEFAULT 'Not Show',
    best_seller_ranks TEXT[], -- Storing array of best seller ranks
    delivery_location TEXT,
    sales_volume_last_month TEXT DEFAULT 'Not Show',
    business_target_for_collecting TEXT
);


-- Create the comment_item table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    
    -- Basic fields
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    
    -- Product JSONB with constraints
    product_id INTEGER REFERENCES base_products(id) ON DELETE CASCADE,
    
    -- Helpful count, rating, verified purchase, location, and URL fields
    helpful_count TEXT NOT NULL,
    rating TEXT NOT NULL,
    verified_purchase BOOLEAN NOT NULL,
    location TEXT NOT NULL,
    url TEXT NOT NULL,
    -- next_page TEXT NOT NULL,

    -- Sentiment JSONB with constraints
    sentiment JSONB NOT NULL CHECK (
        sentiment ? 'score' AND
        sentiment ? 'emotion' AND
        jsonb_typeof(sentiment->'score') = 'number' AND
        jsonb_typeof(sentiment->'emotion') = 'string'
    )
);

CREATE INDEX comments_product_id_idx ON comments(product_id);

-- supabase gen types typescript --project-id pbrravmvyawomfjjzhde > database.types.ts
-- TRUNCATE TABLE base_products, comments, category RESTART IDENTITY;