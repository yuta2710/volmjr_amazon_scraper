import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../shared/types/database.types";
import { BaseProductInsert } from "../../shared/types";
import { BaseProduct } from "../../shared/types";

export default class AmazonBaseProductRepository {
  private supabase: SupabaseClient<Database>;

  constructor(
    supabaseUrl: string = process.env.SUPABASE_URL,
    supabaseAnonKey: string = process.env.SUPABASE_ANON_KEY,
  ) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL and Anon Key must be provided");
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  async insertProduct(productInsertData: BaseProductInsert) {
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
      else{
        const { data, error } = await this.supabase
        .from("base_products")
        .upsert([productInsertData as BaseProductInsert], {onConflict: "asin"})
        .select();

      if (error) {
        console.error("Error inserting product:", error.message);
      } else {
        // console.info("Product inserted successfully:", data);
        return data[0].id;
      }
      }
    } catch (error) {
      console.error('Unexpected error during product insert:', error.message);
      return null;
    }
  }

  async getProductById(productId: number) {
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
