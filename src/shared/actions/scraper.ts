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
} from "./pipeline";
import { setTimeout as delayPage } from "node:timers/promises";
import { BaseProduct } from "@/modules/products/product.types";
import * as util from "util";

export async function scrapeAmazonProduct(url: string) {
  if (!url) return;
  const browser = await puppeteer.launch({
    headless: true,
    // defaultViewport: null,
    // args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.goto(url);

  // Step solving normal captcha when we set headless = false for debugging
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

    // Step to sign in
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

      // Step to solve Captcha Audio
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
        await page.waitForNavigation({ waitUntil: "domcontentloaded" });
      }

      /** Scrape the main data of the products */
      const asin = extractAsinFromUrl(
        page.url(),
        ProductFieldExtractorFromUrl.ASIN,
      );

      const title = (
        await page.$eval("#productTitle", (span) => span.textContent)
      ).trim();

      const price = (
        await page.$eval(
          ".a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay",
          (el) => el.textContent,
        )
      ).trim();

      const currency = price.split("")[0];

      const averageRatingText = await page.$eval(
        ".a-icon-alt",
        (el) => el.textContent,
      );

      const filteredAverageRatingMetric = Number(
        averageRatingText.split(" ")[0],
      );
      const deliveryLocation = (
        await page.$eval(
          "span.nav-line-2.nav-progressive-content",
          (el) => el.textContent,
        )
      ).trim();

      const retailerName = (
        await page.$eval("#sellerProfileTriggerId", (el) => el.textContent)
      ).trim();

      const salesVolumeLastMonth = await (
        await page.$eval(
          "span.a-size-small.social-proofing-faceout-title-text",
          (el) => el.textContent,
        )
      ).trim();
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
      const filteredHistogramItems = processStarRatings(
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
      // console.log(`\nHistogram Mapper have ${historamItemMapper.length} result`)
      console.log(`Metric of average rating = ${filteredAverageRatingMetric}`);

      const scrapedProduct: BaseProduct = {
        asin,
        title,
        price: {
          amount: Number(price.replace("$", "")),
          currency,
          displayAmount: String(price),
          currentPrice: Number(price.replace("$", "")),
          originalPrice: Number(price.replace("$", "")),
          highestPrice: Number(price.replace("$", "")),
          lowestPrice: Number(price.replace("$", "")),
        },
        histogram: filteredHistogramItems,
        averageRating: filteredAverageRatingMetric,
        salesVolumeLastMonth,
        deliveryLocation,
        retailer: retailerName,
        businessTargetForCollecting: "amazon",
        url: String(page.url()),
        category: selectedOption,
      };

      // // After saved asin, title, price...., navigate to comment page
      const reviewButton = await page.$(".a-link-emphasis.a-text-bold");
      await reviewButton.click();

      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      const comment_url = page.url() + "&sortBy=recent&pageNumber=1";
      console.log("After navigate = ", comment_url);
      await page.goto(comment_url);

      // Set wating for the page fully loaded
      await page.reload();
      const collectedComments = await scrapeCommentsRecursively(page);
      console.log("\nCollected comments");
      console.log(collectedComments);
      console.log("Total collected comments:", collectedComments.length);
      scrapedProduct.numberOfComments = collectedComments.length;

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

async function scrapeCommentsRecursively(
  page: Page,
  collectedComments: any = [],
) {
  // await delayPage(2000);
  const commentContainer = await page.$(
    ".a-section.a-spacing-none.reviews-content.a-size-base",
  );
  const listOfComments = await commentContainer.$$("div[data-hook='review']");

  console.log("Length of this list of comments = ", listOfComments.length);

  for (let i = 0; i < listOfComments.length; i++) {
    const titleAndRatingRawSelector = await listOfComments[i].$eval(
      ".a-size-base.a-link-normal.review-title.a-color-base.review-title-content.a-text-bold",
      (el) => el.textContent,
    );
    const currentUrlOfComment = await listOfComments[i].$eval(
      ".a-size-base.a-link-normal.review-title.a-color-base.review-title-content.a-text-bold",
      (el) => el.getAttribute("href"),
    );
    const description = await listOfComments[i].$eval(
      ".a-size-base.review-text.review-text-content",
      (el) => el.textContent,
    );
    const filteredTitleAndRating = (titleAndRatingRawSelector as string)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const filteredDescription = processNewlineSeparatedText(
      description as string,
    );

    const verifiedPurchase = await listOfComments[i].evaluate(() => {
      const el = document.querySelector(
        ".a-size-mini.a-color-state.a-text-bold",
      );
      return el ? el.textContent : "";
    });

    let helpfulCount = null;

    try {
      helpfulCount = await listOfComments[i].$eval(
        "span[data-hook='helpful-vote-statement']",
        (el) => el.textContent,
      );
    } catch (error) {
      helpfulCount = "Unknown";
    }
    let locationAndDateRaw = await listOfComments[i].$eval(
      "span[data-hook='review-date']",
      (el) => el.textContent,
    );
    let filteredLocationAndDate =
      extractCommendLocationAndDate(locationAndDateRaw);

    // let filtratedDescription =
    console.log("\nFiltered started");

    const sentimentTitle = analyzeSentiment(filteredTitleAndRating[1].trim())
    const sentimentDescription = analyzeSentiment(filteredDescription.trim())

    const averageSentimentScore: number = (Number(sentimentTitle["score"]) + Number(sentimentDescription["score"]) / 2)
    const averageEmotion: string = analyzeEmotionByScore(averageSentimentScore as number);

    collectedComments.push({
      rating: filteredTitleAndRating[0].trim(),
      title: filteredTitleAndRating[1].trim(),
      content: filteredDescription,
      verifiedPurchase,
      helpfulCount,
      location: filteredLocationAndDate[0],
      date: filteredLocationAndDate[1],
      state: locationAndDateRaw,
      url: currentUrlOfComment,
      sentiment: {
        score: averageSentimentScore,
        emotion: averageEmotion
      }
    });
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
