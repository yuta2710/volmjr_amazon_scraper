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

    // console.log("\n\nResponse");
    // console.log(scrapedDataResponse);

    // console.log("\nProcessed comment results");
    // console.log(scrapedDataResponse.comments);

    if(scrapedDataResponse){
      if (scrapedDataResponse.category) {
        const insertedCategoryId: number = await saveCategoryHierarchy(
          scrapedDataResponse.category as CategoryNode,
        );
        if (scrapedDataResponse.product) {
          scrapedDataResponse.product.category = insertedCategoryId as number;
  
          const validatedPrice = {
            amount: scrapedDataResponse.product.price.amount ?? 0,
            currency: scrapedDataResponse.product.price.currency ?? "$",
            displayAmount: scrapedDataResponse.product.price.displayAmount ?? "",
            currentPrice: scrapedDataResponse.product.price.currentPrice ?? 0,
            originalPrice: scrapedDataResponse.product.price.originalPrice ?? 0,
            highestPrice: scrapedDataResponse.product.price.highestPrice ?? 0,
            lowestPrice: scrapedDataResponse.product.price.lowestPrice ?? 0,
            savings: {
              amount: scrapedDataResponse.product.price.savings?.amount ?? 0,
              currency: scrapedDataResponse.product.price.savings?.currency ?? "",
              displayAmount:
                scrapedDataResponse.product.price.savings?.displayAmount ?? "",
              percentage:
                scrapedDataResponse.product.price.savings?.percentage.replace(
                  "-",
                  "",
                ) ?? "",
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
  
          console.log("\nBased inserted data")
          console.log(productData);
  
          try {
            const { data, error } = await supabase
              .from("base_products")
              .insert([productData as BaseProductInsert])
              .select();
  
            if (error) {
              console.error("Error inserting product:", error.message);
            } else {
              console.info("Product inserted successfully:", data);
            }
          } catch (error) {}
          

          // if(scrapedDataResponse.comments.length > 0){
          //   const bulkCommentsInsert = 
          //   try {
          //     const { data, error } = await supabase.from("comments").insert([BaseCommentInsert as BaseCommentInsert[]])
          //   } catch (error) {
              
          //   }
          // }
        }
      }
    }

    // console.log("\nProcessed product results");
    // console.log(scrapedDataResponse.product);

    // console.log("\nProcessed category results");
    // scrapedDataResponse.category.displayHierarchyAsJSON();

    // // Step 1: Create category first
    // // Step 2: Put the category to pipeline class
    // // SAVED TO DB: Category
    // console.log("\nSaving category started.......");

    // const insertedCategoryId: number = await saveCategoryHierarchy(
    //   scrapedDataResponse.category as CategoryNode,
    // );
    // // Step 2: Assign the category id after inserted to the product
    // scrapedDataResponse.product.category = insertedCategoryId as number;
    // Step 3: Create product

    // const validatedPrice = {
    //   amount: scrapedDataResponse.product.price.amount ?? 0,
    //   currency: scrapedDataResponse.product.price.currency ?? "$",
    //   displayAmount: scrapedDataResponse.product.price.displayAmount ?? "",
    //   currentPrice: scrapedDataResponse.product.price.currentPrice ?? 0,
    //   originalPrice: scrapedDataResponse.product.price.originalPrice ?? 0,
    //   highestPrice: scrapedDataResponse.product.price.highestPrice ?? 0,
    //   lowestPrice: scrapedDataResponse.product.price.lowestPrice ?? 0,
    //   savings: {
    //     amount: scrapedDataResponse.product.price.savings?.amount ?? 0,
    //     currency: scrapedDataResponse.product.price.savings?.currency ?? "",
    //     displayAmount: scrapedDataResponse.product.price.savings?.displayAmount ?? "",
    //     percentage: scrapedDataResponse.product.price.savings?.percentage ?? "",
    //   },
    // };

    // console.error("\nValidated Price");
    // console.log(validatedPrice);

    // const productData: BaseProductInsert = {
    //   // Map and validate your scraped data to the expected structure
    //   title: scrapedDataResponse.product.title,
    //   url: scrapedDataResponse.product.url,
    //   image: scrapedDataResponse.product.image,
    //   price: scrapedDataResponse.product.price,
    //   average_rating: scrapedDataResponse.product.averageRating ?? null,
    //   average_sentiment_analysis:
    //     scrapedDataResponse.product.averageSentimentAnalysis,
    //   best_seller_ranks: scrapedDataResponse.product.bestSellerRanks ?? null,
    //   brand: scrapedDataResponse.product.brand ?? null,
    //   business_target_for_collecting:
    //     scrapedDataResponse.product.businessTargetForCollecting ?? null,
    //   category: scrapedDataResponse.product.category ?? null,
    //   delivery_location: scrapedDataResponse.product.deliveryLocation ?? null,
    //   histogram: scrapedDataResponse.product.histogram,
    //   is_out_of_stock: scrapedDataResponse.product.isOutOfStock ?? null,
    //   number_of_comments: scrapedDataResponse.product.numberOfComments ?? null,
    //   retailer: scrapedDataResponse.product.retailer ?? null,
    //   sales_volume_last_month:
    //     scrapedDataResponse.product.salesVolumeLastMonth ?? null,
    // };

    // const { data, error } = await supabase
    //   .from("base_products")
    //   .insert([productData as BaseProductInsert])
    //   .select();

    // if (error) {
    //   console.error("Error inserting product:", error.message);
    // } else {
    //   console.log("Product inserted successfully:", data);
    // }

    // console.log("Data of product after inserted");
    // console.log(data)
    // Step 4: Assign product Id to each comment by using map
    // const filtratedComments = scrapedDataResponse.comments.map((product) => ({
    //   ...product,
    //   productId: data[0].id as number,
    // }));

    // console.log("\nProccessed comments")
    // console.log(filtratedComments)

    // Step 5: Insert comments
    // const { data: insertComment, error: errorComment } = await supabase
    //   .from("comments")
    //   .insert([insertComment as CommentItem])
    //   .select();
    return null;
  };

  getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      const { data, error } = await supabase
        .from("products")
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
