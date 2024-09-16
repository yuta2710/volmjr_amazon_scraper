import {
  createClient,
  PostgrestError,
  SupabaseClient,
} from "@supabase/supabase-js";
import { Database } from "../../shared/types/database.types";
import { BaseProductInsert } from "../../shared/types";
import { BaseProduct } from "../../shared/types";
import { GET_PRODUCTS_BY_USER_ID_QUERY } from "../../shared/actions/queries/product.query";

export default class AmazonBaseProductRepository {
  private db: SupabaseClient<Database>;

  constructor(
    supabaseUrl: string = process.env.SUPABASE_URL,
    supabaseAnonKey: string = process.env.SUPABASE_ANON_KEY,
  ) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL and Anon Key must be provided");
    }

    this.db = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  async insertProduct(productInsertData: BaseProductInsert) {
    try {
      const { error: fetchError } = await this.db
        .from("base_products")
        .select()
        .eq("asin", productInsertData.asin)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // 'PGRST116' is the code for 'No rows found'
        console.error(
          "Error checking for existing product:",
          fetchError.message,
        );
        return null;
      } else {
        const { data, error } = await this.db
          .from("base_products")
          .upsert([productInsertData as BaseProductInsert], {
            onConflict: "asin",
          })
          .select();
        
          
        if (error) {
          console.error("Error inserting product:", error.message);
        } else {
          // console.info("Product inserted successfully:", data);
          return data[0].id;
        }
      }
    } catch (error) {
      console.error("Unexpected error during product insert:", error.message);
      return null;
    }
  }

  async getAllProductsByUserId(userId: number) {
    console.log("User id in this function: ", userId)
    const { data: queryProducts, error } = await this.db
      .from("base_products")
      .select(
        `
      *,
      user_products!inner(user_id)
    `,
      )
      .eq("user_products.user_id", userId); // Ensure userId is passed correctly

    if (error) {
      console.error("Error fetching products:", error);
      return {data: null, error}; 
    }

    console.log("Le xuan loc");
    console.log(JSON.stringify(queryProducts));
    
    const proccessedProducts = queryProducts.map((product) => {
      const { user_products, ...rest } = product;
      return {
        ...rest,
        userId: product.user_products[0].user_id
      }

    })

    return { data: proccessedProducts, error };
  }

  async getProductById(productId: number) {
    const { data, error } = await this.db
      .from("base_products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      throw new Error(`Error fetching product: ${error.message}`);
    }

    return data as BaseProduct;
  }
}
