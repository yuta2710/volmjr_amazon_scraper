import puppeteer, { ElementHandle, Page } from "puppeteer";
import { exec } from "child_process";
import path from "path";
import { AssemblyAI } from "assemblyai";
import {
  filterAsinFromUrl,
  filterLocationAndDateOfCommentItem,
  filterStarRatings,
  filterNewlineSeparatedText,
  FilterProductAttributesFromUrl,
  filterComponentsOfPrice,
  filterCategoryAsListByHtml,
  filterQueryType,
} from "./filter";
import { analyzeSentiment, analyzeEmotionByScore } from "./analyze";
import {
  BaseProduct,
  CommentItem,
  AmazonScrapedResponse,
} from "@/modules/products/product.types";
import {
  CategoryHelper,
  CategoryNode,
} from "../../modules/category/category.model";
import { GREEN, RESET } from "../constants";

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
    // headless: Boolean(process.env.HEADLESS_MODE),
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto(url).catch(console.error);

  /**
   * TODO: ============================================================= [AUTHENTICATION] - check Captcha Audio verification if it requires ============================================================= */
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

          console.log("Normal captcha solved and form submitted.");
        });
      } else {
        console.error("Normal captcha not detected, proceeding to login...");
      }
    } catch (err) {
      console.error("Error handling normal captcha:", err.message);
    }
  }
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
        console.error("Captcha Audio not detected, continuing...");
        // If captcha is not detected, proceed as normal
      } else {
        console.error("Error handling audio captcha:", err.message);
        // Handle other errors as needed, possibly retry or log them
      }
    }
  }

  /**
   * TODO: ============================================================= Attepmt sign in more times =============================================================
   */
  async function attemptSignIn() {
    try {
      await page.waitForSelector("a[data-nav-ref='nav_ya_signin']", {
        timeout: 10000, // wait up to 10 seconds
      });
      const signInButton = await page.$("a[data-nav-ref='nav_ya_signin']");

      if (signInButton) {
        await signInButton.click().catch(console.error);
        await page
          .waitForNavigation({ waitUntil: "domcontentloaded" })
          .catch(console.error);

        await page.waitForSelector("#ap_email").catch(console.error);
        await page
          .type("#ap_email", String(process.env.AMAZON_ACCOUNT_EMAIL))
          .catch(console.error);
        const continueButton = await page.$("#continue").catch(console.error);
        if (continueButton) {
          await continueButton.click().catch(console.error);
        } else {
          console.error("Continue button not found");
        }

        await page.waitForSelector("#ap_password").catch(console.error);
        await page
          .type("#ap_password", String(process.env.AMAZON_ACCOUNT_PASSWORD))
          .catch(console.error);

        const signInSubmitButton = await page
          .$("#signInSubmit")
          .catch(console.error);
        if (signInSubmitButton) {
          await signInSubmitButton.click().catch(console.error);
          await page
            .waitForNavigation({ waitUntil: "domcontentloaded" })
            .catch(console.error);
        } else {
          console.error("Sign-in submit button not found");
        }

        // Call the captcha check function after sign-in attempt
        await checkAndHandleCaptchaAudio();
      } else {
        console.error("Sign-in button not found");
      }
    } catch (err) {
      console.error("Error during sign-in attempt:", err.message);
    }
  }

  await checkAndSolveNormalCaptcha();

  // Attempt sign-in with retries
  let signInAttempts = 3;
  let signedIn = false;

  while (signInAttempts > 0 && !signedIn) {
    try {
      await attemptSignIn();
      signedIn = true;
    } catch (error) {
      console.error(
        `Sign-in attempt failed: ${error.message}. Retries left: ${signInAttempts - 1}`,
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
  let categoryContainerSelectorList = await page.$$(
    "#wayfinding-breadcrumbs_feature_div ul > li",
  );
  // Build the tree of category
  let categoryHierarchy: CategoryNode = await filterCategoryAsListByHtml(
    categoryContainerSelectorList as ElementHandle<HTMLLIElement>[],
  );
  categoryHierarchy.displayHierarchyAsJSON();

  const scrapedProduct: BaseProduct =
    await collectProductDataExceptForeignField(page);

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

          // Explicitly wait for an expected element on the comments page
          await page.waitForSelector(".a-section.review", { timeout: 5000 });

          success = true; // If navigation and element detection succeed, break out of the loop
          console.log(GREEN + "Success retry" + RESET);
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
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Add a small delay between retries
        }
      }

      /**
       * TODO: ============================================================= Steps to scrape the comments ============================================================= */
      const collectedComments: CommentItem[] =
        await scrapeCommentsRecursively(page);
      console.log("Total collected comments:", collectedComments.length);

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

        const listOfScoreFromComments = collectedComments.map(
          (comment: CommentItem) => comment.sentiment.score,
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
}

async function collectProductDataExceptForeignField(
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

  console.error(`Is Amazon Choice: ${isAmazonChoice}`);

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
      currency = filterComponentsOfPrice(currentPrice)[0] as string;
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
    console.error("\nPrice element not found or unable to extract price:");
    originalPrice = "";
    originalPriceMetric = 0;
  }

  // Average rating of product
  const averageRatingText = await page.$eval(
    ".a-icon-alt",
    (el) => el.textContent,
  );

  const filtratedAverageRatingMetric = Number(averageRatingText.split(" ")[0]);

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
  const filtratedHistogramItems = filterStarRatings(rawRatingStars as string);

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

  const bestSellerRankJson = await getBestSellerRankByHtmlElement(page);
  console.error("\n\nBest seller ranks test code = ", bestSellerRankJson);

  const bestSellerRankAttributeArr: string[] =
    bestSellerRankJson["attributeVal"].split("   ");

  console.log("\nBest Seller Rank Array Attribute Values");
  console.log(bestSellerRankAttributeArr);

  const image = (await page.$eval("img#landingImage", (el) =>
    el.getAttribute("src"),
  )) as string;

  collectedProduct = {
    asin,
    title,
    price: {
      amount: filterComponentsOfPrice(currentPrice)[1] as number,
      currency,
      displayAmount: String(currentPrice),
      currentPrice: filterComponentsOfPrice(currentPrice)[1] as number,
      originalPrice: originalPriceMetric,
      highestPrice: originalPriceMetric,
      lowestPrice: filterComponentsOfPrice(currentPrice)[1] as number,
      savings: {
        percentage: percentage !== undefined ? percentage : "",
        currency,
        displayAmount: String(currentPrice),
        amount: filterComponentsOfPrice(currentPrice)[1] as number,
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

  return collectedProduct;
}

/**
 * * Get best seller ranks from dynamic HTML Element .
 * TODO: Get best seller ranks by dynamic UI.
 * @param {Page} page - The Puppeteer page object representing the current browser tab.
 * @returns {Promise<any[]>} A promise that resolves to the array of all collected comments.
 */
async function getBestSellerRankByHtmlElement(page: Page): Promise<{
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
      const bestSellerRankJson = {
        heading: "Best Sellers Rank",
        attributeVal: bestSellerRankText,
      };
      // console.log(bestSellerRankJson);
      return bestSellerRankJson;
    } else {
      console.log("Best Sellers Rank not found.");
    }
  } catch (error) {
    console.error("Error processing <ul> tag for Best Seller Ranks:");
  }

  // If the <ul> tag doesn't contain the Best Sellers Rank, check the <table> tag
  try {
    const queryProductDetailsContainerRawText = await page.$eval(
      ".a-keyvalue.prodDetTable:nth-child(1)",
      (el) => el.textContent.trim(),
    );

    const bestSellerRankMatch = queryProductDetailsContainerRawText.match(
      /Best Sellers Rank\s+(#\d+[\s\S]+?)(?=\s+Date First Available)/,
    );

    if (bestSellerRankMatch) {
      bestSellerRankJson = {
        heading: "Best Sellers Rank",
        attributeVal: bestSellerRankMatch[1].trim(),
      };
    }

    return bestSellerRankJson;
  } catch (error) {
    console.error("Error processing <table> tag for Best Seller Ranks");
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

  console.error(
    "\nLength of this list of comments = ",
    queryListOfComments.length,
  );
  console.log("Comment URL of the page ", page.url());

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

    const filtratedDescription = filterNewlineSeparatedText(
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
    const filtratedLocationAndDateAsList = filterLocationAndDateOfCommentItem(
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

  let prevButtonSelector;

  let prevPage = {
    url: "" as string,
    metric: 1 as number,
  };
  let nextPage = {
    url: "" as string,
    metric: 1 as number,
  };

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
  const nextButtonClass = await page.$eval(
    ".a-pagination li:nth-child(2)",
    (el) => el.getAttribute("class"),
  );

  // If next button is not disabled
  // If the next button is not disabled
  if (!nextButtonClass.includes("a-disabled a-last")) {
    let nextPageUrl: string = await page.$eval(
      ".a-pagination li:nth-child(2) a",
      (el) => el.getAttribute("href"),
    );
    nextPageUrl = `https://${String(process.env.AMAZON_DOMAIN)}${nextPageUrl}`;
    const nextPageMetric = filterQueryType(String(nextPageUrl))[
      "pageNumber"
    ] as number;

    nextPage = {
      url: nextPageUrl,
      metric: nextPageMetric,
    };
  }

  const currentPage = filterQueryType(String(page.url()))[
    "pageNumber"
  ] as number;

  collectedComments = collectedComments.map((comment: CommentItem) => ({
    ...comment,
    pagination: {
      totalRecords: queryListOfComments.length,
      currentPage,
      nextPage:
        nextPage.url && nextPage.metric ? nextPage : { url: "", metric: 1 },
      prevPage:
        prevPage.url && prevPage.metric ? prevPage : { url: "", metric: 1 },
    },
  }));

  console.error("Next page object");
  console.log(nextPage);

  if (nextPage.url) {
    await page.goto(nextPage.url);

    // Recursive call to scrape the next page
    return scrapeCommentsRecursively(page, collectedComments);
  } else {
    // No more pages, return collected comments
    return collectedComments;
  }
}
