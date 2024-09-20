import colors from "colors";
// import { supabase } from "../../../cores/db/supabase";
import { NextFunction, Request, Response } from "express";
import { scrapeAmazonProduct } from "../../shared/actions/scraper";
import {
  AmazonScrapedResponse,
  BaseProduct,
  BaseProductDto,
  CommentItem,
  ProductCategoriesInsert,
  UserProductInsert,
} from "../../shared/types";
import { CategoryNode } from "../category/category.model";
import { TablesInsert } from "../../shared/types/database.types";
import AmazonBaseProductRepository from "./product.repository";
import AmazonCategoryRepository from "../category/category.repository";
import CommentRepository from "../comments/comment.repository";
import { CONJUNCTION_TABLE, supabase } from "../../shared/supabase";
import { AppError } from "../../cores/errors";
import { isValidIdParams } from "../../shared/actions/checker";
import { jsonCamelCase } from "../../shared/actions/to";
import { renderSuccessComponent } from "../../cores/success";
import { AmazonBotScraper } from "../../shared/actions/scraper.v2";
import { Platforms } from "../../shared/constants";

type BaseProductInsert = TablesInsert<"base_products">;

// const supabase = createClient<Database>(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_ANON_KEY,
// );

type AmazonScrapingProductRequest = {
  url: string;
  keyword?: string;
};

export default class BaseProductService {
  private categoryRepository: AmazonCategoryRepository =
    new AmazonCategoryRepository(
      String(process.env.SUPABASE_URL),
      String(process.env.PUBLIC_SUPABASE_ANON_KEY),
    );
  private productRepository = new AmazonBaseProductRepository(
    String(process.env.SUPABASE_URL),
    String(process.env.SUPABASE_ANON_KEY),
  );

  private commentRepository = new CommentRepository(
    String(process.env.SUPABASE_URL),
    String(process.env.SUPABASE_ANON_KEY),
  );

  private userProdTable = CONJUNCTION_TABLE("user_products");
  private prodCategoriesTable = CONJUNCTION_TABLE("product_categories");

  createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { url, keyword } = req.body as AmazonScrapingProductRequest;
    // const scrapedDataResponse: AmazonScrapedResponse | null =
    // await scrapeAmazonProduct(url as string);
    const bot = new AmazonBotScraper(url, keyword, Platforms.AMAZON);
    const scrapedDataResponse: AmazonScrapedResponse | null = await bot.scraperData();
    // const scrapedDataResponse: any = await bot.scrapeRelatedBestSellerRanks(`/Fresh-Prepared-Sandwiches-Wraps/b/ref=dp_bc_aui_C_3?ie=UTF8&node=10771131011`);

    let newProductId: number;
    let insertedCategoryId: number | null = null;

    if (scrapedDataResponse) {
      if (scrapedDataResponse.category) {
        try {
          insertedCategoryId =
            await this.categoryRepository.saveCategoryHierarchy(
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

        // Inserted a product --> get new product ID
        newProductId = await this.productRepository.insertProduct(
          productInsertData as BaseProductInsert,
        );

        // Inserted the bulk of comments --> get the new comments
        /**
         * TODO: Check condition exist of comments
         */
      }
      if (scrapedDataResponse.comments.length > 0) {
        const scrapedCommentsFromBrowser =
          scrapedDataResponse.comments as CommentItem[];

        await this.commentRepository.insertBatch(
          scrapedCommentsFromBrowser,
          newProductId,
        );
      }
    }

    // insertedCategoryId, newProductId,
    const sampleUP: UserProductInsert = {
      user_id: req.user.id,
      product_id: newProductId,
    };

    const samplePC: ProductCategoriesInsert = {
      product_id: newProductId,
      category_id: insertedCategoryId,
    };

    const { error: upConjunctorError } =
      await this.userProdTable.insert(sampleUP);

    const { error: pcConjunctorError } =
      await this.prodCategoriesTable.insert(samplePC);

    // if (upConjunctorError) {
    //   console.error(
    //     colors.red("Conjunction error response: "),
    //     upConjunctorError,
    //   );
    //   return next(AppError.badRequest("Unable to insert UP conjunction table"));
    // }

    // if (pcConjunctorError) {
    //   console.error(
    //     colors.red("Conjunction error response: "),
    //     pcConjunctorError,
    //   );
    //   return next(AppError.badRequest("Unable to insert PC conjunction table"));
    // }

    renderSuccessComponent(res, scrapedDataResponse);

  };

  getProductByUserAndProductId = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const userIdParams = req.params.userId;
    const productIdParams = req.params.productId;
    let fetchProductData = await this.productRepository.getProductById(
      Number(productIdParams),
    );
    fetchProductData = jsonCamelCase(fetchProductData);

    const childrenCat: any =
      await this.categoryRepository.getChildrenOfCurrentCategory(
        fetchProductData.category as number,
      );

    let resultDto: BaseProductDto = {
      id: fetchProductData.id,
      asin: fetchProductData.asin,
      url: fetchProductData.url,
      image: fetchProductData.image,
      title: fetchProductData.title,
      price: fetchProductData.price,
      numberOfComments: fetchProductData.numberOfComments,
      averageRating: fetchProductData.averageRating,
      isOutOfStock: fetchProductData.isOutOfStock,
      brand: fetchProductData.brand,
      retailer: fetchProductData.retailer,
      bestSellerRanks: fetchProductData.bestSellerRanks,
      isAmazonChoice: fetchProductData.isAmazonChoice,
      isBestSeller: fetchProductData.isBestSeller,
      histogram: fetchProductData.histogram,
      deliveryLocation: fetchProductData.deliveryLocation,
      salesVolumeLastMonth: fetchProductData.salesVolumeLastMonth,
      averageSentimentAnalysis: fetchProductData.averageSentimentAnalysis,
      businessTargetForCollecting: fetchProductData.businessTargetForCollecting,
      createdAt: fetchProductData.createdAt,
      updatedAt: fetchProductData.updatedAt,
    };

    resultDto = {
      ...resultDto,
      category: childrenCat,
      userId: Number(userIdParams),
    };

    renderSuccessComponent(res, resultDto);
  };

  getAllProductsByUserId = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const userIdParam = req.params.userId;
    const checkedIdParam = isValidIdParams(userIdParam as string, req, next);
    const queryResults = await this.productRepository.getAllProductsByUserId(
      checkedIdParam as number,
    );

    queryResults.data
      ? renderSuccessComponent(res, queryResults.data)
      : next(AppError.badRequest("Bad request for query products"));
  };
}

// if (scrapedDataResponse != null) {
//   console.log("Response is not null");
// } else {
//   console.error("Product be null");
// }
