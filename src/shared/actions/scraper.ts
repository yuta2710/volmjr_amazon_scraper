import puppeteer, { Page } from "puppeteer";
import { exec } from "child_process";
import path from "path";
import { AssemblyAI } from "assemblyai";
import {
  extractAsinFromUrl,
  extractCommendLocationAndDate,
  processStarRatings,
  processNewlineSeparatedText,
  ProductFieldExtractorFromUrl,
  filtrateData,
  analyzeSentiment,
  analyzeEmotionByScore,
  extractComponentsOfPrice,
} from "./pipeline";
import { setTimeout as delayPage } from "node:timers/promises";
import {
  BaseProduct,
  CommentItem,
  AmazonScrapedResponse,
} from "@/modules/products/product.types";
import * as util from "util";
import CategoryNode, {
  buildCategoryHierarchy,
  saveCategoryHierarchy,
} from "../category";

/**
 * Scrapes product information and reviews from an Amazon product page.
 *
 * @param {string} url - The URL of the Amazon product page to scrape.
 */
export async function scrapeAmazonProduct(
  url: string,
): Promise<AmazonScrapedResponse> {
  if (!url) return;

  // const browser = await puppeteer.launch({ headless: true });
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      "--start-fullscreen", // you can also use '--start-fullscreen'
    ],
  });
  const page = await browser.newPage();
  await page.goto(url).catch(console.error);

  async function checkAndSolveNormalCaptcha() {
    try {
      const captchaPhotoSelector = "div.a-row.a-text-center > img";
      const captchaPhotoRemoteUrl = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute("src") : "";
      }, captchaPhotoSelector);

      if (captchaPhotoRemoteUrl) {
        console.log("Captcha detected, solving...");

        const executablePath = path.join(
          __dirname,
          "../../../src/scripts/normal+captcha.py",
        );
        const command = `python ${executablePath} ${captchaPhotoRemoteUrl}`;

        exec(command, async (error, stdout, stderr) => {
          if (error) {
            console.error(`Error: ${error.message}`);
            return;
          }
          if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
          }
          const captureValue = stdout.trim();

          await page.waitForSelector("#captchacharacters").catch(console.error);
          await page
            .type("#captchacharacters", captureValue)
            .catch(console.error);

          const button = await page.$(".a-button-text");
          await button.click().catch(console.error);

          await page
            .waitForNavigation({ waitUntil: "domcontentloaded" })
            .catch(console.error);

          console.log("Captcha solved and form submitted.");
        });
      } else {
        console.info("Captcha not detected, proceeding to login...");
      }
    } catch (err) {
      console.error("Error handling captcha:", err.message);
    }
  }

  await checkAndSolveNormalCaptcha();
  // await page.waitForNavigation({ waitUntil: "domcontentloaded" });
  await delayPage(2000);

  /**
   * TODO: ============================================================= Step to sign in ============================================================= */
  const signInButton = await page.$("a[data-nav-ref='nav_ya_signin']");

  if (signInButton) {
    await signInButton.click();
    await page.waitForNavigation({ waitUntil: "domcontentloaded" });

    await page.waitForSelector("#ap_email");
    await page.type("#ap_email", String(process.env.AMAZON_ACCOUNT_EMAIL));
    const continueButton = await page.$("#continue");
    await continueButton.click();

    await page.waitForSelector("#ap_password");
    await page.type(
      "#ap_password",
      String(process.env.AMAZON_ACCOUNT_PASSWORD),
    );

    const signInSubmitButton = await page.$("#signInSubmit");
    await signInSubmitButton.click();

    await page.waitForNavigation({ waitUntil: "domcontentloaded" });

    /**
     * TODO: ============================================================= Step to check Captcha Audio verification if it requires ============================================================= */
    // Function to check for the presence of the captcha
    async function checkAndHandleCaptchaAudio() {
      const captchaSelector =
        "a.a-link-normal.cvf-widget-link-alternative-captcha.cvf-widget-btn-val.cvf-widget-link-disable-target.captcha_refresh_link";

      try {
        const captchaElement = await page.waitForSelector(captchaSelector, {
          timeout: 5000, // Wait up to 5 seconds for the captcha to appear
        });

        if (captchaElement) {
          console.log("Captcha detected, handling audio captcha...");
          await captchaElement.click();

          await page.waitForNavigation({ waitUntil: "domcontentloaded" });
          const audioUrl = await page.$eval("source[type='audio/ogg']", (el) =>
            el.getAttribute("src"),
          );
          const client = new AssemblyAI({
            apiKey: String(process.env.ASSEMBLY_AI_API_KEY),
          });
          const data = {
            audio_url: audioUrl,
          };
          const getTranscript = async () => {
            const transcript = await client.transcripts.transcribe(data);
            return transcript.text;
          };

          const processedTranscript = await getTranscript();
          const transcriptList = processedTranscript.split(" ");
          const processedAudioCaptchaValue = transcriptList[
            transcriptList.length - 1
          ].replace(".", "");

          console.log("Processed captcha value = ", processedAudioCaptchaValue);

          await page.waitForSelector(
            ".a-input-text.a-span12.cvf-widget-input.cvf-widget-input-code.cvf-widget-input-captcha.fwcim-captcha-guess",
          );
          await page.type(
            ".a-input-text.a-span12.cvf-widget-input.cvf-widget-input-code.cvf-widget-input-captcha.fwcim-captcha-guess",
            processedAudioCaptchaValue,
          );

          const continueCaptchaButton = await page.$(
            ".a-button.a-button-span12.a-button-primary.cvf-widget-btn-captcha.cvf-widget-btn-verify-captcha",
          );
          if (continueCaptchaButton) {
            await continueCaptchaButton.click();
            await page.waitForNavigation({ waitUntil: "domcontentloaded" });
          } else {
            throw new Error("Continue button for captcha not found.");
          }
        }
      } catch (err) {
        if (err.name === "TimeoutError") {
          console.info("Captcha Audio not detected, continuing...");
          // If captcha is not detected, proceed as normal
        } else {
          console.error("Error handling captcha:", err.message);
          // Handle other errors as needed, possibly retry or log them
        }
      }
    }

    // Call the captcha check function after sign-in attempt
    await checkAndHandleCaptchaAudio();

    /**
     * TODO: ============================================================= Scrape the main data of the products ============================================================= */
    const asin = extractAsinFromUrl(
      page.url(),
      ProductFieldExtractorFromUrl.ASIN,
    );

    const title = (
      await page.$eval("#productTitle", (span) => span.textContent)
    ).trim();

    // Current price text
    let currentPrice: string;
    let currency: string;

    try {
      const priceText = (
        await page.$eval(
          ".a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay",
          (el) => el.textContent,
        )
      ).trim();

      if (priceText) {
        currentPrice = priceText;
        currency = extractComponentsOfPrice(currentPrice)[0] as string;
      }
    } catch (error) {
      console.error("Price element not found or unable to extract price:");
      currentPrice = ""; // or set to null or some default value
      currency = ""; // or set to a default value if needed
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
      console.warn(
        "Price element not found or unable to extract price:",
        error,
      );
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
    const deliveryLocation = (
      await page.$eval(
        "span.nav-line-2.nav-progressive-content",
        (el) => el.textContent,
      )
    ).trim();

    const retailerElement = await page.$(
      "span.a-size-small.offer-display-feature-text-message",
    );
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
    // console.log("Length of histogram table = ", histogramTable.length);
    let historamItemMapper = [];

    for (let i = 0; i < histogramTable.length; i++) {
      const ratingItem = await histogramTable[i].$eval(
        "span.a-list-item",
        (el) => el.textContent,
      );
      historamItemMapper.push(ratingItem);
    }

    const rawRatingStars: string = historamItemMapper[0];
    const filtratedHistogramItems = processStarRatings(
      rawRatingStars as string,
    );

    const selectedOption = await page.evaluate(() => {
      const selectElement = document.querySelector(
        "select.nav-search-dropdown.searchSelect.nav-progressive-attrubute.nav-progressive-search-dropdown",
      );
      const selectedOptionElement = selectElement.querySelector(
        "option[selected = 'selected']",
      );
      return selectedOptionElement.textContent.trim(); // or use `.value` to get the value attribute
    });

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

    console.log("Is Out of Stock:", isOutOfStock);
    // console.log(`\nHistogram Mapper have ${historamItemMapper.length} result`)
    console.log(`Metric of average rating = ${filtratedAverageRatingMetric}`);
    console.log("Original price = ", originalPrice);

    // Percentage selling
    let percentage: string | null;

    let categoryContainerSelectorList = await page.$$(
      "#wayfinding-breadcrumbs_feature_div ul > li",
    );

    let filtratedCategories: string[] = [];

    // Process the data in selector list
    if (categoryContainerSelectorList.length > 0) {
      for (let i = 0; i < categoryContainerSelectorList.length; i++) {
        let categoryText = await categoryContainerSelectorList[i].$eval(
          "span",
          (el) => el.textContent.trim(),
        );
        filtratedCategories.push(categoryText);
      }
    }

    // Remove the special character
    filtratedCategories = filtratedCategories.filter((data) => data !== "›");

    // Setup the 2N rule
    const totalCategoryNode: number = filtratedCategories.length;
    const STAR_RULE = 1;
    const END_RULE = 2 * totalCategoryNode;

    // Build the tree of category
    let categoryHierarchy: CategoryNode = buildCategoryHierarchy(
      filtratedCategories,
      STAR_RULE,
      END_RULE,
    );
    categoryHierarchy.displayHierarchyAsJSON();

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
      console.warn("\nPercentage not displayed");
    }

    const queryProductDetailsListAsTable = await page.$$(
      "table#productDetails_detailBullets_sections1 tbody tr",
    );
    let bestSellerRankJson = { heading: "", attributeVal: "" };

    for (let i = 0; i < queryProductDetailsListAsTable.length; i++) {
      const heading = await queryProductDetailsListAsTable[i].$eval(
        "th.a-color-secondary.a-size-base.prodDetSectionEntry",
        (el) => el.textContent.trim(),
      );
      const attributeVal = await queryProductDetailsListAsTable[i].$eval(
        "td",
        (el) => el.textContent.trim(),
      );

      if (heading === "Best Sellers Rank") {
        bestSellerRankJson = {
          heading,
          attributeVal,
        };
      }
    }

    console.log("\nBest Seller Rank");
    console.log(bestSellerRankJson);

    const bestSellerRankAttributeArr: string[] =
      bestSellerRankJson["attributeVal"].split("   ");

    console.log("\nBest Seller Rank Array Attribute Values");
    console.log(bestSellerRankAttributeArr);

    const image = (await page.$eval("img#landingImage", (el) =>
      el.getAttribute("src"),
    )) as string;

    /**
     * ! This is the completed product but still miss these fields (numberOfComments, averageSentimentAnalysis) */
    const scrapedProduct: BaseProduct = {
      asin,
      title,
      price: {
        amount: extractComponentsOfPrice(currentPrice)[1] as number,
        currency,
        displayAmount: String(currentPrice),
        currentPrice: extractComponentsOfPrice(currentPrice)[1] as number,
        originalPrice: originalPriceMetric,
        highestPrice: originalPriceMetric,
        lowestPrice: extractComponentsOfPrice(currentPrice)[1] as number,
        savings: {
          percentage: percentage !== undefined ? percentage : "",
          currency,
          displayAmount: String(currentPrice),
          amount: extractComponentsOfPrice(currentPrice)[1] as number,
        },
      },
      histogram: filtratedHistogramItems,
      averageRating: filtratedAverageRatingMetric,
      salesVolumeLastMonth: filtratedSalesVolumeLastMonth,
      deliveryLocation,
      retailer: retailerName,
      businessTargetForCollecting: "amazon",
      url: String(page.url()),
      bestSellerRanks: bestSellerRankAttributeArr,
      isOutOfStock,
      brand: "Amazon",
      image,
    };

    // After format asin, title, price...., navigate to comment page
    // Wait for the review button to appear and be clickable
    const reviewButton = await page.waitForSelector(
      ".a-link-emphasis.a-text-bold",
      { timeout: 5000 },
    );

    if (reviewButton) {
      try {
        await reviewButton.click();
        await page.waitForNavigation({
          waitUntil: "domcontentloaded",
          timeout: 10000,
        }); // Timeout after 10 seconds

        const comment_url = `${page.url()}&sortBy=recent&pageNumber=1`;
        console.log("After navigate = ", comment_url);

        // Implement retry mechanism for page navigation
        let retries = 3;
        let success = false;

        while (retries > 0 && !success) {
          try {
            await page.goto(comment_url, {
              waitUntil: "domcontentloaded",
              timeout: 10000,
            }); // Timeout after 10 seconds
            success = true; // If navigation succeeds, break out of the loop
          } catch (error) {
            console.error(
              `Navigation to ${comment_url} failed: ${error.message}. Retries left: ${retries - 1}`,
            );
            retries--;
            if (retries === 0) {
              throw new Error(
                "Failed to navigate to comments after multiple attempts.",
              );
            }
          }
        }

        /**
         * TODO: ============================================================= Steps to scrape the comments ============================================================= */
        const collectedComments: CommentItem[] =
          await scrapeCommentsRecursively(page);
        console.log("Total collected comments:", collectedComments.length);

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

          const listOfScoreFromComments = collectedComments.map(
            (comment: CommentItem) => comment.sentiment.score,
          );

          // console.log(
          //   `\nList score of comments ${listOfScoreFromComments.length}`,
          // );
          // console.log(listOfScoreFromComments);

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
         * * Product's data structure is completed
         */
        console.log("\nProduct complete scraping");
        console.log(scrapedProduct);

        return {
          product: scrapedProduct,
          comments: collectedComments,
          category: categoryHierarchy,
        } as AmazonScrapedResponse;
      } catch (error) {
        console.error("Error in scrapeAmazonProduct:", error.message);
        return null; // Return null or handle the error appropriately
      } finally {
        if (browser) {
          await browser.close(); // Ensure browser is closed even if an error occurs
        }
      }
    } else {
      console.error(
        "Review button not found, cannot proceed with comment scraping.",
      );
    }
    // https://www.amazon.com/Tanisa-Organic-Spring-Paper-Wrapper/product-reviews/B07KXPKRNK/ref=cm_cr_arp_d_viewpnt_lft?ie=UTF8&reviewerType=all_reviews&filterByStar=all_stars&pageNumber=1
  } else {
    console.error("Sign-in button not found");
  }
}

/**
 * * Across multiple pages by navigating through the pagination.
 * TODO: Recursively scrapes comments from an Amazon product page, collecting all available comments
 * @param {Page} page - The Puppeteer page object representing the current browser tab.
 * @param {any[]} collectedComments - An array to store the collected comments across all pages. Defaults to an empty array.
 * @returns {Promise<any[]>} A promise that resolves to the array of all collected comments.
 */
async function scrapeCommentsRecursively(
  page: Page,
  collectedComments: CommentItem[] = [],
) {
  // await delayPage(2000);
  const queryCommentPrimaryContainer = await page.$(
    ".a-section.a-spacing-none.reviews-content.a-size-base",
  );

  const queryListOfComments = await queryCommentPrimaryContainer.$$(
    "div[data-hook='review']",
  );

  console.log("Length of this list of comments = ", queryListOfComments.length);

  for (let i = 0; i < queryListOfComments.length; i++) {
    let commentItem: CommentItem;
    const titleAndRatingRawText = await queryListOfComments[i].$eval(
      ".a-size-base.a-link-normal.review-title.a-color-base.review-title-content.a-text-bold",
      (el) => el.textContent,
    );
    const currentUrlOfComment = await queryListOfComments[i].$eval(
      ".a-size-base.a-link-normal.review-title.a-color-base.review-title-content.a-text-bold",
      (el) => el.getAttribute("href"),
    );
    const description = await queryListOfComments[i].$eval(
      ".a-size-base.review-text.review-text-content",
      (el) => el.textContent,
    );
    const filtratedTitleAndRatingAsList = (titleAndRatingRawText as string)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const filtratedDescription = processNewlineSeparatedText(
      description as string,
    );

    const isVerifiedPurchase = await queryListOfComments[i].evaluate(() => {
      const el = document.querySelector(
        ".a-size-mini.a-color-state.a-text-bold",
      );
      return el.textContent !== "";
    });

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
    const filtratedLocationAndDateAsList = extractCommendLocationAndDate(
      locationAndDateRawText,
    );
    const filtratedLocation = filtratedLocationAndDateAsList[0];
    const filtratedDate = filtratedLocationAndDateAsList[1];
    const filtratedRating = filtratedTitleAndRatingAsList[0].trim();
    const filtratedTitle = filtratedTitleAndRatingAsList[1].trim();

    const sentimentTitle = analyzeSentiment(filtratedTitle);
    const sentimentDescription = analyzeSentiment(filtratedDescription.trim());

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

  const isNextButtonDisabled = await page.$eval(
    ".a-pagination li.a-last",
    (el) => el.classList.contains("a-disabled"),
  );

  console.log("Is = ", isNextButtonDisabled);

  const nextButtonClass = await page.$eval(
    ".a-pagination li:nth-child(2)",
    (el) => el.getAttribute("class"),
  );
  console.log("Class name of next button = ", nextButtonClass);

  if (!nextButtonClass.includes("a-disabled a-last")) {
    let nextButtonUrl: string = await page.$eval(
      ".a-pagination li:nth-child(2) a",
      (el) => el.getAttribute("href"),
    );
    nextButtonUrl = `https://${String(process.env.AMAZON_DOMAIN)}${nextButtonUrl}`;

    console.log("Url");
    console.log(nextButtonUrl);
    await page.goto(nextButtonUrl);
    // await page.waitForNavigation({ waitUntil: "domcontentloaded" });
    // Recursive call to scrape the next page
    return scrapeCommentsRecursively(page, collectedComments);
  } else {
    // No more pages, return collected comments
    return collectedComments;
  }
}
