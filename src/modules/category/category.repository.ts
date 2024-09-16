import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../shared/types/database.types";
import { CategoryNode } from "./category.model";
import { supabase } from "../../shared/supabase";
import { CategoryProps } from "@/shared/types";

export default class AmazonCategoryRepository {
  private categoryRepository: SupabaseClient<Database>;

  constructor(
    supabaseUrl: string = process.env.SUPABASE_URL,
    supabaseAnonKey: string = process.env.SUPABASE_ANON_KEY,
  ) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL and Anon Key must be provided");
    }

    this.categoryRepository = supabase;
  }

  async checkAndInsertCategory(
    catNode: CategoryNode,
    parentId: number | null = null,
  ): Promise<number> {
    try {
      const { data: existData, error } = await this.categoryRepository
        .from("category")
        .select("id")
        .eq("name", catNode.name)
        .single();

      if (error || !existData) {
        const { data: insertData, error: insertError } =
          await this.categoryRepository
            .from("category")
            .insert({
              name: catNode.name,
              lft: catNode.lft,
              rgt: catNode.rgt,
              parent_id: parentId,
            })
            .select();

        if (insertError) throw insertError;

        return insertData[0].id;
      }

      return existData.id;
    } catch (error) {
      console.error("Error in checkAndInsertCategory:", error.message);
      throw error;
    }
  }

  async saveCategoryHierarchy(
    node: CategoryNode,
    parentId: number | null = null,
  ): Promise<number> {
    const categoryId = await this.checkAndInsertCategory(node, parentId);

    // Recursively save all child nodes
    if (node.children) {
      for (const child of node.children) {
        await this.saveCategoryHierarchy(child, categoryId);
      }

      return categoryId;
    }
  }

  async getChildrenOfCurrentCategory(
    currentId: number,
  ) {
    const { data, error } = await this.categoryRepository.rpc(
      "get_recursive_categories",
      {category_id: currentId}
    );

    return !error && data;
  }
}
