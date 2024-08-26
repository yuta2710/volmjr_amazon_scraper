# Amazon Product Scraping

Foobar is a Python library for dealing with word pluralization.

## Overview
This project, in collaboration with the Volmjr Network, is designed to efficiently scrape product data from Amazon. The aim is to extract detailed information about products, including pricing, reviews, ratings, and seller details. This data can then be used for various analytical purposes, including market research, sentiment analysis, and competitive analysis.


## Features 
- Product Data Extraction: Scrapes key product information, such as title, price, availability, ratings, and reviews.
- Review Analysis: Collects and structures review data, including sentiments, ratings, and helpful counts.
- Data Storage: Utilizes PostgreSQL's JSONB data type to store complex product and review data structures.
- Automated CAPTCHA Handling: Implements techniques to automatically handle CAPTCHA challenges during the scraping process by combining NodeJS's executable command and Python's file .
- TypeScript Integration: Ensures type safety and code quality by using TypeScript for defining data models and interacting with the database.

## Limitations
### Comments Restriction 
Recently, Amazon has imposed a restriction that prevents users from accessing more than the first 10 pages of product reviews. It means that the default sorting allows you to access only 100 reviews.

## Database Schema
The database schema is designed to efficiently store and manage scraped data. Key tables include:
- Base Product: Stores the common product data, including pricing, categories, and sentiment analysis.
- Comment Item: Stores customer reviews, ratings, and associated metadata.
The schema is created using the seeder.sql script, and TypeScript types are auto-generated to ensure type-safe interactions with the database.

## Setup and Installation

### Prerequisites
+ Node.js: Ensure Node.js is installed on your machine.
+ PostgreSQL: A PostgreSQL database is required to store the scraped data.
+ Supabase: We use Supabase for managing the database and generating TypeScript types.
+ Twilio
+ Python Virtual Environment: (.venv)

## Usage 
## Contributing
We welcome contributions to this project! If you find a bug or have a feature request, please open an issue or submit a pull request.

## Collaborators
- Volmjr Network: Providing support and infrastructure for scalable scraping and data analysis.

## License

[MIT](https://choosealicense.com/licenses/mit/)