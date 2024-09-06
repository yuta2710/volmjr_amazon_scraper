"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Import necessary modules and types
const supabase_js_1 = require("@supabase/supabase-js");
// Initialize Supabase client
const supabaseUrl = "https://your-supabase-url.supabase.co"; // Replace with your actual Supabase URL
const supabaseKey = "your-supabase-key"; // Replace with your actual Supabase key
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
// Define the insertProduct function
async function insertProduct(product) {
    const { data, error } = await supabase.from("products").insert([product]);
    // The reason for using [product] instead of just product in the insert function is because the Supabase insert method expects an array of objects as its argument. This allows you to insert multiple records at once in a single operation.
    // Explanation:
    // Supabase API Design: The Supabase insert method is designed to handle batch inserts, meaning you can insert multiple rows into a table in one call. Therefore, the method expects an array of objects, where each object represents a row to be inserted.
    // Single Insert: Even when you're inserting just a single record, you still need to wrap it in an array (i.e., [product]). This ensures that the input conforms to the expected structure.
    if (error) {
        console.error("Error inserting product:", error.message);
    }
    else {
        console.log("Product inserted successfully:", data);
    }
}
// Example usage of insertProduct
// const newProduct: TablesInsert<"base_products"> = {
//   asin: "B08T5Q8K36",
//   title: "Sample Product Title",
//   current_price: 29.99,
//   availability: "In Stock",
//   category: "",
//   retailer: "Sample Retailer",
//   // Add any other fields as necessary, or leave them out if they are nullable
// };
// insertProduct(newProduct);
//# sourceMappingURL=product.example.js.map