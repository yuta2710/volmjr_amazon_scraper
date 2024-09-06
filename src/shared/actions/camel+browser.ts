import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { filterComparisonPriceTextFromCamel } from "./filter";
import { CamelPriceComparison } from "../types";

puppeteer.use(StealthPlugin());

export const retrieveProductPriceHistoryGroup = async (
  asin: string,
): Promise<CamelPriceComparison> => {
  //instantiate browser
  const browser = await puppeteer.launch({ headless: true });

  //launch new page
  const page = await browser.newPage();

  //visit target website
  await page.goto(`https://camelcamelcamel.com/product/${asin}`, {
    waitUntil: "load",
  });
  const html = await page.$eval("body", (el) => el.textContent.trim());

  console.log("HTML Content");
  console.log(html);

  let htmlContentOfPriceComparisonFromCamel = "";
  let priceComparisonFromCamel: CamelPriceComparison = {
    lowestPrice: 0,
    highestPrice: 0,
    averagePrice: 0,
    currentPrice: 0,
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

    console.log("Price comparison data:");
    console.log(htmlContentOfPriceComparisonFromCamel);

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
