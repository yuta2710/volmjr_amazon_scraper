-- Drop tables in the correct order to avoid dependency issues
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS base_products CASCADE;
DROP TABLE IF EXISTS category CASCADE;

-- Optionally, drop the function if you want to remove it as well
DROP FUNCTION IF EXISTS validate_percentage CASCADE;


-- psql -h aws-0-ap-southeast-1.pooler.supabase.com -U postgres.pbrravmvyawomfjjzhde -d postgres -a -f dropper.sql
