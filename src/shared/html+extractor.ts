import { Page } from "puppeteer";
import { InitialExtractorDesign } from "./interface";
import { filterComponentsOfPrice, isValidPriceFormat } from "./actions/filter";
import {
  AmazonProductAverageRatingExtractorResponse,
  AmazonProductBasePriceUnitGroupContent,
} from "./types";
import colors from "colors";

export abstract class BaseExtractor<T> implements InitialExtractorDesign<T> {
  abstract extract(page: Page): Promise<T>;

  protected async safeEval(query: string, page: Page, fallback: T): Promise<T> {
    try {
      return (await page.$eval(query, (el) =>
        el.textContent.trim(),
      )) as unknown as T;
    } catch (error) {
      console.error(`Failed to extract element for selector: ${query}`);
      return fallback;
    }
  }
}

export class AmazonProductExtractorComponents {
  private priceBaseUnitGroup: AmazonProductPriceBaseUnitGroupExtractor =
    new AmazonProductPriceBaseUnitGroupExtractor();
  private averageRatingExtractor: AmazonProductAverageRatingExtractor =
    new AmazonProductAverageRatingExtractor();
  private retailerExtractor: AmazonProductRetailerExtractor =
    new AmazonProductRetailerExtractor();
  private deliveryLocationExtractor: AmazonProductDeliveryLocationExtractor =
    new AmazonProductDeliveryLocationExtractor();

  getPriceBaseUnitGroup(): AmazonProductPriceBaseUnitGroupExtractor {
    return this.priceBaseUnitGroup;
  }

  getAverageRatingExtractor(): AmazonProductAverageRatingExtractor {
    return this.averageRatingExtractor;
  }

  getRetailerExtractor(): AmazonProductRetailerExtractor {
    return this.retailerExtractor;
  }

  getDeliveryLocationExtractor(): AmazonProductDeliveryLocationExtractor {
    return this.deliveryLocationExtractor;
  }
}

export class AmazonProductDeliveryLocationExtractor extends BaseExtractor<{
  deliveryLocation: string;
}> {
  async extract(page: Page): Promise<{ deliveryLocation: string }> {
    let deliveryLocation: string = (
      await page.$eval(
        "span.nav-line-2.nav-progressive-content",
        (el) => el.textContent,
      )
    ).trim();

    if (deliveryLocation === "United States Min...") {
      deliveryLocation = "United States Minor Outlying Islands";
    }

    return { deliveryLocation };
  }
}

export class AmazonProductRetailerExtractor extends BaseExtractor<{
  retailer: string;
}> {
  async extract(page: Page): Promise<{ retailer: string }> {
    let retailerElement = null;

    try {
      retailerElement = await page.$("#sellerProfileTriggerId");
    } catch (error) {
      console.error(
        "Unable to retailer name by ID = " +
          colors.cyan("sellerProfileTriggerId"),
      );
    }

    try {
      retailerElement = await page.$(
        "#merchantInfoFeature_feature_div div[offer-display-feature-name='desktop-merchant-info'] span.a-size-small.offer-display-feature-text-message",
      );
    } catch (error) {
      console.error(
        "Unable to retailer name by ID = " +
          colors.cyan("merchantInfoFeature_feature_div"),
      );
    }

    let retailerName: string | null = null;

    if (retailerElement) {
      retailerName = await page.evaluate(
        (el) => el.textContent.trim(),
        retailerElement,
      );
    } else {
      console.warn("Retailer name element not found.");
      retailerName = "Not show";
    }

    return { retailer: retailerName };
  }
}

export class AmazonProductAverageRatingExtractor extends BaseExtractor<AmazonProductAverageRatingExtractorResponse> {
  async extract(page: Page): Promise<{ averageRating: number }> {
    const averageRatingText = await page.$eval(
      ".a-icon-alt",
      (el) => el.textContent,
    );

    const filtratedAverageRatingMetric = Number(
      averageRatingText.split(" ")[0],
    );

    return {
      averageRating: filtratedAverageRatingMetric as number,
    } as AmazonProductAverageRatingExtractorResponse;
  }
}

export class AmazonProductPriceBaseUnitGroupExtractor extends BaseExtractor<AmazonProductBasePriceUnitGroupContent> {
  async extract(page: Page): Promise<AmazonProductBasePriceUnitGroupContent> {
    // Current price
    let currentPrice: string = "Not show";
    let currency: string = "";
    let currentPriceText: string = "";

    try {
      // Try extracting the current price using different selectors
      currentPriceText = await page.$eval(
        ".a-price.a-text-price.a-size-medium.apexPriceToPay span:nth-child(1)",
        (el) => el.textContent.trim(),
      );
    } catch (error) {
      console.error("Price text in apexPriceToPay not found");
    }

    try {
      if (!currentPriceText) {
        currentPriceText = await page.$eval(
          ".a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay span",
          (el) => el.textContent.trim(),
        );
      }
    } catch (error) {
      console.error(
        "Price element not found or unable to extract reinventPricePriceToPayMargin:",
      );
    }

    try {
      if (!currentPriceText) {
        currentPriceText = await page.$eval(
          ".a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay",
          (el) => el.textContent.trim(),
        );

        console.log(`Extractor = ${currentPriceText}`);
        console.log(
          `Is valid price format: ${isValidPriceFormat(currentPriceText)}`,
        );

        const isDuplicatedPriceTextValue =
          currentPriceText.match(/\$\d+(\.\d{2})?/);

        if (isDuplicatedPriceTextValue) {
          currentPriceText = isDuplicatedPriceTextValue["input"];
        }
      }
    } catch (error) {
      console.error(
        "Price element of aok-offscreen not found or unable to extract SPAN reinventPricePriceToPayMargin:",
      );
    }

    if (currentPriceText) {
      currentPrice = currentPriceText;
      currency = filterComponentsOfPrice(currentPrice)[0] as string;
    }

    // Original price
    let originalPrice: string = "Not show";
    let originalPriceMetric: number = 0;

    try {
      const originalPriceText = await page.$eval(
        "span.a-size-small.a-color-secondary.aok-align-center.basisPrice span.a-offscreen",
        (el) => el.textContent.trim(),
      );

      if (originalPriceText) {
        originalPrice = originalPriceText;
        originalPriceMetric = Number(originalPrice.replace("$", ""));
      }
    } catch (error) {
      console.error(
        "Price element not found or unable to extract original price:",
      );
    }

    return {
      currentPrice,
      currency,
      originalPrice,
      originalPriceMetric,
    } as AmazonProductBasePriceUnitGroupContent;
  }
}
