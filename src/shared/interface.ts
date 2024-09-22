import { Page } from "puppeteer";

export interface DataPreprocessor {
  proccessData(data: any): void;
}
export interface InitialExtractorDesign<T> {
  extract(page: Page): Promise<T>;
}

