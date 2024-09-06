"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveProductPriceHistoryGroup = void 0;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const filter_1 = require("./filter");
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
const retrieveProductPriceHistoryGroup = async (asin) => {
    //instantiate browser
    const browser = await puppeteer_extra_1.default.launch({ headless: true });
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
    let priceComparisonFromCamel = {
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
        htmlContentOfPriceComparisonFromCamel = await page.$eval(".table-scroll.camelegend", (el) => el.textContent.trim());
        console.log("Price comparison data:");
        console.log(htmlContentOfPriceComparisonFromCamel);
        if (htmlContentOfPriceComparisonFromCamel) {
            priceComparisonFromCamel = (0, filter_1.filterComparisonPriceTextFromCamel)(htmlContentOfPriceComparisonFromCamel);
        }
    }
    catch (error) {
        console.error("Element not found or page did not load properly in headless mode");
    }
    finally {
        await page.goBack();
        await browser.close();
    }
    // Return the price comparison data
    return priceComparisonFromCamel;
};
exports.retrieveProductPriceHistoryGroup = retrieveProductPriceHistoryGroup;
//# sourceMappingURL=camel+browser.js.map