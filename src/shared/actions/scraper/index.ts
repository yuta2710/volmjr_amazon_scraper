import axios from "axios";
import { BrightDataConfigurations as config } from "../../../cores/scraper";
import * as cheerio from "cheerio";
import https from "https";
import puppeteer from "puppeteer";
import TwoCaptcha from "2captcha-ts";
import { exec } from "child_process";
import path from "path";
import { stderr, stdout } from "process";
import { AssemblyAI } from "assemblyai";
import { extractAsinFromUrl, ProductFieldExtractorFromUrl } from "../pipelines";
// import { PuppeteerCrawler } from 'crawlee';

var TWOCAPCHA_API_KEY = String(process.env.TWOCAPCHA_API_KEY);
var POLLING_INTERVAL = 20;

export async function scrapeAmazonProduct(url: string) {
  if (!url) return;
  const browser = await puppeteer.launch({
    defaultViewport: { width: 800, height: 600 },
    headless: false,
  });

  const page = await browser.newPage();
  await page.goto(url);

  try {
    // const solver = new TwoCaptcha.Solver(TWOCAPCHA_API_KEY)
    const captchaPhotoRemoteUrl = await page.$eval(
      "div.a-row.a-text-center > img",
      (node) => node.getAttribute("src"),
    );

    console.log("\nLink " + captchaPhotoRemoteUrl);
    let captureValue: string;

    if (captchaPhotoRemoteUrl) {
      const executablePath = path.join(
        __dirname,
        "../../../../src/scripts/normal+captcha.py",
      );
      console.log("Executable path: " + executablePath);
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
        console.log(`Result from python file`);
        console.log(captureValue);
        await page.waitForSelector("#captchacharacters");
        await page.type("#captchacharacters", captureValue);
        const button = await page.$(".a-button-text");
        button.click();

        // setTimeout(async () => {
        await page.waitForNavigation({ waitUntil: "domcontentloaded" });

        // }, 2000); // 1000 milliseconds = 1 second
        const signInButton = await page.$("a[data-nav-ref='nav_ya_signin']");
        if (signInButton) {
          await signInButton.click();
          await page.waitForNavigation({ waitUntil: "domcontentloaded" });

          await page.waitForSelector("#ap_email");
          await page.type("#ap_email", "nguyenphucloi2710@gmail.com");
          const continueButton = await page.$("#continue");
          await continueButton.click();

          await page.waitForSelector("#ap_password");
          await page.type("#ap_password", "phucloi2710");

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
              const audioUrl = await page.$eval(
                "source[type='audio/ogg']",
                (el) => el.getAttribute("src"),
              );
              console.log(`This is ${audioUrl}`);
              // Start by making sure the `assemblyai` package is installed.
              // If not, you can install it by running the following command:
              // npm install assemblyai
              console.log("API KEY = ", process.env.ASSEMBLY_AI_API_KEY);
              const client = new AssemblyAI({
                apiKey: String(process.env.ASSEMBLY_AI_API_KEY),
              });

              // Request parameters
              const data = {
                audio_url: audioUrl,
              };

              const run = async () => {
                const transcript = await client.transcripts.transcribe(data);
                console.log(transcript.text);
                return transcript.text;
              };

              // run();
              const processedTranscript = await run();
              const transcriptList = processedTranscript.split(" ");

              console.log(
                "Haha " +
                  transcriptList[transcriptList.length - 1].replace(".", ""),
              );
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
            // console.log(processedTranscript)
          }, 2000);

          // await page.waitForNavigation({ waitUntil: "networkidle2" });

          // const body = await page.evaluate(() => document.body.innerHTML)
          // console.log(body)
          // await page.waitForNavigation({ waitUntil: "domcontentloaded" });

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

          console.log({ asin, title, price, averageRating });

          // // After saved asin, title, price...., navigate to comment page
          const reviewButton = await page.$(".a-link-emphasis.a-text-bold");
          await reviewButton.click();

          await page.waitForNavigation({ waitUntil: "domcontentloaded" });

          setTimeout(async () => {
            const sortByButton = await page.$(
              ".a-button.a-button-dropdown.cr-sort-dropdown",
            );
            await sortByButton.click();

            const mostRecentButton = await page.$("a#sort-order-dropdown_1");
            await mostRecentButton.click();

            await page.waitForNavigation({ waitUntil: "domcontentloaded" });
          }, 2000);

          // await page.waitForNavigation();

          const listOfComments = await page.$$(".review.aok-relative");
          // const listOfComments=  await page.$$(".a-section.a-spacing-none.review-views.celwidget")

          console.log(
            "Length of this list of comments = ",
            listOfComments.length,
          );

          for (let i = 0; i < listOfComments.length; i++) {
            const title = await listOfComments[i].$eval(
              ".a-size-base.a-link-normal.review-title.a-color-base.review-title-content.a-text-bold",
              (el) => el.textContent,
            );
            const description = await listOfComments[i].$eval(
              ".a-size-base.review-text.review-text-content",
              (el) => el.textContent,
            );
            const processedTitle = title
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.length > 0)
              .join(" ");

            console.log({
              processedTitle,
              description: description
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0).join(" "),
            });
          }
          // reviewerType=all_reviews&filterByStar=all_stars&pageNumber=1&sortBy=recent

          // https://www.amazon.com/Tanisa-Organic-Spring-Paper-Wrapper/product-reviews/B07KXPKRNK/ref=cm_cr_arp_d_viewpnt_lft?ie=UTF8&reviewerType=all_reviews&filterByStar=all_stars&pageNumber=1

          // console.log(`Fucking asin = ${asin}`)
          // console.log(`Fucking price = ${price}`)
          // console.log(`Fucking averageRating = ${averageRating}`)
        } else {
          console.error("Sign-in button not found");
        }
        // HHHNLYResolved HHHNLY
      });
    }

    // const result = await solver.imageCaptcha({
    //   body: captchaPhotoRemoteUrl,
    //   numeric: 4,
    //   max_len: 5,
    //   min_len: 5
    // })

    // console.log("\nResult = ", result)
  } catch (error) {}
  // await browser.close();

  try {
  } catch (err) {
    console.log(err);
  }
}

function sleep(ms: any) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
