import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../shared/types/database.types";
import { BaseProductInsert } from "../../shared/types";

export default class AmazonBaseProductRepository {
  private supabase: SupabaseClient<Database>;

  constructor(supabaseUrl: string = process.env.SUPABASE_URL, supabaseAnonKey: string = process.env.SUPABASE_ANON_KEY) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key must be provided');
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  async insertProduct(productInsertData: BaseProductInsert) {
    try {
      const { data, error } = await this.supabase
        .from("base_products")
        .insert([productInsertData as BaseProductInsert])
        .select();

      if (error) {
        console.error("Error inserting product:", error.message);
      } else {
        console.info("Product inserted successfully:", data);
        return data[0].id;
      }
    } catch (error) {}
  }

  async getProductById(productId: number) {
    const { data, error } = await this.supabase
      .from('base_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) {
      throw new Error(`Error fetching product: ${error.message}`);
    }

    return data;
  }
} 