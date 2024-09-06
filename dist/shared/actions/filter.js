"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterComparisonPriceTextFromCamel = exports.isValidPriceFormat = exports.filterBestSellerRanks = exports.filterQueryType = exports.filterBestSellerRanksInRawContent = exports.filterCategoryAsListByHtml = exports.filterStarRatings = exports.filterLocationAndDateOfCommentItem = exports.filterComponentsOfPrice = exports.filterAsinFromUrl = exports.filterNewlineSeparatedText = exports.FilterProductAttributesFromUrl = void 0;
const category_model_1 = require("../../modules/category/category.model");
var FilterProductAttributesFromUrl;
(function (FilterProductAttributesFromUrl) {
    FilterProductAttributesFromUrl[FilterProductAttributesFromUrl["ASIN"] = 0] = "ASIN";
    FilterProductAttributesFromUrl[FilterProductAttributesFromUrl["NAME"] = 1] = "NAME";
})(FilterProductAttributesFromUrl || (exports.FilterProductAttributesFromUrl = FilterProductAttributesFromUrl = {}));
const filterNewlineSeparatedText = (rawText) => {
    return rawText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join(" ");
};
exports.filterNewlineSeparatedText = filterNewlineSeparatedText;
const filterAsinFromUrl = (url, field) => {
    const regexOfAsin = /\/dp\/([A-Z0-9]+)/;
    const regexOfName = /amazon\.com\/([^\/]+)\/dp\//;
    // Execute the regex on the URL
    let match;
    if (field === FilterProductAttributesFromUrl.ASIN) {
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
exports.filterAsinFromUrl = filterAsinFromUrl;
const filterComponentsOfPrice = (rawData) => {
    return [rawData.split("")[0], parseFloat(rawData.replace("$", "").replace(/,/g, ''))];
};
exports.filterComponentsOfPrice = filterComponentsOfPrice;
const filterLocationAndDateOfCommentItem = (rawData) => {
    const regex = /in (.*?) on (.*)/;
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
exports.filterLocationAndDateOfCommentItem = filterLocationAndDateOfCommentItem;
const filterStarRatings = (rawData) => {
    // Step 1: Extract the star ratings and percentages
    const ratings = rawData.match(/\d star/g);
    const percentages = rawData.match(/\d+%/g);
    // Step 2: Map the star ratings to their corresponding percentages
    const ratingObj = {};
    if (ratings && percentages) {
        ratings.slice(0, 5).forEach((rating, index) => {
            ratingObj[rating] = percentages[index];
        });
    }
    return ratingObj;
};
exports.filterStarRatings = filterStarRatings;
const filterCategoryAsListByHtml = async (categoryContainerSelectorList) => {
    let filtratedCategories = [];
    // Process the data in selector list
    if (categoryContainerSelectorList.length > 0) {
        for (let i = 0; i < categoryContainerSelectorList.length; i++) {
            let categoryText = await categoryContainerSelectorList[i].$eval("span", (el) => el.textContent.trim());
            filtratedCategories.push(categoryText);
        }
    }
    // Remove the special character
    filtratedCategories = filtratedCategories.filter((data) => data !== "›");
    // Setup the 2N rule
    const totalCategoryNode = filtratedCategories.length;
    const STAR_RULE = 1;
    const END_RULE = 2 * totalCategoryNode;
    const categoryHelper = new category_model_1.CategoryHelper();
    // Build the tree of category
    let categoryHierarchy = categoryHelper.buildCategoryHierarchy(filtratedCategories, STAR_RULE, END_RULE);
    return categoryHierarchy;
};
exports.filterCategoryAsListByHtml = filterCategoryAsListByHtml;
const filterBestSellerRanksInRawContent = (queryProductDetailsContainerRawText) => {
    let bestSellerRankJson = {
        heading: "",
        attributeVal: "",
    };
    const bestSellerRankRegex = /Best Sellers Rank:\s*([^]+?)\s*Customer Reviews:/;
    // Match the text and extract the Best Sellers Rank information
    const matches = queryProductDetailsContainerRawText.match(bestSellerRankRegex);
    if (matches && matches[1]) {
        bestSellerRankJson.heading = "Best Sellers Rank";
        bestSellerRankJson.attributeVal = matches[1].trim();
    }
    return bestSellerRankJson;
};
exports.filterBestSellerRanksInRawContent = filterBestSellerRanksInRawContent;
const filterQueryType = (url) => {
    const regex = /(?:pageNumber=(\d+))|(?:reviewerType=([^&]+))|(?:sortBy=([^&]+))/g;
    const matches = Array.from(url.matchAll(regex));
    const params = {
        pageNumber: null,
        reviewerType: null,
        sortBy: null,
    };
    matches.forEach((match) => {
        if (match[1]) {
            params.pageNumber = Number(match[1]);
        }
        if (match[2]) {
            params.reviewerType = match[2];
        }
        if (match[3]) {
            params.sortBy = match[3];
        }
    });
    return params;
};
exports.filterQueryType = filterQueryType;
const filterBestSellerRanks = (data) => {
    let filteredBestSellerRankings = data.map((rankString) => {
        const rankMatch = rankString.match(/#([\d,]+)/); // Updated regex to capture digits and commas
        const categoryMatch = rankString.match(/in\s+(.+?)(\s+\(See Top 100|\s*$)/);
        if (rankMatch && rankMatch[1]) {
            const rankNumeric = parseInt(rankMatch[1].replace(/,/g, ''), 10); // Remove commas before converting
            console.log(`Rank value: #${rankNumeric}`);
        }
        if (categoryMatch && categoryMatch[1]) {
            console.log(`Category value: ${categoryMatch[1].trim()}`);
        }
        return {
            rank: rankMatch ? `#${rankMatch[1].replace(/,/g, '')}` : "", // Store the rank with commas removed
            categoryMarket: categoryMatch ? categoryMatch[1].trim() : "",
        };
    });
    filteredBestSellerRankings =
        filteredBestSellerRankings.length > 0
            ? filteredBestSellerRankings.filter((category) => category.rank !== "" && category.categoryMarket !== "")
            : [{ rank: "", categoryMarket: "" }];
    return filteredBestSellerRankings;
};
exports.filterBestSellerRanks = filterBestSellerRanks;
const isValidPriceFormat = (priceStr) => {
    // Regex to match the format "$1,299.95"
    const priceRegex = /^\$\d{1,3}(,\d{3})*(\.\d{2})?$/;
    // Test the string against the regex
    return priceRegex.test(priceStr);
};
exports.isValidPriceFormat = isValidPriceFormat;
const filterComparisonPriceTextFromCamel = (htmlRawText) => {
    const regex = /Amazon\s+\$([\d,.]+)[\s\S]*?\$([\d,.]+)[\s\S]*?\$([\d,.]+)[\s\S]*?\$([\d,.]+)/;
    const match = htmlRawText.match(regex);
    if (match) {
        const result = {
            lowestPrice: parseFloat(match[1].replace(/,/g, '')),
            highestPrice: parseFloat(match[2].replace(/,/g, '')),
            averagePrice: parseFloat(match[3].replace(/,/g, '')),
            currentPrice: parseFloat(match[4].replace(/,/g, '')),
        };
        console.log("Result of price");
        console.log(result);
        return result;
    }
    else {
        console.log("No match found.");
    }
};
exports.filterComparisonPriceTextFromCamel = filterComparisonPriceTextFromCamel;
//# sourceMappingURL=filter.js.map