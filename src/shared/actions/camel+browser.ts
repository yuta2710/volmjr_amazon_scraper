import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { filterComparisonPriceTextFromCamel } from "./filter";
import { CamelPriceComparison } from "../types";

// import { connect } from 'puppeteer-real-browser'
puppeteer.use(StealthPlugin());

export const retrieveProductPriceHistoryGroup = async (
  asin: string,
): Promise<CamelPriceComparison> => {
  //instantiate browser
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36");
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });
  //visit target website
  await page.goto(`https://camelcamelcamel.com/product/${asin}`, {
    waitUntil: "load",
  });

  let htmlContentOfPriceComparisonFromCamel = "";
  let priceComparisonFromCamel: CamelPriceComparison = {
    lowestPrice: {
      latestDate: "",
      value: 0
    },
    highestPrice: {
      latestDate: "",
      value: 0
    },
    currentPrice: {
      latestDate: "",
      value: 0
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

  // Return the price comparison data
  return priceComparisonFromCamel;
};
