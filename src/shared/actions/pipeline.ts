import { WORD_DICT } from "../constants";
import * as natural from "natural";
import * as stopword from "stopword";

export enum ProductFieldExtractorFromUrl {
  ASIN,
  NAME,
}

export const getUrlComponents = (url: string) => {
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
  } else {
    console.log("No match found");
  }
};

export const processNewlineSeparatedText = (rawText: string) => {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ");
};

export const extractAsinFromUrl = (
  url: string,
  field: ProductFieldExtractorFromUrl,
) => {
  const regexOfAsin = /\/dp\/([A-Z0-9]+)/;
  const regexOfName = /amazon\.com\/([^\/]+)\/dp\//;
  // Execute the regex on the URL
  let match;
  if (field === ProductFieldExtractorFromUrl.ASIN) {
    match = url.match(regexOfAsin);
  } else {
    match = url.match(regexOfName);
  }

  if (match) {
    return match[1];
  } else {
    console.log("No match found");
  }
};

export const extractCommendLocationAndDate = (rawData: string): string[] => {
  const regex = /in the (.*?) on (.*)/;
  const match = rawData.match(regex);

  if (match) {
    const country = match[1]; // "United States"
    const date = match[2]; // "March 1, 2023"
    const resultArray = [country, date];

    return resultArray; // Output: ["United States", "March 1, 2023"]
  } else {
    console.log("No match found");
  }
};

export const processStarRatings = (
  rawData: string,
): { [key: string]: string } => {
  // Step 1: Extract the star ratings and percentages
  const ratings: string[] | null = rawData.match(/\d star/g);
  const percentages: string[] | null = rawData.match(/\d+%/g);

  // Step 2: Map the star ratings to their corresponding percentages
  const ratingObj: { [key: string]: string } = {};

  if (ratings && percentages) {
    ratings.slice(0, 5).forEach((rating, index) => {
      ratingObj[rating] = percentages[index];
    });
  }

  return ratingObj;
};

// Contractions to standard lexicons Conversion
const convertToStandard = (text: string) => {
  const data = text.split(" ");
  data.forEach((word, index) => {
    Object.keys(WORD_DICT).forEach((key) => {
      if (key === word.toLowerCase()) {
        data[index] = WORD_DICT[key];
      }
    });
  });

  return data.join(" ");
};

// LowerCase Conversion
const convertTolowerCase = (text: string) => {
  return text.toLowerCase();
};

// Pure Alphabets extraction
const removeNonAlpha = (text: string) => {
  // This specific Regex means that replace all
  //non alphabets with empty string.
  return text.replace(/[^a-zA-Z\s]+/g, "");
};

export const filtrateData = (data: string) => {
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

export const analyzeSentiment = (
  data: string,
): { score: number; emotion: string } => {
  const lexData = convertToStandard(data);

  // Convert all data to lowercase
  const lowerCaseData = convertTolowerCase(lexData);

  // Remove non alphabets and special characters
  const onlyAlpha = removeNonAlpha(lowerCaseData);

  // Tokenization
  const tokenConstructor = new natural.WordTokenizer();
  const tokenizedData = tokenConstructor.tokenize(onlyAlpha);

  // Remove Stopwords
  const filteredData: string[] = stopword.removeStopwords(tokenizedData);
  const SentimentAnalyzer = new natural.SentimentAnalyzer(
    "English",
    natural.PorterStemmer,
    "afinn",
  );
  const rawScore = SentimentAnalyzer.getSentiment(filteredData)
  if (typeof rawScore === 'number' && !isNaN(rawScore)) {
    const score = Number(rawScore.toFixed(1)); // Ensure the score is a number with 1 decimal place
    let emotion: string = analyzeEmotionByScore(score);
    return {
      score,
      emotion,
    };
  } else {
    console.error("Invalid rawScore:", rawScore);
    return {
      score: 0,  // Default value in case of an invalid score
      emotion: "neutral",  // Default emotion
    };
  }
};

export const analyzeEmotionByScore = (score: number): string => {
  if (score > 0) {
    return "positive";
  } else if (score < 0) {
    return "negative";
  } else {
    return "neutral";
  }
};
