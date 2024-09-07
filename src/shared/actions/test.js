"use strict";
// import * as path from "path";
Object.defineProperty(exports, "__esModule", { value: true });
// const executablePath = path.join(
//   __dirname,
//   "../../scripts/normal+captcha.py"
// );
// const command = `python ${executablePath} remoteurl`;
// console.log(command);
var natural = require("natural");
var stopWords = require("stopword");
// Function to clean and tokenize text
function tokenizeText(text) {
    var tokenizer = new natural.WordTokenizer();
    return tokenizer.tokenize(text.toLowerCase());
}
// Function to extract keywords using TF-IDF
function extractKeywordsTFIDF(titles) {
    var tfidf = new natural.TfIdf();
    // Tokenize and add the titles to the TF-IDF calculation
    titles.forEach(function (title) {
        var filteredTitle = stopWords.removeStopwords(tokenizeText(title));
        tfidf.addDocument(filteredTitle);
    });
    var keywordsByProduct = [];
    // Extract top keywords for each title
    titles.forEach(function (title, index) {
        var keywords = [];
        tfidf.listTerms(index).forEach(function (item) {
            keywords.push(item.term); // Capture all terms with their score
        });
        keywordsByProduct.push(keywords);
    });
    return keywordsByProduct;
}
// Example product titles (from your screenshots)
var productTitles = [
    "Tanisa Rice Paper, 38 Sheets Organic Rice Paper Wrappers, Low carb tortilla, Spring roll wrappers, Gluten FREE wraps (22cm, 12 oz) Non GMO Banh Trang Goi Cuon",
    "Premium Spring Roll Wrapper, Fresh Rice Paper, Spring Roll Wrappers (22cm)",
    "Schar Gluten Free Sandwich Roll 5.3 Oz (Pack of 2)"
];
// Extract keywords dynamically using TF-IDF
var extractedKeywords = extractKeywordsTFIDF(productTitles);
console.log("Extracted Keywords:", extractedKeywords);
// Example: Compare keywords between first and second product
var commonKeywords = extractedKeywords[0].filter(function (keyword) { return extractedKeywords[1].includes(keyword); });
console.log("Common Keywords between Product 1 and Product 2:", commonKeywords);
