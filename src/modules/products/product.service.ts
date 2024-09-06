import colors from "colors";
// import { supabase } from "../../../cores/db/supabase";
import { NextFunction, Request, Response } from "express";

import { createClient } from "@supabase/supabase-js";
import { Database } from "../../shared/types/database.types";
import { scrapeAmazonProduct } from "../../shared/actions/scraper";
import {
  AmazonScrapedResponse,
  BaseProduct,
  CommentItem,
} from "../../shared/types";
import {CategoryNode} from "../category/category.model";
import { TablesInsert } from "../../shared/types/database.types";
import AmazonBaseProductRepository from "./product.repository";
import AmazonCategoryRepository from "../category/category.repository";
import CommentRepository from "../comments/comment.repository";

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
  private categoryRepository: AmazonCategoryRepository =
    new AmazonCategoryRepository(
      String(process.env.SUPABASE_URL),
      String(process.env.SUPABASE_ANON_KEY),
    );
  private productRepository = new AmazonBaseProductRepository(
    String(process.env.SUPABASE_URL),
    String(process.env.SUPABASE_ANON_KEY),
  );

  private commentRepository = new CommentRepository(
    String(process.env.SUPABASE_URL),
    String(process.env.SUPABASE_ANON_KEY)
  )

  createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // return new Promise();
    const { url } = req.body as AmazonScrapingProductRequest;
    const scrapedDataResponse: AmazonScrapedResponse | null =
      await scrapeAmazonProduct(url as string);

    let newProductId: number;
    let insertedCategoryId: number | null = null;

    if (scrapedDataResponse) {
      if (scrapedDataResponse.category) {
        try {
          insertedCategoryId = await this.categoryRepository.saveCategoryHierarchy(
            scrapedDataResponse.category as CategoryNode,
          );
        } catch (error) {
          console.log(error);
        }

        console.error("Category ID = ", insertedCategoryId);

        /**
         * TODO: Check condition exist of product
         */
      }
      if (scrapedDataResponse.product) {
        // Check existence of product
        const scrapedProductFromBrowser =
          scrapedDataResponse.product as BaseProduct;

        if (insertedCategoryId) {
          scrapedProductFromBrowser.category = insertedCategoryId as number;
        }
        
        const productInsertData: BaseProductInsert = {
          // Map and validate your scraped data to the expected structure
          asin: scrapedProductFromBrowser.asin,
          title: scrapedProductFromBrowser.title,
          url: scrapedProductFromBrowser.url,
          image: scrapedProductFromBrowser.image,
          price: {
            amount: scrapedProductFromBrowser.price.amount ?? 0,
            currency: scrapedProductFromBrowser.price.currency ?? "$",
            displayAmount: scrapedProductFromBrowser.price.displayAmount ?? "",
            originalPrice:
              scrapedProductFromBrowser.price.originalPrice > 0
                ? scrapedProductFromBrowser.price.originalPrice
                : 0, // Ensure valid value or null
            priceHistory: scrapedProductFromBrowser.price.priceHistory,
            savings: {
              amount: scrapedProductFromBrowser.price.savings?.amount ?? 0,
              currency: scrapedProductFromBrowser.price.savings?.currency ?? "",
              displayAmount:
                scrapedProductFromBrowser.price.savings?.displayAmount ?? "",
              percentage:
                scrapedProductFromBrowser.price.savings?.percentage?.replace(
                  "-",
                  "",
                ) ?? "", // Handle empty strings
            },
          },
          average_rating: scrapedProductFromBrowser.averageRating ?? null,
          average_sentiment_analysis:
            scrapedProductFromBrowser.averageSentimentAnalysis,
          best_seller_ranks: scrapedProductFromBrowser.bestSellerRanks ?? null,
          is_amazon_choice: scrapedProductFromBrowser.isAmazonChoice,
          is_best_seller: scrapedProductFromBrowser.isBestSeller,
          brand: scrapedProductFromBrowser.brand ?? null,
          business_target_for_collecting:
            scrapedProductFromBrowser.businessTargetForCollecting ?? null,
          category: scrapedProductFromBrowser.category,
          delivery_location: scrapedProductFromBrowser.deliveryLocation ?? null,
          histogram: scrapedProductFromBrowser.histogram,
          is_out_of_stock: scrapedProductFromBrowser.isOutOfStock ?? null,
          number_of_comments:
            scrapedProductFromBrowser.numberOfComments ?? null,
          retailer: scrapedProductFromBrowser.retailer ?? null,
          sales_volume_last_month:
            scrapedProductFromBrowser.salesVolumeLastMonth ?? null,
          created_at: scrapedProductFromBrowser.createdAt.toISOString(),
          updated_at: scrapedProductFromBrowser.updatedAt.toISOString(),
        };

        // Inserted a product
        newProductId = await this.productRepository.insertProduct(
          productInsertData as BaseProductInsert,
        );

        // Inserted the bulk of comments
        /**
         * TODO: Check condition exist of comments
         */
      }
      if (scrapedDataResponse.comments.length > 0) {
        const scrapedCommentsFromBrowser =
          scrapedDataResponse.comments as CommentItem[];
          
        // Check bulk comment exists from database
        await this.commentRepository.insertBulkCommentsToDb(scrapedCommentsFromBrowser, newProductId);
      }
    }

    if (scrapedDataResponse != null) {
      console.log("Product nay ko null");
    } else {
      console.log("Product nay null");
    }
    
    res.status(200).json({
      success: true,
      message: "Scraped data successfully",
      counting: {
        product: scrapedDataResponse.product.asin,
        numberOfComments: scrapedDataResponse.comments.length,
        category: scrapedDataResponse.category.name
      },
    });
  };

  // getAllProducts = (): Promise<BaseProduct[]> {

  // }

  getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
      });
    } catch (error) {
      console.log(error);
    }
  };
}
