import { WORD_DICT } from "../constants";
import * as natural from "natural";
import * as stopword from "stopword";

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

const filterTextDataForSentimentAnalysis = (data: string) => {
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

  // console.log("Lexed Data: ", lexData);
  // console.log("LowerCase Format: ", lowerCaseData);
  // console.log("OnlyAlpha: ", onlyAlpha);
  // console.log("Tokenized Data: ", tokenizedData);
  // console.log("After removing stopwords: ", filteredData);

  return filteredData
};

export const analyzeSentiment = (
  data: string,
): { score: number; emotion: string } => {
  // Remove Stopwords
  const filteredData: string[] = filterTextDataForSentimentAnalysis(data);
  const SentimentAnalyzer = new natural.SentimentAnalyzer(
    "English",
    natural.PorterStemmer,
    "afinn",
  );
  const rawScore = SentimentAnalyzer.getSentiment(filteredData);
  
  if (typeof rawScore === "number" && !isNaN(rawScore)) {
    const score = Number(rawScore.toFixed(1)); // Ensure the score is a number with 1 decimal place
    let emotion: string = analyzeEmotionByScore(score);
    return {
      score,
      emotion,
    };
  } else {
    console.error("Invalid rawScore:", rawScore);
    return {
      score: 0, // Default value in case of an invalid score
      emotion: "neutral", // Default emotion
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