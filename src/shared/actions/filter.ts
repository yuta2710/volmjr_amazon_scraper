import { BestSellerRank } from './../../modules/products/product.types';
import {
  CategoryHelper,
  CategoryNode,
} from "../../modules/category/category.model";
import { ElementHandle } from "puppeteer";

export enum FilterProductAttributesFromUrl {
  ASIN,
  NAME,
}

export const filterNewlineSeparatedText = (rawText: string) => {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ");
};

export const filterAsinFromUrl = (
  url: string,
  field: FilterProductAttributesFromUrl,
) => {
  const regexOfAsin = /\/dp\/([A-Z0-9]+)/;
  const regexOfName = /amazon\.com\/([^\/]+)\/dp\//;
  // Execute the regex on the URL
  let match;
  if (field === FilterProductAttributesFromUrl.ASIN) {
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

export const filterComponentsOfPrice = (rawData: string): [string, number] => {
  return [rawData.split("")[0], Number(rawData.replace("$", ""))];
};

export const filterLocationAndDateOfCommentItem = (
  rawData: string,
): string[] => {
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

export const filterStarRatings = (
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

export const filterCategoryAsListByHtml = async (
  categoryContainerSelectorList: ElementHandle<HTMLLIElement>[],
): Promise<CategoryNode> => {
  let filtratedCategories: string[] = [];

  // Process the data in selector list
  if (categoryContainerSelectorList.length > 0) {
    for (let i = 0; i < categoryContainerSelectorList.length; i++) {
      let categoryText = await categoryContainerSelectorList[i].$eval(
        "span",
        (el) => el.textContent.trim(),
      );
      filtratedCategories.push(categoryText);
    }
  }

  // Remove the special character
  filtratedCategories = filtratedCategories.filter((data) => data !== "›");

  // Setup the 2N rule
  const totalCategoryNode: number = filtratedCategories.length;
  const STAR_RULE = 1;
  const END_RULE = 2 * totalCategoryNode;

  const categoryHelper = new CategoryHelper();
  // Build the tree of category
  let categoryHierarchy: CategoryNode = categoryHelper.buildCategoryHierarchy(
    filtratedCategories,
    STAR_RULE,
    END_RULE,
  );

  return categoryHierarchy;
};

export const filterBestSellerRanksInRawContent = (
  queryProductDetailsContainerRawText: string,
) => {
  let bestSellerRankJson = {
    heading: "",
    attributeVal: "",
  };
  const bestSellerRankRegex =
    /Best Sellers Rank:\s*([^]+?)\s*Customer Reviews:/;
  // Match the text and extract the Best Sellers Rank information
  const matches =
    queryProductDetailsContainerRawText.match(bestSellerRankRegex);
  if (matches && matches[1]) {
    bestSellerRankJson.heading = "Best Sellers Rank";
    bestSellerRankJson.attributeVal = matches[1].trim();
  }
  return bestSellerRankJson;
};

export const filterQueryType = (
  url: string,
): {
  pageNumber: number | null;
  reviewType: string | null;
  sortBy: string | null;
} => {
  const regex =
    /(?:pageNumber=(\d+))|(?:reviewerType=([^&]+))|(?:sortBy=([^&]+))/g;
  const matches = Array.from(url.matchAll(regex));
  const params: any = {
    pageNumber: null,
    reviewerType: null,
    sortBy: null,
  };

  matches.forEach((match: any) => {
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

export const filterBestSellerRanks = (data: string[]): BestSellerRank[] => {
  let filteredBestSellerRankings: BestSellerRank[] = data.map((rankString) => {
    const rankMatch = rankString.match(/#(\d+)/);
    const categoryMatch = rankString.match(/in\s+(.+?)(\s+\(See Top 100|\s*$)/);

    return {
      rank: rankMatch ? `#${rankMatch[1]}` : "",
      categoryMarket: categoryMatch ? categoryMatch[1].trim() : "",
    };
  });

  filteredBestSellerRankings =
    filteredBestSellerRankings.length > 0
      ? filteredBestSellerRankings.filter(
          (category) => category.rank !== "" && category.categoryMarket !== "",
        )
      : [{ rank: "", categoryMarket: "" }] as BestSellerRank[];

  return filteredBestSellerRankings;
};
