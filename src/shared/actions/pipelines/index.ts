export enum ProductFieldExtractorFromUrl {
  ASIN,
  NAME 
}

export const extractAsinFromUrl = (url: string, field: ProductFieldExtractorFromUrl) => {
  const regexOfAsin = /\/dp\/([A-Z0-9]+)/;
  const regexOfName = /amazon\.com\/([^\/]+)\/dp\// 
  // Execute the regex on the URL
  let match;
  if(field === ProductFieldExtractorFromUrl.ASIN) {
    match = url.match(regexOfAsin);
  }else {
    match = url.match(regexOfName);
  }

  if (match) {
    return match[1]
  } else {
    console.log("No match found");
  }
};
