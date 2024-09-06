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
exports.analyzeSentimentGroupByMonth = exports.analyzeFrequencyKeywordOfComments = exports.analyzeEmotionByScore = exports.analyzeSentiment = void 0;
const constants_1 = require("../constants");
const natural = __importStar(require("natural"));
const stopword = __importStar(require("stopword"));
// import lemmatizer from "wink-lemmatizer";
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
const filterTextDataForSentimentAnalysis = (data) => {
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
    return filteredData;
};
const analyzeSentiment = (data) => {
    // Remove Stopwords
    const filteredData = filterTextDataForSentimentAnalysis(data);
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
    if (score > 1) {
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
const analyzeFrequencyKeywordOfComments = (commentItems) => {
    if (commentItems && commentItems.length > 0) {
        let allKeywords = [];
        for (const comment of commentItems) {
            const tokenizer = new natural.WordTokenizer();
            let tokens = tokenizer.tokenize(comment.content.toLowerCase());
            tokens = stopword.removeStopwords(tokens);
            // Lemmatize tokens (async)
            // tokens = tokens.map((token) => lemmatizer.noun(token));
            tokens = tokens.filter((token) => token && token.trim() !== "");
            tokens = tokens.filter((token) => isNaN(Number(token)));
            allKeywords = allKeywords.concat(tokens);
        }
        console.log(allKeywords);
        const keywordFrequencies = allKeywords.reduce((acc, word) => {
            acc[word] = (acc[word] || 0) + 1;
            return acc;
        }, {});
        console.log("Keyword frequencies:", keywordFrequencies);
        return keywordFrequencies;
    }
};
exports.analyzeFrequencyKeywordOfComments = analyzeFrequencyKeywordOfComments;
function lemmatizeWord(token) {
    const wordnet = new natural.WordNet();
    return new Promise((resolve, reject) => {
        wordnet.lookup(token, (results) => {
            if (results.length > 0) {
                resolve(results[0].lemma);
            }
            else {
                resolve(token);
            }
        });
    });
}
const analyzeSentimentGroupByMonth = (commentItems) => {
    const getMonthName = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString("default", { month: "long" });
    };
    const monthOrder = [
        "January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December"
    ];
    const result = {};
    if (commentItems && commentItems.length > 0) {
        for (let i = 0; i < commentItems.length; i++) {
            const monthKey = getMonthName(commentItems[i].date);
            const sentimentScore = commentItems[i].sentiment.score;
            const sentimentEmotion = commentItems[i].sentiment.emotion;
            if (!result[monthKey]) {
                result[monthKey] = {
                    positive: {
                        numberOfComments: 0,
                        score: 0,
                    },
                    neutral: {
                        numberOfComments: 0,
                        score: 0,
                    },
                    negative: {
                        numberOfComments: 0,
                        score: 0,
                    },
                };
            }
            if (sentimentEmotion === "positive") {
                result[monthKey].positive.numberOfComments += 1;
                result[monthKey].positive.score += sentimentScore;
            }
            else if (sentimentEmotion === "neutral") {
                result[monthKey].neutral.numberOfComments += 1;
                result[monthKey].neutral.score += sentimentScore;
            }
            else if (sentimentEmotion === "negative") {
                result[monthKey].negative.numberOfComments += 1;
                result[monthKey].negative.score += sentimentScore;
            }
        }
        // Sort the result by monthOrder
        const sortedResult = Object.keys(result)
            .sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b))
            .reduce((acc, key) => {
            acc[key] = result[key];
            return acc;
        }, {});
        return sortedResult;
    }
    return result;
};
exports.analyzeSentimentGroupByMonth = analyzeSentimentGroupByMonth;
//# sourceMappingURL=analyze.js.map