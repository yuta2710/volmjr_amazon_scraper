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
import { BaseProduct, CommentItem } from "@/modules/products/product.types";
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
export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  // let browser;
  // if (String(process.env.IS_BROWSER_IN_HEADLESS_MODE) === "ON") {
  //   browser = await puppeteer.launch({
  //     headless: true,
  //   });
  // } else {
  // browser = await puppeteer.launch({
  //   headless: false,
  //   defaultViewport: null,
  //   args: ["--start-maximized"],
  // });
  // }

  // const browser = await puppeteer.launch({
  //   headless: true,
  // });

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();
  await page.goto(url);

  /**
   * TODO: ============================================================= Step solving normal captcha when we set headless = false for debugging ============================================================= */
  try {
    const captchaPhotoRemoteUrl = await page.evaluate(() => {
      const el = document.querySelector("div.a-row.a-text-center > img");
      return el ? el.getAttribute("src") : "";
    });

    if (!captchaPhotoRemoteUrl) {
      console.error("\nCaptcha URL not found");
    }
    let captureValue: string;

    if (captchaPhotoRemoteUrl !== "") {
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
        captureValue = stdout.trim();

        await page.waitForSelector("#captchacharacters");
        await page.type("#captchacharacters", captureValue);

        const button = await page.$(".a-button-text");
        button.click();

        await page.waitForNavigation({ waitUntil: "domcontentloaded" });
      });
    }

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
      // await page.reload();

      /**
       * TODO: ============================================================= Step to check captcha audio verification if it requires ============================================================= */
      const changeToAudioCaptchaButton = await page.$(
        "a.a-link-normal.cvf-widget-link-alternative-captcha.cvf-widget-btn-val.cvf-widget-link-disable-target.captcha_refresh_link",
      );
      if (changeToAudioCaptchaButton) {
        await changeToAudioCaptchaButton.click();

        // await delayPage(2000);
        await page.waitForNavigation({ waitUntil: "domcontentloaded" });
        const audioUrl = await page.$eval("source[type='audio/ogg']", (el) =>
          el.getAttribute("src"),
        );
        const client = new AssemblyAI({
          apiKey: String(process.env.ASSEMBLY_AI_API_KEY),
        });
        // Request parameters
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

        console.log("Proccessed captcha value = ", processedAudioCaptchaValue);

        await page.waitForSelector(
          ".a-input-text.a-span12.cvf-widget-input.cvf-widget-input-code.cvf-widget-input-captcha.fwcim-captcha-guess",
        );
        await page.type(
          ".a-input-text.a-span12.cvf-widget-input.cvf-widget-input-code.cvf-widget-input-captcha.fwcim-captcha-guess",
          processedAudioCaptchaValue,
        );
        const continueButton = await page.$(
          ".a-button.a-button-span12.a-button-primary.cvf-widget-btn-captcha.cvf-widget-btn-verify-captcha",
        );
        await continueButton.click();
        // await page.waitForNavigation({ waitUntil: "domcontentloaded" });
      }

      // await page.reload();

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
        console.warn(
          "Price element not found or unable to extract price:",
          error,
        );
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
        const outOfStockText = await page.$eval(
          "div#availability > span",
          (el) => el.textContent.trim().toLowerCase(),
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

      // SAVED TO DB: Category
      console.log("\nSaving category started.......");
      const insertedCategoryId: number =
        await saveCategoryHierarchy(categoryHierarchy);

      try {
        const percentageText = await page.$eval(
          "span.a-size-large.a-color-price.savingPriceOverride.aok-align-center.reinventPriceSavingsPercentageMargin.savingsPercentage",
          (el) => el.textContent.trim().toLowerCase(),
        );

        if (percentageText) {
          percentage = percentageText;
        }
      } catch (error) {
        console.warn("\nPercentage not displayed");
      }

      /**
       * ! This is the completed product but still miss these fields (numberOfComments, averageSentimentAnalysis) */
      const scrapedProduct: BaseProduct = {
        asin,
        title,
        price: {
          amount: originalPriceMetric,
          currency,
          displayAmount: String(originalPrice),
          currentPrice: extractComponentsOfPrice(currentPrice)[1] as number,
          originalPrice: originalPriceMetric,
          highestPrice: originalPriceMetric,
          lowestPrice: extractComponentsOfPrice(currentPrice)[1] as number,
          savings: {
            percentage,
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
        category: insertedCategoryId,
        isOutOfStock,
      };

      // After saved asin, title, price...., navigate to comment page
      const reviewButton = await page.$(".a-link-emphasis.a-text-bold");
      await reviewButton.click();

      await page.waitForNavigation({ waitUntil: "domcontentloaded" });
      const comment_url = page.url() + "&sortBy=recent&pageNumber=1";
      console.log("After navigate = ", comment_url);
      await page.goto(comment_url);

      // Set wating for the page fully loaded
      // await page.reload();

      /**
       * TODO: ============================================================= Steps to scrape the comments ============================================================= */
      const collectedComments: CommentItem[] = await scrapeCommentsRecursively(page);
      console.log("\nCollected comments");
      // console.log(collectedComments);
      console.log("Total collected comments:", collectedComments.length);

      scrapedProduct.numberOfComments = collectedComments.length;

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

        console.log(
          `\nList score of comments ${listOfScoreFromComments.length}`,
        );
        console.log(listOfScoreFromComments);

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
        console.error("No comments found in collectedComments.");
        // Handle the case where there are no comments
      }

      /** 
       * * Product's data structure is completed 
        */
      console.log("\nProduct complete scraping");
      console.log(scrapedProduct);

      // https://www.amazon.com/Tanisa-Organic-Spring-Paper-Wrapper/product-reviews/B07KXPKRNK/ref=cm_cr_arp_d_viewpnt_lft?ie=UTF8&reviewerType=all_reviews&filterByStar=all_stars&pageNumber=1
    } else {
      console.error("Sign-in button not found");
    }
  } catch (error) {}
  // await browser.close();

  try {
  } catch (err) {
    console.log(err);
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
      // product: {
      //   id: ,
      //   asin: string;
      //   name: string;
      //   category: string;
      // };
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
