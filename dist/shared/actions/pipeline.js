"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeEmotionByScore = exports.analyzeSentiment = exports.filtrateData = exports.processStarRatings = exports.extractCommendLocationAndDate = exports.extractComponentsOfPrice = exports.extractAsinFromUrl = exports.processNewlineSeparatedText = exports.getUrlComponents = exports.ProductFieldExtractorFromUrl = void 0;
const constants_1 = require("../constants");
const natural = __importStar(require("natural"));
const stopword = __importStar(require("stopword"));
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
const extractComponentsOfPrice = (rawData) => {
    return [rawData.split("")[0], Number(rawData.replace("$", ""))];
};
exports.extractComponentsOfPrice = extractComponentsOfPrice;
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
const processStarRatings = (rawData) => {
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
exports.processStarRatings = processStarRatings;
// Contractions to standard lexicons Conversion
const convertToStandard = (text) => {
    const data = text.split(" ");
    data.forEach((word, index) => {
        Object.keys(constants_1.WORD_DICT).forEach((key) => {
            if (key === word.toLowerCase()) {
                data[index] = constants_1.WORD_DICT[key];
            }
        });
    });
    return data.join(" ");
};
// LowerCase Conversion
const convertTolowerCase = (text) => {
    return text.toLowerCase();
};
// Pure Alphabets extraction
const removeNonAlpha = (text) => {
    // This specific Regex means that replace all
    //non alphabets with empty string.
    return text.replace(/[^a-zA-Z\s]+/g, "");
};
const filtrateData = (data) => {
    const lexData = convertToStandard(data);
    console.log("Lexed Data: ", lexData);
    // Convert all data to lowercase
    const lowerCaseData = convertTolowerCase(lexData);
    console.log("LowerCase Format: ", lowerCaseData);
    // Remove non alphabets and special characters
    const onlyAlpha = removeNonAlpha(lowerCaseData);
    console.log("OnlyAlpha: ", onlyAlpha);
    // Tokenization
    const tokenConstructor = new natural.WordTokenizer();
    const tokenizedData = tokenConstructor.tokenize(onlyAlpha);
    console.log("Tokenized Data: ", tokenizedData);
    // Remove Stopwords
    const filteredData = stopword.removeStopwords(tokenizedData);
    console.log("After removing stopwords: ", filteredData);
};
exports.filtrateData = filtrateData;
const analyzeSentiment = (data) => {
    const lexData = convertToStandard(data);
    // Convert all data to lowercase
    const lowerCaseData = convertTolowerCase(lexData);
    // Remove non alphabets and special characters
    const onlyAlpha = removeNonAlpha(lowerCaseData);
    // Tokenization
    const tokenConstructor = new natural.WordTokenizer();
    const tokenizedData = tokenConstructor.tokenize(onlyAlpha);
    // Remove Stopwords
    const filteredData = stopword.removeStopwords(tokenizedData);
    const SentimentAnalyzer = new natural.SentimentAnalyzer("English", natural.PorterStemmer, "afinn");
    const rawScore = SentimentAnalyzer.getSentiment(filteredData);
    if (typeof rawScore === "number" && !isNaN(rawScore)) {
        const score = Number(rawScore.toFixed(1)); // Ensure the score is a number with 1 decimal place
        let emotion = (0, exports.analyzeEmotionByScore)(score);
        return {
            score,
            emotion,
        };
    }
    else {
        console.error("Invalid rawScore:", rawScore);
        return {
            score: 0, // Default value in case of an invalid score
            emotion: "neutral", // Default emotion
        };
    }
};
exports.analyzeSentiment = analyzeSentiment;
const analyzeEmotionByScore = (score) => {
    if (score > 0) {
        return "positive";
    }
    else if (score < 0) {
        return "negative";
    }
    else {
        return "neutral";
    }
};
exports.analyzeEmotionByScore = analyzeEmotionByScore;
//# sourceMappingURL=pipeline.js.map