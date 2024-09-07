import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../shared/types/database.types";
import {
  BaseCategoryInsert,
  BaseCommentInsert,
  CommentItem,
} from "../../shared/types";
import { CategoryNode } from "./category.model";
import supabase from "../../shared/supabase";

export default class AmazonCategoryRepository {
  private categoryRepository: SupabaseClient<Database>;

  constructor(
    supabaseUrl: string = process.env.SUPABASE_URL,
    supabaseAnonKey: string = process.env.SUPABASE_ANON_KEY,
  ) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL and Anon Key must be provided");
    }

    this.categoryRepository = createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
    );
  }

  async checkAndInsertCategory(
    catNode: CategoryNode,
    parentId: number | null = null,
  ): Promise<number> {
    try {
      // console.error("Name of cat node = ", catNode.name)
      // console.error("Name of cat node trim = ", catNode.name.trim())
      const { data: existData, error } = await this.categoryRepository
      .from("category")
      .select("id")
      .eq("name", catNode.name)
      .single();
      
      console.error("\n\n Exist data of category");
      console.log(existData);
      console.log(catNode, parentId);

      if (error || !existData) {
        const { data: insertData, error: insertError } =
          await supabase
            .from("category")
            .insert({
              name: catNode.name,
              lft: catNode.lft,
              rgt: catNode.rgt,
              parent_id: parentId,
            })
            .select();
        
        console.log("Inserted data category")
        console.log(insertData)

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

  async insertBulkCommentsToDb(items: CommentItem[], productId: number) {
    const { data: existingBulkCommentsFromDatabase, error: fetchError } =
      await supabase
        .from("comments")
        .select("id, title, content, date")
        .eq("product_id", productId);

    if (fetchError) {
      console.error("Error fetching existing comments:", fetchError.message);
    } else {
      console.log(
        "There is an existing list of comments:",
        existingBulkCommentsFromDatabase.length,
      );
    }

    const existingGroupCommentsFromDatabaseAsSet = new Set(
      existingBulkCommentsFromDatabase.map(
        (comment) =>
          `${comment.title}-${comment.content}-${new Date(
            comment.date,
          ).toISOString()}`,
      ),
    );

    const filteredNewInsertedCommentsFromSet: CommentItem[] = items.filter(
      (comment) => {
        const commentKey = `${comment.title}-${comment.content}-${new Date(
          comment.date,
        ).toISOString()}`;
        return !existingGroupCommentsFromDatabaseAsSet.has(commentKey);
      },
    );

    // Then: set id to the filtered list of comments that need to insert
    const bulkCommentsForInsert: BaseCommentInsert[] =
      filteredNewInsertedCommentsFromSet.map((comment) => ({
        title: comment.title,
        content: comment.content,
        date: comment.date,
        product_id: productId, // Adjust according to your schema
        helpful_count: comment.helpfulCount,
        rating: comment.rating,
        verified_purchase: comment.isVerifiedPurchase,
        location: comment.location,
        url: comment.url,
        sentiment: comment.sentiment, // Assuming sentiment is correctly formatted as JSON
        pagination: comment.pagination,
      }));

    try {
      const { error } = await supabase
        .from("comments")
        .insert(bulkCommentsForInsert);
      if (error) {
        console.error("Error inserting comments:", error.message);
      } else {
        console.log(`\nSuccessfully inserted bulk of comments`);
      }
    } catch (error) {}
  }
}
