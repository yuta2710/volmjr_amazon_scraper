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


-- SQL function to recursively fetch categories
CREATE OR REPLACE FUNCTION get_recursive_categories(category_id INT)
RETURNS TABLE(id INT, name TEXT, parent_id INT, lft INT, rgt INT) AS $$
WITH RECURSIVE category_tree AS (
    -- Select the parent category (the one matching the provided category_id)
    SELECT id, name, parent_id, lft, rgt
    FROM category
    WHERE id = $1  -- Starting with the provided category_id

    UNION ALL

    -- Recursively select all child categories
    SELECT c.id, c.name, c.parent_id, c.lft, c.rgt
    FROM category c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree;
$$ LANGUAGE sql;

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
      
      -- Price History Check for CamelPriceComparison (lowestPrice, highestPrice, etc.)
      (price ? 'priceHistory' IS FALSE OR (
          jsonb_typeof(price->'priceHistory') = 'object' AND
          (price->'priceHistory' ? 'lowestPrice' IS FALSE OR (
            jsonb_typeof(price->'priceHistory'->'lowestPrice') = 'object' AND
            jsonb_typeof(price->'priceHistory'->'lowestPrice'->'value') = 'number' AND
            jsonb_typeof(price->'priceHistory'->'lowestPrice'->'latestDate') = 'string'
          )) AND
          (price->'priceHistory' ? 'highestPrice' IS FALSE OR (
            jsonb_typeof(price->'priceHistory'->'highestPrice') = 'object' AND
            jsonb_typeof(price->'priceHistory'->'highestPrice'->'value') = 'number' AND
            jsonb_typeof(price->'priceHistory'->'highestPrice'->'latestDate') = 'string'
          )) AND
          (price->'priceHistory' ? 'currentPrice' IS FALSE OR (
            jsonb_typeof(price->'priceHistory'->'currentPrice') = 'object' AND
            jsonb_typeof(price->'priceHistory'->'currentPrice'->'value') = 'number' AND
            jsonb_typeof(price->'priceHistory'->'currentPrice'->'latestDate') = 'string'
          )) AND
          (price->'priceHistory' ? 'averagePrice' IS FALSE OR (
            jsonb_typeof(price->'priceHistory'->'averagePrice') = 'number'
          ))
      )) AND

      -- Savings check remains the same
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
    average_sentiment_analysis JSONB CHECK (
        average_sentiment_analysis IS NULL OR 
        (
          average_sentiment_analysis ? 'score' AND
          average_sentiment_analysis ? 'emotion' AND
          jsonb_typeof(average_sentiment_analysis->'score') = 'number' AND
          jsonb_typeof(average_sentiment_analysis->'emotion') = 'string'
        )
    ),
    category INTEGER REFERENCES category(id) ON DELETE CASCADE,
    number_of_comments INTEGER,
    average_rating DECIMAL(3, 2),
    is_out_of_stock BOOLEAN,
    brand TEXT,
    retailer TEXT DEFAULT 'Not Show',
    best_seller_ranks JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (
        jsonb_typeof(best_seller_ranks) = 'array' AND
        (
            jsonb_array_length(best_seller_ranks) = 0 OR 
            (
                jsonb_typeof(best_seller_ranks->0) = 'object' AND
                (best_seller_ranks->0 ? 'rank' IS FALSE OR jsonb_typeof(best_seller_ranks->0->'rank') = 'string') AND
                (best_seller_ranks->0 ? 'categoryMarket' IS FALSE OR jsonb_typeof(best_seller_ranks->0->'categoryMarket') = 'string')
            )
        )
    ),
    is_amazon_choice BOOLEAN,
    is_best_seller BOOLEAN,
    delivery_location TEXT,
    sales_volume_last_month TEXT DEFAULT 'Not Show',
    business_target_for_collecting TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  
);

CREATE TABLE product_categories(
  product_id INTEGER REFERENCES base_products(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES category(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)  
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_base_products_updated_at
BEFORE UPDATE ON base_products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Create User table
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id),  -- Auto-incrementing ID
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,  -- Optional first name
    last_name TEXT,  -- Optional last name
    role user_role NOT NULL DEFAULT 'user',  -- User role with a default value of 'user'
    -- workspaces INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,  -- Array of workspaces (string array)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Timestamp for user creation
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- Timestamp for last update
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
    user_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
    -- Helpful count, rating, verified purchase, location, and URL fields
    helpful_count TEXT NOT NULL,
    asin TEXT NOT NULL,
    rating TEXT NOT NULL,
    is_verified_purchase BOOLEAN NOT NULL,
    location TEXT NOT NULL,
    url TEXT NOT NULL,
    
    pagination JSONB CHECK (
        (pagination ? 'totalRecords' IS NOT TRUE OR jsonb_typeof(pagination->'totalRecords') = 'number') AND
        (pagination ? 'currentPage' IS NOT TRUE OR jsonb_typeof(pagination->'currentPage') = 'number') AND
        (pagination ? 'nextPage' IS NOT TRUE OR (
            jsonb_typeof(pagination->'nextPage') = 'object' AND
            (pagination->'nextPage' ? 'url' IS NOT TRUE OR jsonb_typeof(pagination->'nextPage'->'url') = 'string') AND
            (pagination->'nextPage' ? 'metric' IS NOT TRUE OR jsonb_typeof(pagination->'nextPage'->'metric') = 'number')
        )) AND
        (pagination ? 'prevPage' IS NOT TRUE OR (
            jsonb_typeof(pagination->'prevPage') = 'object' AND
            (pagination->'prevPage' ? 'url' IS NOT TRUE OR jsonb_typeof(pagination->'prevPage'->'url') = 'string') AND
            (pagination->'prevPage' ? 'metric' IS NOT TRUE OR jsonb_typeof(pagination->'prevPage'->'metric') = 'number')
        ))
    ),

    -- Sentiment JSONB with constraints
    sentiment JSONB NOT NULL CHECK (
        sentiment ? 'score' AND
        sentiment ? 'emotion' AND
        jsonb_typeof(sentiment->'score') = 'number' AND
        jsonb_typeof(sentiment->'emotion') = 'string'
    )
);


-- -- Trigger to automatically update 'updated_at' column on user update
CREATE OR REPLACE FUNCTION update_users_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at_column();

-- Create a junction table to represent the many-to-many relationship
CREATE TABLE user_products (
    user_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES base_products(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, product_id)
);

CREATE INDEX comments_product_id_idx ON comments(product_id);

ALTER TABLE base_products ADD CONSTRAINT unique_asin UNIQUE (asin);


CREATE TABLE competitors (
    id SERIAL PRIMARY KEY,
    base_product_id INTEGER NOT NULL REFERENCES base_products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    brand TEXT,
    url TEXT,
    average_rating DECIMAL(3, 2) CHECK (average_rating >= 0 AND average_rating <= 5),
    number_of_reviews INTEGER CHECK (number_of_reviews >= 0),
    similarity_score DECIMAL(5, 4) CHECK (similarity_score >= 0 AND similarity_score <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for quick lookup of competitors by base product
CREATE INDEX idx_competitors_base_product_id ON competitors(base_product_id);

-- supabase gen types typescript --project-id pbrravmvyawomfjjzhde > database.types.ts
-- TRUNCATE TABLE base_products, comments, category RESTART IDENTITY;