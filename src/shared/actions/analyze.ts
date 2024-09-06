import { WORD_DICT } from "../constants";
import * as natural from "natural";
import * as stopword from "stopword";
import { CommentItem } from "../types";
import colors from "colors";
// import lemmatizer from "wink-lemmatizer";

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
  let lowerCaseData = convertTolowerCase(lexData);

  if(lowerCaseData.includes("10/10")){
    lowerCaseData = "Perfect";
  }
  if(lowerCaseData.includes("9/10")){
    lowerCaseData = "Very good";
  }
  if(lowerCaseData.includes("8/10")){
    lowerCaseData = "Good";
  }
  if(lowerCaseData.includes("1/10") || lowerCaseData.includes("2/10")){
    lowerCaseData = "Very worst";
  }
  if(lowerCaseData.includes("3/10")){
    lowerCaseData = "Very bad"
  }
  if(lowerCaseData.includes("4/10")){
    lowerCaseData = "Bad";
  }
  if(lowerCaseData.includes("5/10")){
    lowerCaseData = "Not really good but still be able to use this product";
  }

  // Remove non alphabets and special characters
  const onlyAlpha = removeNonAlpha(lowerCaseData);

  // Tokenization
  const tokenConstructor = new natural.WordTokenizer();
  const tokenizedData = tokenConstructor.tokenize(onlyAlpha);

  // Remove Stopwords
  const filteredData = stopword.removeStopwords(tokenizedData);

  return filteredData;
};

export const analyzeSentiment = (
  data: string
): { score: number; emotion: string } => {
  // console.log(`Data for sentiment analysis: ${data}`);
  // Remove Stopwords
  const filteredData: string[] = filterTextDataForSentimentAnalysis(data);

  // console.log(colors.cyan("Filtered Data = ") + filteredData)
  const SentimentAnalyzer = new natural.SentimentAnalyzer(
    "English",
    natural.PorterStemmer,
    "afinn"
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
  if (score > 1) {
    return "positive";
  } else if (score < 0) {
    return "negative";
  } else {
    return "neutral";
  }
};

export const analyzeFrequencyKeywordOfComments = (
  commentItems: CommentItem[]
) => {
  if (commentItems && commentItems.length > 0) {
    let allKeywords: string[] = [];

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
    }, {} as Record<string, number>);

    console.log("Keyword frequencies:", keywordFrequencies);

    return keywordFrequencies;
  }
};

function lemmatizeWord(token: string) {
  const wordnet = new natural.WordNet();
  return new Promise((resolve, reject) => {
    wordnet.lookup(token, (results) => {
      if (results.length > 0) {
        resolve(results[0].lemma);
      } else {
        resolve(token);
      }
    });
  });
}

export const analyzeSentimentGroupByMonth = (
  commentItems: CommentItem[]
): Record<string, any> => {
  const getMonthName = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString("default", { month: "long" });
  };

  const monthOrder = [
    "January", "February", "March", "April", "May", "June", "July", 
    "August", "September", "October", "November", "December"
  ];

  const result: Record<string, any> = {};

  if (commentItems && commentItems.length > 0) {
    for (let i = 0; i < commentItems.length; i++) {
      const monthKey: string = getMonthName(commentItems[i].date) as string;
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
      } else if (sentimentEmotion === "neutral") {
        result[monthKey].neutral.numberOfComments += 1;
        result[monthKey].neutral.score += sentimentScore;
      } else if (sentimentEmotion === "negative") {
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
      }, {} as Record<string, any>);

    return sortedResult;
  }
  return result;
};

