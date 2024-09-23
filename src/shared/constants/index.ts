import { HeadlessBrowserOptions } from "../types";

export const WORD_DICT: any = {
  "aren't": "are not",
  "can't": "cannot",
  "couldn't": "could not",
  "doesn't": "does not",
  "don't": "do not",
  "hadn't": "had not",
  "hasn't": "has not",
  "haven't": "have not",
  "he'd": "he would",
  "he'll": "he will",
  "he's": "he is",
  // "i'd": "I would",
  "i'd": "I had",
  "i'll": "I will",
  "i'm": "I am",
  "isn't": "is not",
  "it's": "it is",
  "it'll": "it will",
  "i've": "I have",
  "let's": "let us",
  "mightn't": "might not",
  "mustn't": "must not",
  "shan't": "shall not",
  "she'd": "she would",
  "she'll": "she will",
  "she's": "she is",
  "shouldn't": "should not",
  "that's": "that is",
  "there's": "there is",
  "they'd": "they would",
  "they'll": "they will",
  "they're": "they are",
  "they've": "they have",
  "we'd": "we would",
  "we're": "we are",
  "weren't": "were not",
  "we've": "we have",
  "what'll": "what will",
  "what're": "what are",
  "what's": "what is",
  "what've": "what have",
  "where's": "where is",
  "who'd": "who would",
  "who'll": "who will",
  "who're": "who are",
  "who's": "who is",
  "who've": "who have",
  "won't": "will not",
  "wouldn't": "would not",
  "you'd": "you would",
  "you'll": "you will",
  "you're": "you are",
  "you've": "you have",
  "'re": " are",
  "wasn't": "was not",
  "we'll": " will",
  "didn't": "did not",
};

export const RED = "\\x1b[31m";
export const GREEN = "\\x1b[32m";
export const RESET = "\\x1b[0m";

export async function readStopwordsFile(callback: any) {
  const xhr = new XMLHttpRequest();
  xhr.open(
    "GET",
    "https://gist.githubusercontent.com/rg089/35e00abf8941d72d419224cfd5b5925d/raw/12d899b70156fd0041fa9778d657330b024b959c/stopwords.txt",
    true,
  );

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      const text = xhr.responseText;
      const stopwords = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      callback(stopwords);
    } else {
      console.log("Deo co cc gi");
    }
  };

  xhr.send();
}

export enum UserRole {
  ADMIN = "admin",
  DEFAULT = "user",
}

export const ZERO = 0 as const;
export const ONE = 1 as const;
export const THREE = 3 as const;
export const FOUR = 4 as const;
export const SIX = 6 as const;
export const TEN = 10 as const;
export const SIXTY = 60 as const;
export const ONE_HUNDRED = 100 as const;
export const ONE_THOUSAND = 1000 as const;

export const REGEX_EMAIL = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

export enum HttpCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

export enum Platforms {
  AMAZON = "amazon",
  EBAY = "ebay",
  WALMART = "walmart",
}

export const TOP_10 = 5;
export const TOP_5 = 5;

export const SIXTY_PERCENTAGE_OF_EXPECTED_RELEVANT = 0.6;
export const FIFTY_PERCENTAGE_OF_EXPECTED_RELEVANT = 0.5;

export const MAXIMUM_TIMEOUT_FOR_SCRAPING = 10000 as const;

export const HEADLESS_STATE_MANAGEMENT = 
{
  DEBUG_MODE: {
    headless: false,
    args: ["--start-maximized"],
  } as HeadlessBrowserOptions,
  DEV_MODE: {
    headless: true 
  } as HeadlessBrowserOptions,
  PRODUCTION_MODE: {
    headless: true 
  } as HeadlessBrowserOptions
 } as const;
