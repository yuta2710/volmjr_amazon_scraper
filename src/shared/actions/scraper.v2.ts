import {
  FIFTY_PERCENTAGE_OF_EXPECTED_RELEVANT,
  HEADLESS_STATE_MANAGEMENT,
  MAXIMUM_TIMEOUT_FOR_SCRAPING,
  Platforms,
} from "../../shared/constants";
import puppeteer, { Browser, ElementHandle, Page } from "puppeteer";
import { NormalCaptchaSolver, SignInSolver } from "./captcha";
import {
  AmazonScrapedResponse,
  BaseProduct,
  BestSellerRank,
  CamelPriceComparison,
  CommentItem,
  CompetitorResponse,
} from "../types";
import { CategoryNode } from "@/modules/category/category.model";
import {
  filterAsinFromUrl,
  filterBestSellerRanks,
  filterCategoryAsListByHtml,
  filterComponentsOfPrice,
  filterLocationAndDateOfCommentItem,
  filterNewlineSeparatedText,
  FilterProductAttributesFromUrl,
  filterQueryType,
  filterStarRatings,
  isValidPriceFormat,
} from "./filter";
import colors from "colors";
import { retrieveProductPriceHistoryGroup } from "./camel+browser";
import {
  analyzeEmotionByScore,
  analyzeSentiment,
  findBestMatchingProductInSingleAttribute,
} from "./analyze";
import path from "path";
import util from "util";
import { exec } from "child_process";
import _ from "lodash";
import { jsonCamelCase } from "./to";
import { viewCompetitorProductAnalysis } from "../log";

// Bot Scraper Raw Design
export abstract class BotScraper {
  protected platform: Platforms;

  constructor(platform: Platforms) {
    this.platform = platform;
  }

  // Abstract method declaration: No implementation, subclasses must implement this
  public abstract activateBot(): Promise<Browser>;
  public abstract scraperData(): Promise<any>;
  public abstract getCurrentPlatform(): Platforms;
}

export class WalmartBotScraper extends BotScraper {
  public activateBot(): Promise<Browser> {
    throw new Error("Method not implemented.");
  }
  public scraperData(): Promise<any> {
    throw new Error("Method not implemented.");
  }
  public getCurrentPlatform(): Platforms {
    throw new Error("Method not implemented.");
  }
}

// Amazon Bot Scraper Design
export class AmazonBotScraper extends BotScraper {
  private page: Page;
  private isRetrieveCompetitors: boolean;
  private url: string;
  private keyword?: string;
  private topCompetitorAnalysisLimit?: number;
  private normalCaptchSolver: NormalCaptchaSolver;
  private signInSolver: SignInSolver;

  constructor(
    url: string,
    isRetrieveCompetitors: boolean,
    keyword: string,
    topCompetitorAnalysisLimit: number,
    platform: Platforms,
  ) {
    super(platform);
    this.url = url;
    this.isRetrieveCompetitors = isRetrieveCompetitors;
    this.keyword = isRetrieveCompetitors ? keyword : "";
    this.topCompetitorAnalysisLimit = isRetrieveCompetitors
      ? topCompetitorAnalysisLimit
      : 0;
    this.normalCaptchSolver = new NormalCaptchaSolver();
    this.signInSolver = new SignInSolver();
  }

  public getCurrentPlatform(): Platforms {
    return this.platform;
  }

  async activateBot(): Promise<Browser> {
    const browser: Browser = await puppeteer.launch(
      HEADLESS_STATE_MANAGEMENT.PRODUCTION_MODE,
    );

    this.page = await browser.newPage();
    await this.page.goto(this.url, { waitUntil: "load" });

    return browser;
  }

  async scraperData(): Promise<AmazonScrapedResponse> {
    if (!this.url) return;

    const browser: Browser = await this.activateBot();

    await this.normalCaptchSolver.execute(this.page);

    // Attempt sign-in with retries
    let signInAttempts = 3;
    let signedIn = false;

    while (signInAttempts > 0 && !signedIn) {
      try {
        await this.signInSolver.execute(this.page as Page);
        signedIn = true;
      } catch (error) {
        console.error(
          `Sign-in attempt failed: ${error.message}. Retries left: ${
            signInAttempts - 1
          }`,
        );
        signInAttempts--;
        if (signInAttempts === 0) {
          throw new Error("Failed to sign in after multiple attempts.");
        }
      }
    }

    /**
     * TODO: ============================================================= Process/Build the category hirarchy =============================================================
     */
    let categoryContainerSelectorList: ElementHandle<HTMLLIElement>[] = null;
    let categoryHierarchy: CategoryNode = null;
    let flattenedCategoryHierarchy = null;

    try {
      categoryContainerSelectorList = await this.page.$$(
        "#wayfinding-breadcrumbs_feature_div ul > li",
      );

      // Ensure we have elements in the list
      if (
        categoryContainerSelectorList &&
        categoryContainerSelectorList.length > 0
      ) {
        categoryHierarchy = await filterCategoryAsListByHtml(
          categoryContainerSelectorList as ElementHandle<HTMLLIElement>[],
        );
        flattenedCategoryHierarchy = JSON.parse(
          JSON.stringify(categoryHierarchy),
        );
      } else {
        console.log(colors.yellow("No categories found in the selector list."));
      }
    } catch (error) {
      console.error("Category not found on browser:", error);
    }

    // categoryHierarchy.displayHierarchyAsJSON();
    const scrapedProduct: BaseProduct =
      await this.scrapeProductDataExceptForeignField(this.page);

    const priceHistoryGroup: CamelPriceComparison =
      await retrieveProductPriceHistoryGroup(scrapedProduct.asin);

    if (priceHistoryGroup) {
      scrapedProduct.price.priceHistory =
        priceHistoryGroup as CamelPriceComparison;
    }

    let competitorsData: CompetitorResponse[] = [];
    let actualCategoryUrl: string = "";

    // Scraping retrieve competitors steps
    if (this.isRetrieveCompetitors) {
      try {
        await this.page.waitForSelector("#wayfinding-breadcrumbs_feature_div", {
          timeout: MAXIMUM_TIMEOUT_FOR_SCRAPING,
        });
        actualCategoryUrl = await this.page.$eval(
          "#wayfinding-breadcrumbs_feature_div ul li:last-child span a",
          (el) => el.getAttribute("href"),
        );
      } catch (error) {
        console.error("Actual url of UI 1 not found");
      }

      console.log(colors.bgYellow("Starting scrape related competitors"));

      competitorsData = await this.scrapeRelatedBestSellerRanks(
        this.keyword as string,
        actualCategoryUrl as string,
      );
    }

    let reviewButton = null;

    try {
      reviewButton = await this.page.waitForSelector(
        ".a-link-emphasis.a-text-bold",
        {
          timeout: MAXIMUM_TIMEOUT_FOR_SCRAPING,
        },
      );

      if (reviewButton) {
        try {
          await reviewButton.click();

          await this.page.waitForNavigation({
            waitUntil: "domcontentloaded",
            timeout: MAXIMUM_TIMEOUT_FOR_SCRAPING,
          });

          const comment_url = `${this.page.url()}&sortBy=recent&pageNumber=1`;
          // console.log(colors.cyan("After navigate = "), comment_url);

          // Implement retry mechanism for page navigation
          let retries = 10;
          let success = false;

          while (retries > 0 && !success) {
            try {
              await this.page.goto(comment_url, {
                waitUntil: "load",
                timeout: MAXIMUM_TIMEOUT_FOR_SCRAPING,
              }); // Timeout after 10 seconds

              // Explicitly wait for an expected element on the comments page
              await this.page.waitForSelector(".a-section.review", {
                timeout: MAXIMUM_TIMEOUT_FOR_SCRAPING,
              });

              success = true; // If navigation and element detection succeed, break out of the loop
              console.log(colors.green("Success retry"));
            } catch (error) {
              console.error(
                `Navigation to ${comment_url} failed: ${
                  error.message
                }. Retries left: ${retries - 1}`,
              );
              retries--;
              if (retries === 0) {
                throw new Error(
                  "Failed to navigate to comments after multiple attempts.",
                );
              }
              await new Promise((resolve) => setTimeout(resolve, 2000)); // Add a small delay between retries
            }
          }

          /**
           * TODO: ============================================================= Steps to scrape the comments ============================================================= */
          const collectedComments: CommentItem[] =
            await this.scrapeCommentsRecursively(this.page, []);
          console.log(
            colors.green(
              `Total of the collected comments: ${collectedComments.length}`,
            ),
          );

          // Update the amount of comments
          scrapedProduct.numberOfComments = collectedComments.length;

          // Calculate the average of sentiment comment
          if (collectedComments.length > 0) {
            const totalScore = collectedComments.reduce(
              (sum, data: CommentItem) => {
                const score = data.sentiment.score;
                return (
                  sum + (typeof score === "number" && !isNaN(score) ? score : 0)
                );
              },
              0,
            );

            // Calculate the average sentiment score
            const averageSentimentScoreOfScrapedProduct: number = Number(
              (totalScore / collectedComments.length).toFixed(1),
            );

            // Analyze the emotion based on the average sentiment score
            const averageSentimentEmotionOfScrapedProduct: string =
              analyzeEmotionByScore(averageSentimentScoreOfScrapedProduct);

            // Ensure that scrapedProduct.averageSentimentAnalysis is properly initialized
            scrapedProduct.averageSentimentAnalysis = {
              score: averageSentimentScoreOfScrapedProduct,
              emotion: averageSentimentEmotionOfScrapedProduct,
            };
          } else {
            // Handle the case where there are no comments
            console.error("No comments found in collectedComments.");
          }

          /**
           * * Amazon's scraped data structure is completed
           */
          return {
            product: scrapedProduct,
            comments: collectedComments,
            category: flattenedCategoryHierarchy
              ? flattenedCategoryHierarchy
              : null,
            competitors: competitorsData,
          } as AmazonScrapedResponse;
        } catch (error) {
          console.error("Error in scrapeAmazonProduct");
          console.log(error);
        } finally {
          if (browser) {
            await browser.close(); // Ensure browser is closed even if an error occurs
          }
        }
      } else {
        console.error(
          "Review button not found, cannot proceed with comment scraping.",
        );
        return {
          product: scrapedProduct,
          comments: [],
          category: flattenedCategoryHierarchy
            ? flattenedCategoryHierarchy
            : null,
          competitors: [],
        } as AmazonScrapedResponse;
      }
    } catch (error) {
      return {
        product: scrapedProduct,
        comments: [],
        category: flattenedCategoryHierarchy
          ? flattenedCategoryHierarchy
          : null,
        competitors: [],
      } as AmazonScrapedResponse;
    }
  }

  async scrapeProductDataExceptForeignField(
    page: Page,
    collectedProduct: BaseProduct = null,
  ): Promise<BaseProduct> {
    /**
     * TODO: ============================================================= Scrape the main data of the products ============================================================= */
    const asin = filterAsinFromUrl(
      page.url(),
      FilterProductAttributesFromUrl.ASIN,
    );

    const title = (
      await page.$eval("#productTitle", (span) => span.textContent)
    ).trim();

    let isAmazonChoice: boolean;

    try {
      isAmazonChoice = await page.evaluate(() => {
        const el = document.querySelector(
          ".a-size-small.aok-float-left.ac-badge-rectangle",
        );
        return el !== null;
      });
    } catch (error) {
      console.error("Unable to select Amazon Choice selector");
    }

    // Current price text
    let currentPrice: string = "Not show";
    let currency: string = "";
    let currentPriceText: string = "";

    try {
      currentPriceText = await page.$eval(
        ".a-price.a-text-price.a-size-medium.apexPriceToPay span:nth-child(1)",
        (el) => el.textContent.trim(),
      );
    } catch (error) {
      console.error("Price text in apexPriceToPay not found");
    }

    try {
      currentPriceText = (
        await page.$eval(
          ".a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay span",
          (el) => el.textContent,
        )
      ).trim();
    } catch (error) {
      console.error(
        "Price element not found or unable to extract reinventPricePriceToPayMargin:",
      );
    }

    try {
      currentPriceText = (
        await page.$eval(
          ".a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay",
          (el) => el.textContent,
        )
      ).trim();

      console.log(`Extractor = ${currentPriceText}`);
      console.log(
        `Is valid price format: ${isValidPriceFormat(currentPriceText)}`,
      );

      const isDuplicatedPriceTextValue =
        currentPriceText.match(/\$\d+(\.\d{2})?/);

      currentPriceText = isDuplicatedPriceTextValue["input"];
    } catch (error) {
      console.error(
        "Price element of aok-offscreen not found or unable to extract SPAN reinventPricePriceToPayMargin:",
      );
    }

    if (currentPriceText) {
      currentPrice = currentPriceText;
      currency = filterComponentsOfPrice(currentPrice)[0] as string;
    }

    // Original price
    let originalPrice: string;
    let originalPriceMetric: number;

    try {
      const originalPriceText = await page.$eval(
        "span.a-size-small.a-color-secondary.aok-align-center.basisPrice span.a-offscreen",
        (el) => el.textContent.trim(),
      );

      if (originalPriceText) {
        originalPrice = originalPriceText;
        originalPriceMetric = Number(originalPrice.replace("$", ""));
      }
    } catch (error) {
      console.error("Price element not found or unable to extract price:");
      originalPrice = "";
      originalPriceMetric = 0;
    }

    // Average rating of product
    const averageRatingText = await page.$eval(
      ".a-icon-alt",
      (el) => el.textContent,
    );

    const filtratedAverageRatingMetric = Number(
      averageRatingText.split(" ")[0],
    );

    // Delivery location
    let deliveryLocation: string = (
      await page.$eval(
        "span.nav-line-2.nav-progressive-content",
        (el) => el.textContent,
      )
    ).trim();

    if (deliveryLocation === "United States Min...") {
      deliveryLocation = "United States Minor Outlying Islands";
    }

    let retailerElement = null;

    try {
      retailerElement = await page.$("#sellerProfileTriggerId");
    } catch (error) {
      console.error(
        "Unable to retailer name by ID = " +
          colors.cyan("sellerProfileTriggerId"),
      );
    }

    try {
      retailerElement = await page.$(
        "#merchantInfoFeature_feature_div div[offer-display-feature-name='desktop-merchant-info'] span.a-size-small.offer-display-feature-text-message",
      );
    } catch (error) {
      console.error(
        "Unable to retailer name by ID = " +
          colors.cyan("merchantInfoFeature_feature_div"),
      );
    }

    let retailerName: string | null = null;

    if (retailerElement) {
      retailerName = await page.evaluate(
        (el) => el.textContent.trim(),
        retailerElement,
      );
    } else {
      console.warn("Retailer name element not found.");
      retailerName = "Not show";
    }

    // Filtrated sales volume last month
    let filtratedSalesVolumeLastMonth: string | null;
    try {
      const salesVolumeLastMonthText = await (
        await page.$eval(
          "span.a-size-small.social-proofing-faceout-title-text",
          (el) => el.textContent,
        )
      ).trim();

      if (salesVolumeLastMonthText) {
        filtratedSalesVolumeLastMonth = salesVolumeLastMonthText;
      }
    } catch (error) {
      filtratedSalesVolumeLastMonth = "Not show";
    }

    const histogramTable = await page.$$("#histogramTable > li");
    let historamItemMapper = [];

    for (let i = 0; i < histogramTable.length; i++) {
      const ratingItem = await histogramTable[i].$eval(
        "span.a-list-item",
        (el) => el.textContent,
      );
      historamItemMapper.push(ratingItem);
    }

    const rawRatingStars: string = historamItemMapper[0];
    const filtratedHistogramItems = filterStarRatings(rawRatingStars as string);

    // Out of stock
    let isOutOfStock: boolean | null;

    try {
      const outOfStockText = await page.$eval("div#availability > span", (el) =>
        el.textContent.trim().toLowerCase(),
      );
      isOutOfStock = !outOfStockText.includes("in stock");
    } catch (error) {
      console.warn(
        "Out of stock element not found or unable to determine stock status:",
        error,
      );
      isOutOfStock = false;
    }
    // Percentage selling
    let percentage: string | null;

    try {
      const percentageSelector = await page.$(
        "span.a-size-large.a-color-price.savingPriceOverride.aok-align-center.reinventPriceSavingsPercentageMargin.savingsPercentage",
      );
      if (percentageSelector) {
        const percentageText = await page.$eval(
          "span.a-size-large.a-color-price.savingPriceOverride.aok-align-center.reinventPriceSavingsPercentageMargin.savingsPercentage",
          (el) => el.textContent.trim().toLowerCase(),
        );
        percentage = percentageText;
      }
    } catch (error) {
      console.log(colors.red("Percentage currently not available to display"));
    }

    const bestSellerRankJson =
      await this.retrieveBestSellerRankByHtmlElement(page);
    const bestSellerRankArr: string[] =
      bestSellerRankJson["attributeVal"].split("   ");
    const filteredBestSellerRank: BestSellerRank[] = filterBestSellerRanks(
      bestSellerRankArr as string[],
    );

    const isBestSeller: boolean = filteredBestSellerRank.some(
      (ranking) => ranking.rank === "#1",
    );

    const image = (await page.$eval("img#landingImage", (el) =>
      el.getAttribute("src"),
    )) as string;

    let filteredPriceAsNumeric: number;

    if (currentPriceText) {
      filteredPriceAsNumeric = filterComponentsOfPrice(
        currentPrice,
      )[1] as number;
    }

    collectedProduct = {
      asin,
      title,
      price: {
        amount: filteredPriceAsNumeric,
        currency,
        displayAmount: String(currentPrice),
        originalPrice: originalPriceMetric || filteredPriceAsNumeric,
        savings: {
          percentage: percentage !== undefined ? percentage : "",
          currency,
          displayAmount: String(currentPrice),
          amount: filteredPriceAsNumeric,
        },
      },
      histogram: filtratedHistogramItems,
      averageRating: filtratedAverageRatingMetric,
      salesVolumeLastMonth: filtratedSalesVolumeLastMonth,
      deliveryLocation,
      retailer: retailerName,
      businessTargetForCollecting: "amazon",
      url: String(page.url()),
      bestSellerRanks: filteredBestSellerRank,
      isBestSeller,
      isAmazonChoice,
      isOutOfStock,
      brand: "Amazon",
      image,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return collectedProduct as BaseProduct;
  }

  /**
   * * Get best seller ranks from dynamic HTML Element .
   * TODO: Get best seller ranks by dynamic UI.
   * @param {Page} page - The Puppeteer page object representing the current browser tab.
   * @returns {Promise<any[]>} A promise that resolves to the array of all collected comments.
   */
  async retrieveBestSellerRankByHtmlElement(page: Page): Promise<{
    heading: string;
    attributeVal: string;
  }> {
    let bestSellerRankJson = { heading: "", attributeVal: "" };
    let bestSellerRankRegex: RegExp;

    // Try to select the Best Seller Ranks from the <ul> tag first
    try {
      const bestSellerRanksUlRawText = await page.$eval(
        "#detailBulletsWrapper_feature_div",
        (el) => el.textContent.trim(),
      );

      bestSellerRankRegex = /Best Sellers Rank:\s*([\s\S]+?)Customer Reviews:/;

      // Apply the regex pattern to extract the Best Sellers Rank information
      const match = bestSellerRanksUlRawText.match(bestSellerRankRegex);

      if (match) {
        const bestSellerRankText = match[1].trim();
        bestSellerRankJson = {
          heading: "Best Sellers Rank",
          attributeVal: bestSellerRankText,
        };
        return bestSellerRankJson;
      }
    } catch (error) {
      console.error(
        "Error processing <ul> tag for Best Seller Ranks. Continuing to check table...",
      );
    }

    // If the <ul> tag doesn't contain the Best Sellers Rank, check the <table> tag
    try {
      const queryProductDetailsContainerRawText = await page.$eval(
        ".a-keyvalue.prodDetTable:nth-child(1)",
        (el) => el.textContent.trim(),
      );

      bestSellerRankRegex =
        /Best Sellers Rank\s+(#\d+[\s\S]+?)(?=\s+Date First Available)/;

      const bestSellerRankMatch =
        queryProductDetailsContainerRawText.match(bestSellerRankRegex);

      if (bestSellerRankMatch) {
        bestSellerRankJson = {
          heading: "Best Sellers Rank",
          attributeVal: bestSellerRankMatch[1].trim(),
        };
        return bestSellerRankJson;
      }
    } catch (error) {
      console.error(
        "Error processing <table> tag for Best Seller Ranks. Continuing to check div...",
      );
    }

    // If neither the <ul> nor <table> tags contain the Best Sellers Rank, check the <div> tag
    try {
      const queryProductDetailsContainerRawText = await page.$eval(
        "#productDetails_db_sections",
        (el) => el.textContent.trim(),
      );

      bestSellerRankRegex =
        /Best Sellers Rank\s+(#\d+[\s\S]+?)(?=\s+Date First Available)/;
      const bestSellerRankMatch =
        queryProductDetailsContainerRawText.match(bestSellerRankRegex);

      if (bestSellerRankMatch) {
        bestSellerRankJson = {
          heading: "Best Sellers Rank",
          attributeVal: bestSellerRankMatch[1].trim(),
        };
        return bestSellerRankJson;
      }
    } catch (error) {
      console.error("Error processing <div> tag for Best Seller Ranks.");
    }

    // Return empty result if nothing is found
    return bestSellerRankJson;
  }

  /**
   * * Across multiple pages by navigating through the pagination.
   * TODO: Recursively scrapes comments from an Amazon product page, collecting all available comments
   * @param {Page} page - The Puppeteer page object representing the current browser tab.
   * @param {any[]} collectedComments - An array to store the collected comments across all pages. Defaults to an empty array.
   * @returns {Promise<any[]>} A promise that resolves to the array of all collected comments.
   */
  async scrapeCommentsRecursively(
    page: Page,
    collectedComments: CommentItem[],
  ): Promise<CommentItem[]> {
    // await page.reload();
    const queryCommentPrimaryContainer = await page.$(
      ".a-section.a-spacing-none.reviews-content.a-size-base",
    );

    await page.waitForSelector("div[data-hook='review']", {
      timeout: MAXIMUM_TIMEOUT_FOR_SCRAPING,
    });

    const queryListOfComments = await queryCommentPrimaryContainer.$$(
      "div[data-hook='review']",
    );

    console.log(
      colors.cyan("\nSize of current list of comments = "),
      queryListOfComments.length,
    );

    for (let i = 0; i < queryListOfComments.length; i++) {
      let commentItem: CommentItem;
      let titleAndRatingRawText = await queryListOfComments[i].$eval(
        ".a-size-base.review-title.a-color-base.review-title-content.a-text-bold",
        (el) => el.textContent,
      );
      let commentRating = "";

      try {
        commentRating = await queryListOfComments[i].$eval(
          "i[data-hook='cmps-review-star-rating']",
          (el) => el.textContent.trim(),
        );
      } catch (error) {
        console.error("Not found i rating in comment title as SPAN tag");
      }

      const description = await queryListOfComments[i].$eval(
        ".a-size-base.review-text.review-text-content",
        (el) => el.textContent,
      );

      const filtratedTitleAndRatingAsList = (titleAndRatingRawText as string)
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      let processedDescription = filterNewlineSeparatedText(
        description as string,
      );
      // const filtratedDescription = await translateText(processedDescription);
      const filtratedDescription = processedDescription;

      let isVerifiedPurchase: boolean = false;

      try {
        isVerifiedPurchase =
          (await queryListOfComments[i].$(
            ".a-size-mini.a-color-state.a-text-bold",
          )) !== null;
      } catch (error) {
        console.log(colors.cyan("Is verified purchase not found"));
      }

      let helpfulCount = null;

      try {
        helpfulCount = await queryListOfComments[i].$eval(
          "span[data-hook='helpful-vote-statement']",
          (el) => el.textContent,
        );
      } catch (error) {
        helpfulCount = "Unknown";
      }

      let locationAndDateRawText = await queryListOfComments[i].$eval(
        "span[data-hook='review-date']",
        (el) => el.textContent,
      );

      // Steps to filter the data
      const filtratedLocationAndDateAsList = filterLocationAndDateOfCommentItem(
        locationAndDateRawText,
      );

      const filtratedLocation = filtratedLocationAndDateAsList[0]
        .replace(/\bthe\b/gi, "")
        .trim();

      const filtratedDate = filtratedLocationAndDateAsList[1];

      let filtratedTitle = "";
      let filtratedRating = "";

      if (filtratedTitleAndRatingAsList.length > 1) {
        filtratedTitle = filtratedTitleAndRatingAsList[1].trim();
        filtratedRating = filtratedTitleAndRatingAsList[0].trim();
      }

      if (filtratedTitleAndRatingAsList.length > 0 && commentRating) {
        filtratedTitle = filtratedTitleAndRatingAsList[0].trim();
        filtratedRating = commentRating.trim();
      }

      const sentimentTitle = analyzeSentiment(filtratedTitle);
      const sentimentDescription = analyzeSentiment(
        filtratedDescription.trim(),
      );

      const averageSentimentScore: number = Number(
        (
          (Number(sentimentTitle["score"]) +
            Number(sentimentDescription["score"])) /
          2
        ).toFixed(1),
      );

      const averageSentimentEmotion: string = analyzeEmotionByScore(
        averageSentimentScore as number,
      );

      let currentUrlOfComment: string = "";
      let foundedUrl: string = "";

      try {
        foundedUrl = await queryListOfComments[i].$eval(
          ".a-size-base.review-title.a-link-normal.a-color-base.review-title-content.a-text-bold",
          (el) => el.getAttribute("href"),
        );
        // console.log(`Current url comment in tag A: ${foundedUrl}`);
        if (foundedUrl) {
          currentUrlOfComment = foundedUrl;
        }
      } catch (error) {
        console.log("Current url of comment not found");
      }

      commentItem = {
        rating: filtratedRating,
        title: filtratedTitle,
        content: filtratedDescription,
        isVerifiedPurchase,
        helpfulCount,
        location: filtratedLocation,
        date: filtratedDate,
        url: currentUrlOfComment,
        sentiment: {
          score: averageSentimentScore,
          emotion: averageSentimentEmotion,
        },
      };
      collectedComments.push(commentItem);
    }

    let prevButtonSelector = null;
    let prevPage = {
      url: "" as string,
      metric: 1 as number,
    };
    let nextPage = {
      url: "" as string,
      metric: 1 as number,
    };

    // Extract the previous page configurations
    try {
      prevButtonSelector = await page.$(".a-pagination li:nth-child(1)");
      let prevPageUrl = await prevButtonSelector.$eval("a", (el) =>
        el.getAttribute("href"),
      );
      prevPageUrl = `https://${String(process.env.AMAZON_DOMAIN)}${prevPageUrl}`;

      let prevPageMetric = filterQueryType(prevPageUrl)["pageNumber"] as number;
      prevPage = {
        url: prevPageUrl as string,
        metric: prevPageMetric as number,
      };
    } catch (error) {
      console.error("Prev button not found");
    }

    // Need to fix the logic of next button
    let nextButtonClass = null;

    try {
      nextButtonClass = await page.$eval(
        ".a-pagination li:nth-child(2)",
        (el) => el.getAttribute("class"),
      );
      // If next button is not disabled. Extract the next page configurations
      if (nextButtonClass) {
        if (!nextButtonClass.includes("a-disabled a-last")) {
          let nextPageUrl: string = await page.$eval(
            ".a-pagination li:nth-child(2) a",
            (el) => el.getAttribute("href"),
          );

          nextPageUrl = `https://${String(
            process.env.AMAZON_DOMAIN,
          )}${nextPageUrl}`;

          const nextPageMetric = filterQueryType(String(nextPageUrl))[
            "pageNumber"
          ] as number;

          nextPage = {
            url: nextPageUrl,
            metric: nextPageMetric,
          };
        }
        const currentPage = filterQueryType(String(page.url()));

        console.log(
          `Current page = ${filterQueryType(String(page.url())).pageNumber}`,
        );

        var updatedCollectedComments = collectedComments.map((comment: CommentItem) => ({
          ...comment,
          pagination: {
            totalRecords: queryListOfComments.length,
            currentPage: currentPage.pageNumber,
            nextPage: nextPage,
            prevPage: prevPage,
          },
        }));

        // console.log("Collected comments updated")
        // var i = 1 
        // for (let com of collectedComments) {
        //   console.log(JSON.parse(JSON.stringify(com.pagination)))
        //   // console.log(com.pagination.totalRecords)
        // }

        if (nextPage.url) {
          await page.goto(nextPage.url);

          // Recursive call to scrape the next page
          return this.scrapeCommentsRecursively(page, updatedCollectedComments);
        } else {
          // No more pages, return collected comments
          return collectedComments;
        }
      }
    } catch (error) {
      // console.log(colors.rainbow("Next page button not found"));
      collectedComments = collectedComments.map((comment: CommentItem) => ({
        ...comment,
        pagination: {
          totalRecords: queryListOfComments.length,
          currentPage: 1,
          nextPage: { url: "", metric: 1 },
          prevPage: { url: "", metric: 1 },
        },
      }));

      return collectedComments;
    }
  }

  async scrapeRelatedBestSellerRanks(
    productTitleForChecking: string,
    url: string,
    competitors: CompetitorResponse[] = [],
    // top5MatchThresholdParams: number = 0,
  ): Promise<CompetitorResponse[]> {
    // console.log("Main URL = ", url);

    const browser = await puppeteer.launch(
      HEADLESS_STATE_MANAGEMENT.PRODUCTION_MODE,
    );
    const newPage = await browser.newPage();

    this.normalCaptchSolver.execute(newPage);
    this.signInSolver.execute(newPage);

    // let competitors2 = [];
    let top5MatchThreshold: number = 0;
    let bestSellerUrl: string = "";

    await newPage.goto(`https://${String(process.env.AMAZON_DOMAIN)}${url}`, {
      waitUntil: "load",
    });

    // TODO: UI Best Seller Url 1
    try {
      await newPage.waitForSelector(
        `.apb-default-slot.apb-default-auto-merchandised-search-9`,
        {
          timeout: MAXIMUM_TIMEOUT_FOR_SCRAPING,
        },
      );
      bestSellerUrl = await newPage.$eval(
        `.apb-default-slot.apb-default-auto-merchandised-search-9 .a-link-normal`,
        (el) => el.getAttribute("href"),
      );
    } catch (error) {
      console.error("Not found");
    }

    // TODO: UI Best Seller Url 2
    try {
      await newPage.waitForSelector(`select#s-result-sort-select`, {
        timeout: MAXIMUM_TIMEOUT_FOR_SCRAPING,
      });
      bestSellerUrl = await newPage.$eval(
        `select#s-result-sort-select option[value='exact-aware-popularity-rank']`,
        (el) => el.getAttribute("data-url"),
      );

      // console.log("Oh, found best seller URL = " + bestSellerUrl);
    } catch (error) {
      console.error("Best seller url 2 not found");
    }

    await newPage.goto(
      `https://${String(process.env.AMAZON_DOMAIN)}${bestSellerUrl}`,
      { waitUntil: "load" },
    );

    let pageNumber = 1;
    // Begin recursive scraping
    const competitorsData = await this.scrapePageAndExtractCompetitors(
      newPage,
      pageNumber,
      productTitleForChecking,
      competitors,
      top5MatchThreshold,
    );

    console.log(`Collected ${competitorsData.length} brands`);
    return competitorsData;
  }

  async scrapePageAndExtractCompetitors(
    page: Page,
    pageNumber: number,
    keyword: string,
    competitors: any[] = [],
    top5MatchThreshold: number = 0,
  ): Promise<CompetitorResponse[]> {
    if (competitors.length === this.topCompetitorAnalysisLimit) {
      return competitors;
    }

    let formattedUrls: string[] = [];
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(`\nScraping page ${pageNumber}...`);
    // Extract competitor products on the current page
    let listOfCompetitorProducts: ElementHandle[] = [];

    //TODO: UI of List Of Competitor 1
    try {
      await page.waitForSelector(
        ".sg-col-20-of-24.s-result-item.s-asin.sg-col-0-of-12.sg-col-16-of-20.sg-col.s-widget-spacing-small.gsx-ies-anchor.sg-col-12-of-16",
        {
          timeout: MAXIMUM_TIMEOUT_FOR_SCRAPING,
        },
      );
      listOfCompetitorProducts = await page.$$(
        ".sg-col-20-of-24.s-result-item.s-asin.sg-col-0-of-12.sg-col-16-of-20.sg-col.s-widget-spacing-small.gsx-ies-anchor.sg-col-12-of-16",
      );
      // console.log(colors.green("UI 1 Founded"));

      // Fetch all of href data from different UI of best seller page
      for (let i = 0; i < listOfCompetitorProducts.length; i++) {
        try {
          const rawHref = await listOfCompetitorProducts[i].$eval(
            ".a-link-normal.s-underline-text.s-underline-link-text.s-link-style.a-text-normal",
            (el: any) => el.getAttribute("href"),
          );
          const formattedHref = `https://${String(process.env.AMAZON_DOMAIN)}${rawHref}`;

          formattedUrls.push(formattedHref);
        } catch (error) {
          console.error("URL not found");
        }
      }
    } catch (error) {
      console.error("Unable to find the column style of products");
    }

    //TODO: UI of List Of Competitor 2
    try {
      await page.waitForSelector(
        "span[data-component-type='s-search-results'] div[data-component-type='s-search-result']",
        {
          timeout: MAXIMUM_TIMEOUT_FOR_SCRAPING,
        },
      );
      listOfCompetitorProducts = await page.$$(
        "span[data-component-type='s-search-results'] div[data-component-type='s-search-result']",
      );

      // console.log(colors.green("UI 2 Founded"));

      // Fetch all of href data from different UI of best seller page
      for (let i = 0; i < listOfCompetitorProducts.length; i++) {
        try {
          const rawHref = await listOfCompetitorProducts[i].$eval(
            ".a-link-normal.s-underline-text.s-underline-link-text.s-link-style.a-text-normal",
            (el: any) => el.getAttribute("href"),
          );
          const formattedHref = `https://${String(process.env.AMAZON_DOMAIN)}${rawHref}`;

          formattedUrls.push(formattedHref);
        } catch (error) {
          console.error("URL not found");
        }
      }
    } catch (error) {
      console.error("Unable to find the grid of products");
    }

    //TODO: UI of List Of Competitor 3
    try {
      await page.waitForSelector(".p13n-gridRow._cDEzb_grid-row_3Cywl", {
        timeout: MAXIMUM_TIMEOUT_FOR_SCRAPING,
      });
      listOfCompetitorProducts = await page.$$(
        ".p13n-gridRow._cDEzb_grid-row_3Cywl #gridItemRoot",
      );

      // console.log(colors.green("UI 3 Founded"));

      // Fetch all of href data from different UI of best seller page
      for (let i = 0; i < listOfCompetitorProducts.length; i++) {
        try {
          const rawHref = await listOfCompetitorProducts[i].$eval(
            ".a-link-normal.aok-block",
            (el: any) => el.getAttribute("href"),
          );
          const formattedHref = `https://${String(process.env.AMAZON_DOMAIN)}${rawHref}`;
          formattedUrls.push(formattedHref);
        } catch (error) {
          console.error("URL not found");
        }
      }
    } catch (error) {
      console.error("Competitor products in another UI not found");
    }

    //TODO: UI 4
    try {
    } catch (error) {}

    // Start to collect data of competitor product details
    for (let i = 0; i < formattedUrls.length; i++) {
      if (competitors.length === this.topCompetitorAnalysisLimit) {
        return competitors;
      }

      const detailsPage = await page.browser().newPage();

      try {
        console.log(`\n\nStarting to scrape product ${i + 1}`);

        // Start to use for loop format[i]
        await detailsPage.goto(formattedUrls[i], {
          waitUntil: "domcontentloaded",
        });

        // Do the necessary data extraction logic here
        let productDetailsTableHtml = null;
        let brandValue: string = "";

        const detailsPageTitle = await detailsPage.$eval("#title", (el) =>
          el.textContent.trim(),
        );
        let detailsPageRatingCount = "";
        let ratingCountAsNumber: number = 0;

        try {
          detailsPageRatingCount = await detailsPage.$eval(
            "#acrCustomerReviewText",
            (el) => el.textContent.trim(),
          );
          if (detailsPageRatingCount) {
            const splittedRating = detailsPageRatingCount.split(" ");
            ratingCountAsNumber = Number(splittedRating[0].replace(/,/g, ""));
          }
        } catch (error) {
          console.error("Details page rating count not found");
        }

        let averageRatingText: string = "";
        let filtratedAverageRatingMetric = 0;

        try {
          averageRatingText = await detailsPage.$eval(
            ".a-icon-alt",
            (el) => el.textContent,
          );

          if (averageRatingText) {
            filtratedAverageRatingMetric = Number(
              averageRatingText.split(" ")[0],
            );
          }
        } catch (error) {
          console.error("Average rating text not found");
        }

        try {
          productDetailsTableHtml = await detailsPage.$eval(
            "table.a-normal.a-spacing-micro",
            (el) => el.textContent.trim(),
          );
        } catch (error) {
          console.error("Product table not found");
        }

        // HTML Content in product table/list format
        if (productDetailsTableHtml) {
          // TABLE format
          const productDetailsTableHtml = await detailsPage.$$(
            "table.a-normal.a-spacing-micro tbody tr",
          );
          if (productDetailsTableHtml.length > 0) {
            brandValue = await detailsPage.$eval(
              "table.a-normal.a-spacing-micro tbody tr.a-spacing-small.po-brand td.a-span9",
              (el: any) => el.textContent.trim(),
            );
            brandValue = _.startCase(_.lowerCase(brandValue));
          }
        } else {
          // UL/List format
          productDetailsTableHtml = await detailsPage.$$(
            "div#detailBullets_feature_div ul li",
          );

          // Traverse the item in product details table
          for (let i = 0; i < productDetailsTableHtml.length; i++) {
            const productItemHtmlContent = await detailsPage.$eval(
              `div#detailBullets_feature_div ul li:nth-child(${i + 1})`,
              (el) => el.textContent.trim(),
            );
            const MANUFACTURER_KEY = "Manufacturer";

            if (productItemHtmlContent.includes(MANUFACTURER_KEY)) {
              const manufacturerValue = await productDetailsTableHtml[i].$eval(
                "span",
                (el) => el.textContent.trim(),
              );
              const preprocessedManufacturer = manufacturerValue
                .split("  ")
                .map((raw) => raw.replace(/[\n\r\u200F\u200E]/g, "").trim()) // Remove \n and special characters
                .filter((raw) => raw !== "")
                .filter((raw) => raw !== ":");

              if (preprocessedManufacturer.length > 0) {
                brandValue = preprocessedManufacturer[1];
              }
            }
          }
        }

        const matchedCompetitorProductEncoder: string =
          await findBestMatchingProductInSingleAttribute(
            keyword,
            detailsPageTitle,
          );
        const matchedCompetitorProductDecoder = jsonCamelCase(
          JSON.parse(matchedCompetitorProductEncoder),
        ) as CompetitorResponse;

        matchedCompetitorProductDecoder.url = detailsPage.url();
        matchedCompetitorProductDecoder.brand = brandValue;
        matchedCompetitorProductDecoder.numberOfReviews = ratingCountAsNumber;
        matchedCompetitorProductDecoder.averageRating =
          filtratedAverageRatingMetric;

        // View the competitors data analysis
        viewCompetitorProductAnalysis(
          i + 1,
          matchedCompetitorProductDecoder as CompetitorResponse,
        );

        if (
          matchedCompetitorProductDecoder.title !== keyword &&
          matchedCompetitorProductDecoder.similarityScore >
            FIFTY_PERCENTAGE_OF_EXPECTED_RELEVANT &&
          matchedCompetitorProductDecoder.brand !== ""
        ) {
          if (
            top5MatchThreshold === this.topCompetitorAnalysisLimit ||
            competitors.length === this.topCompetitorAnalysisLimit
          ) {
            return competitors;
          }

          competitors.push(matchedCompetitorProductDecoder);
          ++top5MatchThreshold;

          // console.log(
          //   colors.blue(`Added product ${i + 1} to the competitor list`),
          // );
        }
        await detailsPage.close();
      } catch (error) {
        console.error(`Error scraping product ${i + 1}:`, error);
        await detailsPage.close();
      }
    }

    console.log(
      colors.bgGreen(
        `Collected ${competitors.length} products on page ${pageNumber}.`,
      ),
    );

    if (competitors.length === this.topCompetitorAnalysisLimit) {
      return competitors;
    }

    // Check if there is a next button and recursively call the same function if needed
    const nextButton = await this.getNextButtonOfCompetitorsPage(page);

    if (nextButton) {
      // Click the next button and wait for the new page to load
      await nextButton.click();
      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      console.log(
        colors.cyan(
          `Moving to the next page (Page ${pageNumber + 1})..........`,
        ),
      );

      // Recursively scrape the next page
      return this.scrapePageAndExtractCompetitors(
        page,
        pageNumber + 1,
        keyword,
        competitors,
        top5MatchThreshold,
      );
    } else {
      console.log(colors.yellow("\nNo more pages, stopping recursion."));
      return competitors;
    }
  }

  // Helper function to get the next button element
  async getNextButtonOfCompetitorsPage(page: Page) {
    const nextBtnStateManager = [
      "s-pagination-item s-pagination-next s-pagination-button s-pagination-separator",
      "s-pagination-item s-pagination-next s-pagination-disabled",
    ];

    try {
      await page.waitForSelector(".s-pagination-item.s-pagination-next", {
        timeout: MAXIMUM_TIMEOUT_FOR_SCRAPING,
      });
      const nextButtonClassName = await page.$eval(
        ".s-pagination-item.s-pagination-next",
        (el) => el.getAttribute("class"),
      );

      if (nextButtonClassName.includes(nextBtnStateManager[0])) {
        return await page.$(".s-pagination-item.s-pagination-next");
      } else if (nextButtonClassName.includes(nextBtnStateManager[1])) {
        return null;
      }
    } catch (error) {
      console.error(
        "Next button not found or error in finding next button:",
        error,
      );
      return null;
    }
  }

  async getBestKeyword(text: string) {
    const executablePath = path.join(
      __dirname,
      "../../../src/scripts/keyword_related.py",
    );
    const command = `python ${executablePath} '${text}'`;
    const execPromise = util.promisify(exec);

    try {
      // Wait for the exec result
      const { stdout, stderr } = await execPromise(command);

      if (stderr) {
        console.error("Error in exec: ", stderr);
      }

      // Capture the output and trim the result
      const captureValue = stdout.trim();

      // Update the description after the exec finishes
      text = captureValue;

      return text; // Return the updated description if needed
    } catch (error) {
      console.error("Error executing command: ", error);
      throw error; // Optionally throw the error for handling later
    }
  }
}
