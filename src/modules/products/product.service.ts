// import { supabase } from "../../../cores/db/supabase";
import { NextFunction, Request, Response } from "express";

import { createClient } from "@supabase/supabase-js";
import { Database } from "../../shared/types/database.types";
import { scrapeAmazonProduct } from "../../shared/actions/scraper";
import { AmazonScrapedResponse, CommentItem } from "./product.types";
import CategoryNode, { saveCategoryHierarchy } from "../../shared/category";
import { TablesInsert } from "../../shared/types/database.types";

type BaseProductInsert = TablesInsert<"base_products">;
type BaseCommentInsert = TablesInsert<"comments">;

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

type AmazonScrapingProductRequest = {
  url: string;
};

export default class BaseProductService {
  createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<
    { message: "Created product on supabase successfully" } | Error
  > => {
    // return new Promise();
    const { url } = req.body as AmazonScrapingProductRequest;
    const scrapedDataResponse: AmazonScrapedResponse =
      await scrapeAmazonProduct(url);

    console.log("\n\nResponse");
    console.log(scrapedDataResponse);

    // console.log("\nProcessed comment results");
    // console.log(scrapedDataResponse.comments);

    if (scrapedDataResponse) {
      if (scrapedDataResponse.category) {
        console.error("Concac tao ne");
        const insertedCategoryId: number = await saveCategoryHierarchy(
          scrapedDataResponse.category as CategoryNode,
        );

        console.error("\nProduct ID = ", insertedCategoryId);
        if (scrapedDataResponse.product) {
          scrapedDataResponse.product.category = insertedCategoryId as number;

          const validatedPrice = {
            amount: scrapedDataResponse.product.price.amount ?? 0,
            currency: scrapedDataResponse.product.price.currency ?? "$",
            displayAmount:
              scrapedDataResponse.product.price.displayAmount ?? "",
            currentPrice: scrapedDataResponse.product.price.currentPrice ?? 0,
            originalPrice:
              scrapedDataResponse.product.price.originalPrice > 0
                ? scrapedDataResponse.product.price.originalPrice
                : 0, // Ensure valid value or null
            highestPrice:
              scrapedDataResponse.product.price.highestPrice > 0
                ? scrapedDataResponse.product.price.highestPrice
                : 0, // Ensure valid value or null
            lowestPrice: scrapedDataResponse.product.price.lowestPrice ?? 0,
            savings: {
              amount: scrapedDataResponse.product.price.savings?.amount ?? 0,
              currency:
                scrapedDataResponse.product.price.savings?.currency ?? "",
              displayAmount:
                scrapedDataResponse.product.price.savings?.displayAmount ?? "",
              percentage:
                scrapedDataResponse.product.price.savings?.percentage?.replace(
                  "-",
                  "",
                ) ?? "", // Handle empty strings
            },
          };

          console.error("\nValidated Price");
          console.log(validatedPrice);

          const productData: BaseProductInsert = {
            // Map and validate your scraped data to the expected structure
            title: scrapedDataResponse.product.title,
            url: scrapedDataResponse.product.url,
            image: scrapedDataResponse.product.image,
            price: validatedPrice,
            average_rating: scrapedDataResponse.product.averageRating ?? null,
            average_sentiment_analysis:
              scrapedDataResponse.product.averageSentimentAnalysis,
            best_seller_ranks:
              scrapedDataResponse.product.bestSellerRanks ?? null,
            brand: scrapedDataResponse.product.brand ?? null,
            business_target_for_collecting:
              scrapedDataResponse.product.businessTargetForCollecting ?? null,
            category: scrapedDataResponse.product.category ?? null,
            delivery_location:
              scrapedDataResponse.product.deliveryLocation ?? null,
            histogram: scrapedDataResponse.product.histogram,
            is_out_of_stock: scrapedDataResponse.product.isOutOfStock ?? null,
            number_of_comments:
              scrapedDataResponse.product.numberOfComments ?? null,
            retailer: scrapedDataResponse.product.retailer ?? null,
            sales_volume_last_month:
              scrapedDataResponse.product.salesVolumeLastMonth ?? null,
          };

          console.log("\nBased inserted product data");
          console.log(productData);

          let productId: number;

          // Inserted products 
          try {
            const { data, error } = await supabase
              .from("base_products")
              .insert([productData as BaseProductInsert])
              .select();

            if (error) {
              console.error("Error inserting product:", error.message);
            } else {
              console.info("Product inserted successfully:", data);
              productId = data[0].id;
            }
          } catch (error) {}

          // Inserted bulk comments
          if (scrapedDataResponse.comments.length > 0) {
            const bulkCommentsInserts: BaseCommentInsert[] =
              scrapedDataResponse.comments.map((comment) => ({
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
              }));

            try {
              const { data, error } = await supabase
                .from("comments")
                .insert(bulkCommentsInserts);
              if (error) {
                console.error("Error inserting comments:", error.message);
              } else {
                console.log("\nSuccessfully inserted comments:", data);
              }
            } catch (error) {}
          }
        }
      }
    }
    return null;
  };

  getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      const { data, error } = await supabase
        .from("base_products")
        .select()
        .eq("id", Number(req.params.id));

      console.log("Thien");
      console.log(req.params.id);
      console.log(data);
    } catch (error) {
      console.log(error);
    }
  };
}
