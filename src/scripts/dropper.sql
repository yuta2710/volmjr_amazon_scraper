-- Drop junction table for the many-to-many relationship between users and products
DROP TABLE IF EXISTS user_products CASCADE;

-- Drop user profiles table
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop enum type for user roles
DROP TYPE IF EXISTS user_role CASCADE;

-- Drop comments table
DROP TABLE IF EXISTS comments CASCADE;

-- Drop base products table
DROP TABLE IF EXISTS base_products CASCADE;

-- Drop category table
DROP TABLE IF EXISTS category CASCADE;

-- Drop any other related indices (if necessary)
DROP INDEX IF EXISTS comments_product_id_idx;

-- Drop the update trigger for base products
DROP TRIGGER IF EXISTS update_base_products_updated_at ON base_products;

-- Drop the update trigger for user profiles
DROP TRIGGER IF EXISTS update_users_updated_at ON user_profiles;

-- Drop function for updating the 'updated_at' column
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Drop function for updating user 'updated_at' column
DROP FUNCTION IF EXISTS update_users_updated_at_column CASCADE;

-- Drop function for recursive category fetching
DROP FUNCTION IF EXISTS get_recursive_categories CASCADE;

-- Drop the function to validate percentages
DROP FUNCTION IF EXISTS validate_percentage CASCADE;


-- psql -h aws-0-ap-southeast-1.pooler.supabase.com -U postgres.pbrravmvyawomfjjzhde -d postgres -a -f dropper.sql
