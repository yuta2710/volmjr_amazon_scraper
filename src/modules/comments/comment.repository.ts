import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {supabase} from "../../shared/supabase";
import { BaseCommentInsert, BaseQueryResponse, CommentItem } from "../../shared/types";
import { Database } from "@/shared/types/database.types";
import { jsonCamelCase } from "@/shared/actions/to";

export default class CommentRepository {
  private commentRepository: SupabaseClient<Database>;

  constructor(
    supabaseUrl: string = process.env.SUPABASE_URL,
    supabaseAnonKey: string = process.env.SUPABASE_ANON_KEY,
  ) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL and Anon Key must be provided");
    }

    this.commentRepository = createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
    );
  }

  async getAllCommentsByProductId(productId: number) {
    const { data: existingBulkCommentsFromDatabase, error: fetchError } = await this.commentRepository.from("comments").select("*").eq("product_id", productId)
    if (fetchError) {
      console.error("Error fetching existing comments:", fetchError.message);
    } else {
      console.log(
        "There is an existing list of comments:",
        existingBulkCommentsFromDatabase.length,
      );
    }

    return { data: existingBulkCommentsFromDatabase, error: fetchError } as BaseQueryResponse
  }

  async insertBatch(items: CommentItem[], productId: number) {
    const { data: existingBulkCommentsFromDatabase, error: fetchError } =
      await this.commentRepository
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
        asin: comment.asin,
        helpful_count: comment.helpfulCount,
        rating: comment.rating,
        is_verified_purchase: comment.isVerifiedPurchase,
        location: comment.location,
        url: comment.url,
        sentiment: comment.sentiment, // Assuming sentiment is correctly formatted as JSON
        pagination: comment.pagination,
      }));

    try {
      const { error } = await this.commentRepository
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