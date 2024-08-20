import axios from "axios";
import { BrightDataConfigurations as config } from "../../../cores/scraper";
import * as cheerio from "cheerio";
import https from "https";
import puppeteer from "puppeteer";
import TwoCaptcha from "2captcha-ts";
import { exec } from "child_process";
import path from "path";
import { stderr, stdout } from "process";

var TWOCAPCHA_API_KEY = String(process.env.TWOCAPCHA_API_KEY);
var POLLING_INTERVAL = 20;

export async function scrapeAmazonProduct(url: string) {
  if (!url) return;
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 800, height: 600 },
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

        setTimeout(async () => {
          const signInButton = await page.$("a[data-nav-ref='nav_ya_signin']");
          if (signInButton) {
            await signInButton.click();
            await page.waitForNavigation({waitUntil: "domcontentloaded"})

            await page.waitForSelector("#ap_email");
            await page.type("#ap_email", "digivantrix0802.ent@gmail.com");
            const continueButton = await page.$("#continue");
            await continueButton.click()

            await page.waitForSelector("#ap_password");
            await page.type("#ap_password", "phucloi2710");

            const signInSubmitButton = await page.$("#signInSubmit");
            await signInSubmitButton.click()

            await page.waitForNavigation({waitUntil: "domcontentloaded"})
    
            const title = (await page.$("#productTitle"))
            console.log("Fucking title = ", title)  
            
          } else {
            console.error("Sign-in button not found");
          }
        }, 2000); // 1000 milliseconds = 1 second
        
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
