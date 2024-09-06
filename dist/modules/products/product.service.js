"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const scraper_1 = require("../../shared/actions/scraper");
const product_repository_1 = __importDefault(require("./product.repository"));
const category_repository_1 = __importDefault(require("../category/category.repository"));
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
class BaseProductService {
    categoryRepository = new category_repository_1.default(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_ANON_KEY));
    productRepository = new product_repository_1.default(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_ANON_KEY));
    createProduct = async (req, res, next) => {
        // return new Promise();
        const { url } = req.body;
        const scrapedDataResponse = await (0, scraper_1.scrapeAmazonProduct)(url);
        const categoryRepository = new category_repository_1.default(String(process.env.NEXT_PUBLIC_SUPABASE_URL), String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
        const productRepository = new product_repository_1.default(String(process.env.NEXT_PUBLIC_SUPABASE_URL), String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
        let newProductId;
        let insertedCategoryId = null;
        if (scrapedDataResponse) {
            if (scrapedDataResponse.category) {
                console.log("\n\nScraped category");
                console.log(scrapedDataResponse.category);
                try {
                    insertedCategoryId = await categoryRepository.saveCategoryHierarchy(scrapedDataResponse.category);
                }
                catch (error) {
                    console.log(error);
                }
                console.error("Category ID = ", insertedCategoryId);
                /**
                 * TODO: Check condition exist of product
                 */
            }
            if (scrapedDataResponse.product) {
                // Check existence of product
                const scrapedProductFromBrowser = scrapedDataResponse.product;
                if (insertedCategoryId) {
                    scrapedProductFromBrowser.category = insertedCategoryId;
                }
                // console.log(validatedPrice);
                const productInsertData = {
                    // Map and validate your scraped data to the expected structure
                    asin: scrapedProductFromBrowser.asin,
                    title: scrapedProductFromBrowser.title,
                    url: scrapedProductFromBrowser.url,
                    image: scrapedProductFromBrowser.image,
                    price: {
                        amount: scrapedProductFromBrowser.price.amount ?? 0,
                        currency: scrapedProductFromBrowser.price.currency ?? "$",
                        averagePrice: scrapedProductFromBrowser.price.averagePrice,
                        displayAmount: scrapedProductFromBrowser.price.displayAmount ?? "",
                        currentPrice: scrapedProductFromBrowser.price.currentPrice ?? 0,
                        originalPrice: scrapedProductFromBrowser.price.originalPrice > 0
                            ? scrapedProductFromBrowser.price.originalPrice
                            : 0, // Ensure valid value or null
                        highestPrice: scrapedProductFromBrowser.price.highestPrice > 0
                            ? scrapedProductFromBrowser.price.highestPrice
                            : 0, // Ensure valid value or null,
                        lowestPrice: scrapedProductFromBrowser.price.lowestPrice ?? 0,
                        savings: {
                            amount: scrapedProductFromBrowser.price.savings?.amount ?? 0,
                            currency: scrapedProductFromBrowser.price.savings?.currency ?? "",
                            displayAmount: scrapedProductFromBrowser.price.savings?.displayAmount ?? "",
                            percentage: scrapedProductFromBrowser.price.savings?.percentage?.replace("-", "") ?? "", // Handle empty strings
                        },
                    },
                    average_rating: scrapedProductFromBrowser.averageRating ?? null,
                    average_sentiment_analysis: scrapedProductFromBrowser.averageSentimentAnalysis,
                    best_seller_ranks: scrapedProductFromBrowser.bestSellerRanks ?? null,
                    is_amazon_choice: scrapedProductFromBrowser.isAmazonChoice,
                    is_best_seller: scrapedProductFromBrowser.isBestSeller,
                    brand: scrapedProductFromBrowser.brand ?? null,
                    business_target_for_collecting: scrapedProductFromBrowser.businessTargetForCollecting ?? null,
                    category: scrapedProductFromBrowser.category,
                    delivery_location: scrapedProductFromBrowser.deliveryLocation ?? null,
                    histogram: scrapedProductFromBrowser.histogram,
                    is_out_of_stock: scrapedProductFromBrowser.isOutOfStock ?? null,
                    number_of_comments: scrapedProductFromBrowser.numberOfComments ?? null,
                    retailer: scrapedProductFromBrowser.retailer ?? null,
                    sales_volume_last_month: scrapedProductFromBrowser.salesVolumeLastMonth ?? null,
                    created_at: scrapedProductFromBrowser.createdAt.toISOString(),
                    updated_at: scrapedProductFromBrowser.updatedAt.toISOString(),
                };
                // Inserted a product
                newProductId = await productRepository.insertProduct(productInsertData);
                // Inserted the bulk of comments
                /**
                 * TODO: Check condition exist of comments
                 */
            }
            if (scrapedDataResponse.comments.length > 0) {
                const scrapedCommentsFromBrowser = scrapedDataResponse.comments;
                // Check bulk comment exists from database
                const { data: existingBulkCommentsFromDatabase, error: fetchError } = await supabase
                    .from("comments")
                    .select("id, title, content, date")
                    .eq("product_id", newProductId);
                if (fetchError) {
                    console.error("Error fetching existing comments:", fetchError.message);
                }
                else {
                    console.log("There is an existing list of comments:", existingBulkCommentsFromDatabase.length);
                }
                const existingGroupCommentsFromDatabaseAsSet = new Set(existingBulkCommentsFromDatabase.map((comment) => `${comment.title}-${comment.content}-${new Date(comment.date).toISOString()}`));
                const filteredNewInsertedCommentsFromSet = scrapedCommentsFromBrowser.filter((comment) => {
                    const commentKey = `${comment.title}-${comment.content}-${new Date(comment.date).toISOString()}`;
                    return !existingGroupCommentsFromDatabaseAsSet.has(commentKey);
                });
                // Then: set id to the filtered list of comments that need to insert
                const bulkCommentsForInsert = filteredNewInsertedCommentsFromSet.map((comment) => ({
                    title: comment.title,
                    content: comment.content,
                    date: comment.date,
                    product_id: newProductId, // Adjust according to your schema
                    helpful_count: comment.helpfulCount,
                    rating: comment.rating,
                    verified_purchase: comment.isVerifiedPurchase,
                    location: comment.location,
                    url: comment.url,
                    sentiment: comment.sentiment, // Assuming sentiment is correctly formatted as JSON
                    pagination: comment.pagination,
                }));
                try {
                    const { data, error } = await supabase
                        .from("comments")
                        .insert(bulkCommentsForInsert);
                    if (error) {
                        console.error("Error inserting comments:", error.message);
                    }
                    else {
                        console.log("\nSuccessfully inserted bulk of comments:", data);
                    }
                }
                catch (error) { }
            }
        }
        if (scrapedDataResponse != null) {
            console.log("Product nay ko null");
            // console.log(scrapedDataResponse.product);
            // console.log(scrapedDataResponse.category);
            // console.log(scrapedDataResponse);
        }
        else {
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
    getProductById = async (req, res, next) => {
        try {
            await supabase.auth.signInWithOAuth({
                provider: "google",
            });
        }
        catch (error) {
            console.log(error);
        }
    };
}
exports.default = BaseProductService;
//# sourceMappingURL=product.service.js.map