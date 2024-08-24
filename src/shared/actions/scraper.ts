import puppeteer from "puppeteer";
import { exec } from "child_process";
import path from "path";
import { AssemblyAI } from "assemblyai";
import {
  extractAsinFromUrl,
  extractCommendLocationAndDate,
  processNewlineSeparatedText,
  ProductFieldExtractorFromUrl,
} from "./pipeline";

export async function scrapeAmazonProduct(url: string) {
  if (!url) return;
  const browser = await puppeteer.launch({
    headless: true,
  });

  const page = await browser.newPage();
  // await page.evaluateOnNewDocument(() => {
  //   Object.defineProperty(navigator, 'webdriver', {
  //     get: () => false,
  //   });
  // });
  // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.goto(url);

  // Step solving normal captcha when we set headless = false for debugging
  try {
    // const captchaPhotoRemoteUrl = await page.$eval(
    //   "div.a-row.a-text-center > img",
    //   (node) => node.getAttribute("src"),
    // );

    // console.log("\nLink " + captchaPhotoRemoteUrl);
    // let captureValue: string;

    // if (captchaPhotoRemoteUrl) {
    //   const executablePath = path.join(
    //     __dirname,
    //     "../../../src/scripts/normal+captcha.py",
    //   );
    //   console.log("Executable path: " + executablePath);
    //   const command = `python ${executablePath} ${captchaPhotoRemoteUrl}`;

    //   exec(command, async (error, stdout, stderr) => {
    //     if (error) {
    //       console.error(`Error: ${error.message}`);
    //       return;
    //     }
    //     if (stderr) {
    //       console.error(`stderr: ${stderr}`);
    //       return;
    //     }
    //     captureValue = stdout.trim();
    //     console.log(`Result from python file`);
    //     console.log(captureValue);

    //     await page.waitForSelector("#captchacharacters");
    //     await page.type("#captchacharacters", captureValue);

    //     const button = await page.$(".a-button-text");
    //     button.click();

    //     await page.waitForNavigation({ waitUntil: "domcontentloaded" });
    //   });
    // }
    // await page.waitForNavigation({ waitUntil: "domcontentloaded" });

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
      await page.type("#ap_password", String(process.env.AMAZON_ACCOUNT_PASSWORD));

      const signInSubmitButton = await page.$("#signInSubmit");
      await signInSubmitButton.click();

      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      setTimeout(async () => {
        const changeToAudioCaptchaButton = await page.$(
          "a.a-link-normal.cvf-widget-link-alternative-captcha.cvf-widget-btn-val.cvf-widget-link-disable-target.captcha_refresh_link",
        );
        if (changeToAudioCaptchaButton) {
          await changeToAudioCaptchaButton.click();

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
      }, 2000);

      /** Scrape the main data of the products */
      const asin = extractAsinFromUrl(
        page.url(),
        ProductFieldExtractorFromUrl.ASIN,
      );
      const title = (
        await page.$eval("#productTitle", (span) => span.textContent)
      ).trim();
      // await page.waitForSelector("span", {timeout: 5_000})
      const price = (
        await page.$eval(
          ".a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay",
          (el) => el.textContent,
        )
      ).trim();
      const averageRating = await page.$eval(
        ".a-icon-alt",
        (el) => el.textContent,
      );
      const deliveryLocation = (
        await page.$eval(
          "span.nav-line-2.nav-progressive-content",
          (el) => el.textContent,
        )
      ).trim();
      const retailerName = (await page.$eval("#sellerProfileTriggerId", el => el.textContent)).trim()
      const salesVolumeLastMonth = await (
        await page.$eval(
          "span.a-size-small.social-proofing-faceout-title-text",
          (el) => el.textContent,
        )
      ).trim();
      console.log({
        asin,
        title,
        price,
        averageRating,
        salesVolumeLastMonth,
        deliveryLocation,
        retailer: retailerName
      });

      // // After saved asin, title, price...., navigate to comment page
      const reviewButton = await page.$(".a-link-emphasis.a-text-bold");
      await reviewButton.click();

      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      const comment_url = page.url() + "&sortBy=recent&pageNumber=1";
      console.log("After navigate = ", comment_url);
      await page.goto(comment_url);

      /** Scrape the comments steps */
      // const listOfComments = await page.$$(".review.aok-relative");
      try {
        const commentContainer = await page.$(
          ".a-section.a-spacing-none.reviews-content.a-size-base",
        );
        const listOfComments = await commentContainer.$$(
          "div[data-hook='review']",
        );
        console.log(
          "Length of this list of comments = ",
          listOfComments.length,
        );

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
          const verifiedPurchase =
            (await listOfComments[i].$eval(
              ".a-size-mini.a-color-state.a-text-bold",
              (el) => el.textContent,
            )) !== "";
          let helpfulCount = null;

          try {
            helpfulCount = await listOfComments[i].$eval(
              "span[data-hook='helpful-vote-statement']",
              (el) => el.textContent,
            );
            // await page.waitForSelector("span[data-hook='review-date']", {timeout: 10_000})
          } catch (error) {
            helpfulCount = "Unknown";
          }
          let locationAndDateRaw = await listOfComments[i].$eval(
            "span[data-hook='review-date']",
            (el) => el.textContent,
          );
          let filteredLocationAndDate =
            extractCommendLocationAndDate(locationAndDateRaw);

          console.log({
            rating: filteredTitleAndRating[0].trim(),
            title: filteredTitleAndRating[1].trim(),
            content: filteredDescription,
            verifiedPurchase,
            helpfulCount,
            location: filteredLocationAndDate[0],
            date: filteredLocationAndDate[1],
            state: locationAndDateRaw,
            url: currentUrlOfComment,
          });
        }
      } catch (error) {
        console.log(error);
      }
      // reviewerType=all_reviews&filterByStar=all_stars&pageNumber=1&sortBy=recent

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
