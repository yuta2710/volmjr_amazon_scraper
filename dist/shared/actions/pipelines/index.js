"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCommendLocationAndDate = exports.extractAsinFromUrl = exports.processNewlineSeparatedText = exports.getUrlComponents = exports.ProductFieldExtractorFromUrl = void 0;
var ProductFieldExtractorFromUrl;
(function (ProductFieldExtractorFromUrl) {
    ProductFieldExtractorFromUrl[ProductFieldExtractorFromUrl["ASIN"] = 0] = "ASIN";
    ProductFieldExtractorFromUrl[ProductFieldExtractorFromUrl["NAME"] = 1] = "NAME";
})(ProductFieldExtractorFromUrl || (exports.ProductFieldExtractorFromUrl = ProductFieldExtractorFromUrl = {}));
const getUrlComponents = (url) => {
    // const url = "https://www.amazon.com/Tanisa-Organic-Spring-Paper-Wrapper/product-reviews/B07KXPKRNK/ref=cm_cr_arp_d_viewopt_srt?ie=UTF8&reviewerType=all_reviews&sortBy=recent&pageNumber=1";
    // Find the index of "?ie=UTF8"
    const splitIndex = url.indexOf("?ie=UTF8");
    // Split the URL into two parts: before and after "?ie=UTF8"
    if (splitIndex !== -1) {
        const part1 = url.substring(0, splitIndex + 8); // Include "?ie=UTF8" in part1
        const part2 = url.substring(splitIndex + 8); // Get the rest of the URL after "?ie=UTF8"
        const resultArray = [part1, part2];
        console.log(resultArray);
        // Output: ["https://www.amazon.com/Tanisa-Organic-Spring-Paper-Wrapper/product-reviews/B07KXPKRNK/ref=cm_cr_arp_d_viewopt_srt?ie=UTF8", "&sortBy=recent&pageNumber=1"]
    }
    else {
        console.log("No match found");
    }
};
exports.getUrlComponents = getUrlComponents;
const processNewlineSeparatedText = (rawText) => {
    return rawText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join(" ");
};
exports.processNewlineSeparatedText = processNewlineSeparatedText;
const extractAsinFromUrl = (url, field) => {
    const regexOfAsin = /\/dp\/([A-Z0-9]+)/;
    const regexOfName = /amazon\.com\/([^\/]+)\/dp\//;
    // Execute the regex on the URL
    let match;
    if (field === ProductFieldExtractorFromUrl.ASIN) {
        match = url.match(regexOfAsin);
    }
    else {
        match = url.match(regexOfName);
    }
    if (match) {
        return match[1];
    }
    else {
        console.log("No match found");
    }
};
exports.extractAsinFromUrl = extractAsinFromUrl;
const extractCommendLocationAndDate = (rawData) => {
    const regex = /in the (.*?) on (.*)/;
    const match = rawData.match(regex);
    if (match) {
        const country = match[1]; // "United States"
        const date = match[2]; // "March 1, 2023"
        const resultArray = [country, date];
        return resultArray; // Output: ["United States", "March 1, 2023"]
    }
    else {
        console.log("No match found");
    }
};
exports.extractCommendLocationAndDate = extractCommendLocationAndDate;
//# sourceMappingURL=index.js.map