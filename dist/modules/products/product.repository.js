"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
class AmazonBaseProductRepository {
    supabase;
    constructor(supabaseUrl = process.env.SUPABASE_URL, supabaseAnonKey = process.env.SUPABASE_ANON_KEY) {
        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error("Supabase URL and Anon Key must be provided");
        }
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
    }
    async insertProduct(productInsertData) {
        try {
            const { error: fetchError } = await this.supabase
                .from("base_products")
                .select()
                .eq("asin", productInsertData.asin)
                .single();
            if (fetchError && fetchError.code !== 'PGRST116') { // 'PGRST116' is the code for 'No rows found'
                console.error('Error checking for existing product:', fetchError.message);
                return null;
            }
            else {
                const { data, error } = await this.supabase
                    .from("base_products")
                    .upsert([productInsertData], { onConflict: "asin" })
                    .select();
                if (error) {
                    console.error("Error inserting product:", error.message);
                }
                else {
                    console.info("Product inserted successfully:", data);
                    return data[0].id;
                }
            }
        }
        catch (error) {
            console.error('Unexpected error during product insert:', error.message);
            return null;
        }
    }
    async getProductById(productId) {
        const { data, error } = await this.supabase
            .from("base_products")
            .select("*")
            .eq("id", productId)
            .single();
        if (error) {
            throw new Error(`Error fetching product: ${error.message}`);
        }
        return data;
    }
}
exports.default = AmazonBaseProductRepository;
//# sourceMappingURL=product.repository.js.map