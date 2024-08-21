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

          // setTimeout(async () => {
          //   const changeToAudioCaptchaButton = await page.$(
          //     "a.a-link-normal.cvf-widget-link-alternative-captcha.cvf-widget-btn-val.cvf-widget-link-disable-target.captcha_refresh_link",
          //   );
          //   await changeToAudioCaptchaButton.click();

          //   await page.waitForNavigation({ waitUntil: "domcontentloaded" });
          //   const audioUrl = await page.$eval("source[type='audio/ogg']", (el) =>
          //     el.getAttribute("src"),
          //   );
          //   console.log(`This is ${audioUrl}`);
          //   // Start by making sure the `assemblyai` package is installed.
          //   // If not, you can install it by running the following command:
          //   // npm install assemblyai
          //   console.log("API KEY = ", process.env.ASSEMBLY_AI_API_KEY)
          //   const client = new AssemblyAI({
          //     apiKey: String(process.env.ASSEMBLY_AI_API_KEY),
          //   });

          //   // Request parameters
          //   const data = {
          //     audio_url: audioUrl,
          //   };

          //   const run = async () => {
          //     const transcript = await client.transcripts.transcribe(data);
          //     console.log(transcript.text);
          //     return transcript.text
          //   };

          //   // run();
          //   const processedTranscript = await run();
          //   const transcriptList = processedTranscript.split(" ")
            
          //   console.log("Haha " + transcriptList[transcriptList.length - 1].replace(".", ""))
          //   const processedAudioCaptchaValue = transcriptList[transcriptList.length - 1].replace(".", "");
            
          //   await page.waitForSelector(".a-input-text.a-span12.cvf-widget-input.cvf-widget-input-code.cvf-widget-input-captcha.fwcim-captcha-guess");
          //   await page.type(".a-input-text.a-span12.cvf-widget-input.cvf-widget-input-code.cvf-widget-input-captcha.fwcim-captcha-guess", processedAudioCaptchaValue)

          //   const continueButton = await page.$(".a-button.a-button-span12.a-button-primary.cvf-widget-btn-captcha.cvf-widget-btn-verify-captcha")
          //   await continueButton.click();
          //   // console.log(processedTranscript)
          // }, 2000);

          // await page.waitForNavigation({ waitUntil: "networkidle2" });

          // const body = await page.evaluate(() => document.body.innerHTML)
          // console.log(body)
          // const title = (await page.$eval("#productTitle", span => span.textContent)).trim()
          // await page.waitForSelector("span", {timeout: 5_000})
          const price = (await page.$eval(".a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay", el => el.textContent)).trim()
          
          console.log(`Fucking price = ${price}`)
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
