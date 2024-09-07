// import * as path from "path";

// const executablePath = path.join(
//   __dirname,
//   "../../scripts/normal+captcha.py"
// );
// const command = `python ${executablePath} remoteurl`;

// console.log(command);
import * as natural from 'natural';
import * as stopWords from 'stopword';

// Function to clean and tokenize text
function tokenizeText(text: any) {
  const tokenizer = new natural.WordTokenizer();
  return tokenizer.tokenize(text.toLowerCase());
}

// Function to extract keywords using TF-IDF
export const extractKeywordsTFIDF = (titles: any) => {
  const tfidf = new natural.TfIdf();
  
  // Tokenize and add the titles to the TF-IDF calculation
  titles.forEach((title: any) => {
    const filteredTitle = stopWords.removeStopwords(tokenizeText(title));
    tfidf.addDocument(filteredTitle);
  });

  const keywordsByProduct: any = [];

  // Extract top keywords for each title
  titles.forEach((title: any, index: any) => {
    const keywords: any = [];
    
    tfidf.listTerms(index).forEach(item => {
      keywords.push(item.term); // Capture all terms with their score
    });

    keywordsByProduct.push(keywords);
  });

  return keywordsByProduct;
}


