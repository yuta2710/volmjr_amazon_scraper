// import puppeteer from "puppeteer-extra";
// import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { filterComparisonPriceTextFromCamel } from "./filter";
import { CamelPriceComparison } from "../types";
import { ConsoleMessage, launch } from "puppeteer";
import { Solver } from "@2captcha/captcha-solver";
import { readFileSync } from "fs";
import { normalizeUserAgent } from "../../scripts/normalize-ua";
import path from "path";

const solver = new Solver("d3e4290357b4ddff3a7ba2aa18d5af72");

export const retrieveProductPriceHistoryGroup = async (
  asin: string,
): Promise<CamelPriceComparison> => {
  //instantiate browser
  const initialUserAgent = await normalizeUserAgent();

  const browser = await launch({
    headless: true,
    devtools: true,
    args: [`--user-agent=${initialUserAgent}`],
  });

  const [page] = await browser.pages();
  const preloadFile = readFileSync(path.join(__dirname, "../../scripts/inject.js"), "utf8");
  await page.evaluateOnNewDocument(preloadFile);
  // const browser = await puppeteer.launch({ headless: false });
  // const page = await browser.newPage();

  page.on("console", async (msg: ConsoleMessage) => {
    const txt = msg.text();
    if (txt.includes("intercepted-params:")) {
      const params = JSON.parse(txt.replace("intercepted-params:", ""));
      console.log(params);

      try {
        console.log(`Solving the captcha...`);
        const res = await solver.cloudflareTurnstile(params);
        console.log(`Solved the captcha ${res.id}`);
        console.log(res);

        await page.evaluate((token) => {
          console.log("Token " + token)
        }, res.data);
      } catch (e) {
        console.log(e.err);
        return process.exit();
      }
    } else {
      return;
    }
  });
  //visit target website
  await page.goto(`https://camelcamelcamel.com/product/${asin}`, {
    waitUntil: "load",
  });

  let htmlContentOfPriceComparisonFromCamel = "";
  let priceComparisonFromCamel: CamelPriceComparison = {
    lowestPrice: {
      latestDate: "",
      value: 0,
    },
    highestPrice: {
      latestDate: "",
      value: 0,
    },
    currentPrice: {
      latestDate: "",
      value: 0,
    },
    averagePrice: 0,
  };

  try {
    // Wait until the element exists in the DOM
    await page.waitForSelector(".table-scroll.camelegend", {
      timeout: 10000,
    });

    // Then try to select the content
    htmlContentOfPriceComparisonFromCamel = await page.$eval(
      ".table-scroll.camelegend",
      (el) => el.textContent.trim(),
    );

    if (htmlContentOfPriceComparisonFromCamel) {
      priceComparisonFromCamel = filterComparisonPriceTextFromCamel(
        htmlContentOfPriceComparisonFromCamel,
      ) as CamelPriceComparison;
    }
  } catch (error) {
    console.error(
      "Element not found or page did not load properly in headless mode",
    );
  } finally {
    await page.goBack();
    await browser.close();
  }

  console.log(priceComparisonFromCamel)

  // Return the price comparison data
  return priceComparisonFromCamel;
};
