"use server";
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeAmazonProduct = scrapeAmazonProduct;
const puppeteer_1 = __importDefault(require("puppeteer"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const assemblyai_1 = require("assemblyai");
const filter_1 = require("./filter");
const analyze_1 = require("./analyze");
const colors_1 = __importDefault(require("colors"));
const camel_browser_1 = require("./camel+browser");
/**
 * Scrapes product information and reviews from an Amazon product page.
 *
 * @param {string} url - The URL of the Amazon product page to scrape.
 */
async function scrapeAmazonProduct(url) {
    if (!url)
        return;
    // const browser = await puppeteer.launch({ headless: true });
    const browser = await puppeteer_1.default.launch({
        // headless: Boolean(process.env.HEADLESS_MODE),
        headless: true,
    });
    const page = await browser.newPage();
    await page.goto(url);
    await checkAndSolveNormalCaptcha(page);
    // Attempt sign-in with retries
    let signInAttempts = 3;
    let signedIn = false;
    while (signInAttempts > 0 && !signedIn) {
        try {
            await attemptSignIn(page);
            signedIn = true;
        }
        catch (error) {
            console.error(`Sign-in attempt failed: ${error.message}. Retries left: ${signInAttempts - 1}`);
            signInAttempts--;
            if (signInAttempts === 0) {
                throw new Error("Failed to sign in after multiple attempts.");
            }
        }
    }
    /**
     * TODO: ============================================================= Process/Build the category hirarchy =============================================================
     */
    let categoryContainerSelectorList = null;
    let categoryHierarchy = null;
    let flattenedCategoryHierarchy = null;
    try {
        categoryContainerSelectorList = await page.$$("#wayfinding-breadcrumbs_feature_div ul > li");
        // Ensure we have elements in the list
        if (categoryContainerSelectorList &&
            categoryContainerSelectorList.length > 0) {
            categoryHierarchy = await (0, filter_1.filterCategoryAsListByHtml)(categoryContainerSelectorList);
            flattenedCategoryHierarchy = JSON.parse(JSON.stringify(categoryHierarchy));
        }
        else {
            console.warn("No categories found in the selector list.");
        }
    }
    catch (error) {
        console.error("Category not found on browser:", error);
    }
    // categoryHierarchy.displayHierarchyAsJSON();
    const scrapedProduct = await collectProductDataExceptForeignField(page);
    const priceHistoryGroup = await (0, camel_browser_1.retrieveProductPriceHistoryGroup)(scrapedProduct.asin);
    console.log("Fucking bitch group");
    console.log(priceHistoryGroup);
    if (priceHistoryGroup) {
        scrapedProduct.price.lowestPrice = priceHistoryGroup?.lowestPrice;
        scrapedProduct.price.highestPrice = priceHistoryGroup?.highestPrice;
        scrapedProduct.price.currentPrice = priceHistoryGroup?.currentPrice;
        scrapedProduct.price.averagePrice = priceHistoryGroup?.averagePrice;
    }
    console.log("Oh shiet processed price");
    console.log(scrapedProduct.price);
    // After format asin, title, price...., navigate to comment page
    // Wait for the review button to appear and be clickable
    let reviewButton = null;
    try {
        reviewButton = await page.waitForSelector(".a-link-emphasis.a-text-bold", {
            timeout: 5000,
        });
        if (reviewButton) {
            try {
                await reviewButton.click();
                await page.waitForNavigation({
                    waitUntil: "domcontentloaded",
                    timeout: 10000,
                });
                const comment_url = `${page.url()}&sortBy=recent&pageNumber=1`;
                console.log(colors_1.default.cyan("After navigate = "), comment_url);
                // Implement retry mechanism for page navigation
                let retries = 10;
                let success = false;
                while (retries > 0 && !success) {
                    try {
                        await page.goto(comment_url, {
                            waitUntil: "domcontentloaded",
                            timeout: 10000,
                        }); // Timeout after 10 seconds
                        // Explicitly wait for an expected element on the comments page
                        await page.waitForSelector(".a-section.review", { timeout: 5000 });
                        success = true; // If navigation and element detection succeed, break out of the loop
                        console.log(colors_1.default.green("Success retry"));
                    }
                    catch (error) {
                        console.error(`Navigation to ${comment_url} failed: ${error.message}. Retries left: ${retries - 1}`);
                        retries--;
                        if (retries === 0) {
                            throw new Error("Failed to navigate to comments after multiple attempts.");
                        }
                        await new Promise((resolve) => setTimeout(resolve, 2000)); // Add a small delay between retries
                    }
                }
                /**
                 * TODO: ============================================================= Steps to scrape the comments ============================================================= */
                const collectedComments = await scrapeCommentsRecursively(page);
                console.log(colors_1.default.green(`Number of the collected comments: ${collectedComments.length}`));
                // Update the amount of comments
                scrapedProduct.numberOfComments = collectedComments.length;
                // Calculate the average of sentiment comment
                if (collectedComments.length > 0) {
                    const totalScore = collectedComments.reduce((sum, data) => {
                        const score = data.sentiment.score;
                        return (sum + (typeof score === "number" && !isNaN(score) ? score : 0));
                    }, 0);
                    // Calculate the average sentiment score
                    const averageSentimentScoreOfScrapedProduct = Number((totalScore / collectedComments.length).toFixed(1));
                    // Analyze the emotion based on the average sentiment score
                    const averageSentimentEmotionOfScrapedProduct = (0, analyze_1.analyzeEmotionByScore)(averageSentimentScoreOfScrapedProduct);
                    // Ensure that scrapedProduct.averageSentimentAnalysis is properly initialized
                    scrapedProduct.averageSentimentAnalysis = {
                        score: averageSentimentScoreOfScrapedProduct,
                        emotion: averageSentimentEmotionOfScrapedProduct,
                    };
                }
                else {
                    // Handle the case where there are no comments
                    console.error("No comments found in collectedComments.");
                }
                /**
                 * * Amazon's scraped data structure is completed
                 */
                return {
                    product: scrapedProduct,
                    comments: collectedComments,
                    category: flattenedCategoryHierarchy
                        ? flattenedCategoryHierarchy
                        : null,
                };
            }
            catch (error) {
                console.error("Error in scrapeAmazonProduct:", error.message);
            }
            finally {
                if (browser) {
                    await browser.close(); // Ensure browser is closed even if an error occurs
                }
            }
        }
        else {
            console.error("Review button not found, cannot proceed with comment scraping.");
            return {
                product: scrapedProduct,
                comments: [],
                category: flattenedCategoryHierarchy
                    ? flattenedCategoryHierarchy
                    : null,
            };
        }
    }
    catch (error) {
        console.error("Fuck that shit");
        return {
            product: scrapedProduct,
            comments: [],
            category: flattenedCategoryHierarchy ? flattenedCategoryHierarchy : null,
        };
    }
}
async function collectProductDataExceptForeignField(page, collectedProduct = null) {
    /**
     * TODO: ============================================================= Scrape the main data of the products ============================================================= */
    const asin = (0, filter_1.filterAsinFromUrl)(page.url(), filter_1.FilterProductAttributesFromUrl.ASIN);
    const title = (await page.$eval("#productTitle", (span) => span.textContent)).trim();
    let isAmazonChoice;
    try {
        isAmazonChoice = await page.evaluate(() => {
            const el = document.querySelector(".a-size-small.aok-float-left.ac-badge-rectangle");
            return el !== null;
        });
    }
    catch (error) {
        console.error("Unable to select Amazon Choice selector");
    }
    // Current price text
    let currentPrice = "Not show";
    let currency = "";
    let currentPriceText = "";
    try {
        currentPriceText = await page.$eval(".a-price.a-text-price.a-size-medium.apexPriceToPay span:nth-child(1)", (el) => el.textContent.trim());
    }
    catch (error) {
        console.error("Price text in apexPriceToPay not found");
    }
    try {
        currentPriceText = (await page.$eval(".a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay span", (el) => el.textContent)).trim();
    }
    catch (error) {
        console.error("Price element not found or unable to extract reinventPricePriceToPayMargin:");
    }
    try {
        currentPriceText = (await page.$eval(".a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay", (el) => el.textContent)).trim();
        console.log(`Extractor = ${currentPriceText}`);
        console.log(`Is valid price format: ${(0, filter_1.isValidPriceFormat)(currentPriceText)}`);
        const isDuplicatedPriceTextValue = currentPriceText.match(/\$\d+(\.\d{2})?/);
        currentPriceText = isDuplicatedPriceTextValue["input"];
    }
    catch (error) {
        console.error("Price element of aok-offscreen not found or unable to extract SPAN reinventPricePriceToPayMargin:");
    }
    if (currentPriceText) {
        currentPrice = currentPriceText;
        currency = (0, filter_1.filterComponentsOfPrice)(currentPrice)[0];
    }
    // Original price
    let originalPrice;
    let originalPriceMetric;
    try {
        const originalPriceText = await page.$eval("span.a-size-small.a-color-secondary.aok-align-center.basisPrice span.a-offscreen", (el) => el.textContent.trim());
        if (originalPriceText) {
            originalPrice = originalPriceText;
            originalPriceMetric = Number(originalPrice.replace("$", ""));
        }
    }
    catch (error) {
        console.error("Price element not found or unable to extract price:");
        originalPrice = "";
        originalPriceMetric = 0;
    }
    // Average rating of product
    const averageRatingText = await page.$eval(".a-icon-alt", (el) => el.textContent);
    const filtratedAverageRatingMetric = Number(averageRatingText.split(" ")[0]);
    // Delivery location
    let deliveryLocation = (await page.$eval("span.nav-line-2.nav-progressive-content", (el) => el.textContent)).trim();
    if (deliveryLocation === "United States Min...") {
        deliveryLocation = "United States Minor Outlying Islands";
    }
    let retailerElement = null;
    try {
        retailerElement = await page.$("#sellerProfileTriggerId");
    }
    catch (error) {
        console.error("Unable to retailer name by ID = " +
            colors_1.default.cyan("sellerProfileTriggerId"));
    }
    try {
        retailerElement = await page.$("#merchantInfoFeature_feature_div div[offer-display-feature-name='desktop-merchant-info'] span.a-size-small.offer-display-feature-text-message");
    }
    catch (error) {
        console.error("Unable to retailer name by ID = " +
            colors_1.default.cyan("merchantInfoFeature_feature_div"));
    }
    let retailerName = null;
    if (retailerElement) {
        retailerName = await page.evaluate((el) => el.textContent.trim(), retailerElement);
    }
    else {
        console.warn("Retailer name element not found.");
        retailerName = "Not show";
    }
    // Filtrated sales volume last month
    let filtratedSalesVolumeLastMonth;
    try {
        const salesVolumeLastMonthText = await (await page.$eval("span.a-size-small.social-proofing-faceout-title-text", (el) => el.textContent)).trim();
        if (salesVolumeLastMonthText) {
            filtratedSalesVolumeLastMonth = salesVolumeLastMonthText;
        }
    }
    catch (error) {
        filtratedSalesVolumeLastMonth = "Not show";
    }
    const histogramTable = await page.$$("#histogramTable > li");
    let historamItemMapper = [];
    for (let i = 0; i < histogramTable.length; i++) {
        const ratingItem = await histogramTable[i].$eval("span.a-list-item", (el) => el.textContent);
        historamItemMapper.push(ratingItem);
    }
    const rawRatingStars = historamItemMapper[0];
    const filtratedHistogramItems = (0, filter_1.filterStarRatings)(rawRatingStars);
    // Out of stock
    let isOutOfStock;
    try {
        const outOfStockText = await page.$eval("div#availability > span", (el) => el.textContent.trim().toLowerCase());
        isOutOfStock = !outOfStockText.includes("in stock");
    }
    catch (error) {
        console.warn("Out of stock element not found or unable to determine stock status:", error);
        isOutOfStock = false;
    }
    // Percentage selling
    let percentage;
    try {
        const percentageSelector = await page.$("span.a-size-large.a-color-price.savingPriceOverride.aok-align-center.reinventPriceSavingsPercentageMargin.savingsPercentage");
        if (percentageSelector) {
            const percentageText = await page.$eval("span.a-size-large.a-color-price.savingPriceOverride.aok-align-center.reinventPriceSavingsPercentageMargin.savingsPercentage", (el) => el.textContent.trim().toLowerCase());
            percentage = percentageText;
            console.log("Percentage text: ", percentage);
        }
    }
    catch (error) {
        console.log(colors_1.default.red("Percentage currently not available to display"));
    }
    // const dateFirstAvailable = await page.$eval(".a-color-secondary.a-size-base.prodDetSectionEntry", el => el.textContent.trim());
    // console.log(`Date First Available: ${dateFirstAvailable}`)
    const bestSellerRankJson = await getBestSellerRankByHtmlElement(page);
    const bestSellerRankArr = bestSellerRankJson["attributeVal"].split("   ");
    const filteredBestSellerRank = (0, filter_1.filterBestSellerRanks)(bestSellerRankArr);
    const isBestSeller = filteredBestSellerRank.some((ranking) => ranking.rank === "#1");
    const image = (await page.$eval("img#landingImage", (el) => el.getAttribute("src")));
    let filteredPriceAsNumeric;
    if (currentPriceText) {
        filteredPriceAsNumeric = (0, filter_1.filterComponentsOfPrice)(currentPrice)[1];
    }
    collectedProduct = {
        asin,
        title,
        price: {
            amount: filteredPriceAsNumeric,
            currency,
            displayAmount: String(currentPrice),
            currentPrice: filteredPriceAsNumeric,
            originalPrice: originalPriceMetric || filteredPriceAsNumeric,
            highestPrice: originalPriceMetric,
            lowestPrice: filteredPriceAsNumeric,
            savings: {
                percentage: percentage !== undefined ? percentage : "",
                currency,
                displayAmount: String(currentPrice),
                amount: filteredPriceAsNumeric,
            },
        },
        histogram: filtratedHistogramItems,
        averageRating: filtratedAverageRatingMetric,
        salesVolumeLastMonth: filtratedSalesVolumeLastMonth,
        deliveryLocation,
        retailer: retailerName,
        businessTargetForCollecting: "amazon",
        url: String(page.url()),
        bestSellerRanks: filteredBestSellerRank,
        isBestSeller,
        isAmazonChoice,
        isOutOfStock,
        brand: "Amazon",
        image,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    return collectedProduct;
}
/**
 * * Get best seller ranks from dynamic HTML Element .
 * TODO: Get best seller ranks by dynamic UI.
 * @param {Page} page - The Puppeteer page object representing the current browser tab.
 * @returns {Promise<any[]>} A promise that resolves to the array of all collected comments.
 */
async function getBestSellerRankByHtmlElement(page) {
    let bestSellerRankJson = { heading: "", attributeVal: "" };
    let bestSellerRankRegex;
    // Try to select the Best Seller Ranks from the <ul> tag first
    try {
        const bestSellerRanksUlRawText = await page.$eval("#detailBulletsWrapper_feature_div", (el) => el.textContent.trim());
        bestSellerRankRegex = /Best Sellers Rank:\s*([\s\S]+?)Customer Reviews:/;
        // Apply the regex pattern to extract the Best Sellers Rank information
        const match = bestSellerRanksUlRawText.match(bestSellerRankRegex);
        if (match) {
            const bestSellerRankText = match[1].trim();
            bestSellerRankJson = {
                heading: "Best Sellers Rank",
                attributeVal: bestSellerRankText,
            };
            return bestSellerRankJson;
        }
    }
    catch (error) {
        console.error("Error processing <ul> tag for Best Seller Ranks. Continuing to check table...");
    }
    // If the <ul> tag doesn't contain the Best Sellers Rank, check the <table> tag
    try {
        const queryProductDetailsContainerRawText = await page.$eval(".a-keyvalue.prodDetTable:nth-child(1)", (el) => el.textContent.trim());
        bestSellerRankRegex =
            /Best Sellers Rank\s+(#\d+[\s\S]+?)(?=\s+Date First Available)/;
        const bestSellerRankMatch = queryProductDetailsContainerRawText.match(bestSellerRankRegex);
        if (bestSellerRankMatch) {
            bestSellerRankJson = {
                heading: "Best Sellers Rank",
                attributeVal: bestSellerRankMatch[1].trim(),
            };
            return bestSellerRankJson;
        }
    }
    catch (error) {
        console.error("Error processing <table> tag for Best Seller Ranks. Continuing to check div...");
    }
    // If neither the <ul> nor <table> tags contain the Best Sellers Rank, check the <div> tag
    try {
        const queryProductDetailsContainerRawText = await page.$eval("#productDetails_db_sections", (el) => el.textContent.trim());
        bestSellerRankRegex =
            /Best Sellers Rank\s+(#\d+[\s\S]+?)(?=\s+Date First Available)/;
        const bestSellerRankMatch = queryProductDetailsContainerRawText.match(bestSellerRankRegex);
        if (bestSellerRankMatch) {
            bestSellerRankJson = {
                heading: "Best Sellers Rank",
                attributeVal: bestSellerRankMatch[1].trim(),
            };
            return bestSellerRankJson;
        }
    }
    catch (error) {
        console.error("Error processing <div> tag for Best Seller Ranks.");
    }
    // Return empty result if nothing is found
    return bestSellerRankJson;
}
/**
 * * Across multiple pages by navigating through the pagination.
 * TODO: Recursively scrapes comments from an Amazon product page, collecting all available comments
 * @param {Page} page - The Puppeteer page object representing the current browser tab.
 * @param {any[]} collectedComments - An array to store the collected comments across all pages. Defaults to an empty array.
 * @returns {Promise<any[]>} A promise that resolves to the array of all collected comments.
 */
async function scrapeCommentsRecursively(page, collectedComments = []) {
    // await page.reload();
    const queryCommentPrimaryContainer = await page.$(".a-section.a-spacing-none.reviews-content.a-size-base");
    const queryListOfComments = await queryCommentPrimaryContainer.$$("div[data-hook='review']");
    console.log(colors_1.default.cyan("\nSize of current list of comments = "), queryListOfComments.length);
    for (let i = 0; i < queryListOfComments.length; i++) {
        let commentItem;
        let titleAndRatingRawText = await queryListOfComments[i].$eval(".a-size-base.review-title.a-color-base.review-title-content.a-text-bold", (el) => el.textContent);
        let commentRating = "";
        try {
            commentRating = await queryListOfComments[i].$eval("i[data-hook='cmps-review-star-rating']", (el) => el.textContent.trim());
        }
        catch (error) {
            console.error("Not found i rating in comment title as SPAN tag");
        }
        const description = await queryListOfComments[i].$eval(".a-size-base.review-text.review-text-content", (el) => el.textContent);
        const filtratedTitleAndRatingAsList = titleAndRatingRawText
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        const filtratedDescription = (0, filter_1.filterNewlineSeparatedText)(description);
        let isVerifiedPurchase = false;
        try {
            isVerifiedPurchase =
                (await queryListOfComments[i].$(".a-size-mini.a-color-state.a-text-bold")) !== null;
        }
        catch (error) {
            console.log(colors_1.default.cyan("Is verified purchase not found"));
        }
        let helpfulCount = null;
        try {
            helpfulCount = await queryListOfComments[i].$eval("span[data-hook='helpful-vote-statement']", (el) => el.textContent);
        }
        catch (error) {
            helpfulCount = "Unknown";
        }
        let locationAndDateRawText = await queryListOfComments[i].$eval("span[data-hook='review-date']", (el) => el.textContent);
        // Steps to filter the data
        const filtratedLocationAndDateAsList = (0, filter_1.filterLocationAndDateOfCommentItem)(locationAndDateRawText);
        const filtratedLocation = filtratedLocationAndDateAsList[0]
            .replace(/\bthe\b/gi, "")
            .trim();
        const filtratedDate = filtratedLocationAndDateAsList[1];
        let filtratedTitle = "";
        let filtratedRating = "";
        if (filtratedTitleAndRatingAsList.length > 1) {
            filtratedRating = filtratedTitleAndRatingAsList[0].trim();
            filtratedTitle = filtratedTitleAndRatingAsList[1].trim();
        }
        if (filtratedTitleAndRatingAsList.length > 0 && commentRating) {
            filtratedTitle = filtratedTitleAndRatingAsList[0].trim();
            filtratedRating = commentRating.trim();
        }
        const sentimentTitle = (0, analyze_1.analyzeSentiment)(filtratedTitle);
        const sentimentDescription = (0, analyze_1.analyzeSentiment)(filtratedDescription.trim());
        const averageSentimentScore = Number(((Number(sentimentTitle["score"]) +
            Number(sentimentDescription["score"])) /
            2).toFixed(1));
        const averageSentimentEmotion = (0, analyze_1.analyzeEmotionByScore)(averageSentimentScore);
        let currentUrlOfComment = "";
        commentItem = {
            rating: filtratedRating,
            title: filtratedTitle,
            content: filtratedDescription,
            isVerifiedPurchase,
            helpfulCount,
            location: filtratedLocation,
            date: filtratedDate,
            url: currentUrlOfComment,
            sentiment: {
                score: averageSentimentScore,
                emotion: averageSentimentEmotion,
            },
        };
        collectedComments.push(commentItem);
    }
    let prevButtonSelector = null;
    let prevPage = {
        url: "",
        metric: 1,
    };
    let nextPage = {
        url: "",
        metric: 1,
    };
    // Extract the previous page configurations
    try {
        prevButtonSelector = await page.$(".a-pagination li:nth-child(1)");
        if (prevButtonSelector !== null) {
            console.log(colors_1.default.yellow("prevButtonSelector ko null"));
        }
        else {
            console.log(colors_1.default.red("prevButtonSelector bi null ah"));
        }
        let prevPageUrl = await prevButtonSelector.$eval("a", (el) => el.getAttribute("href"));
        prevPageUrl = `https://${String(process.env.AMAZON_DOMAIN)}${prevPageUrl}`;
        let prevPageMetric = (0, filter_1.filterQueryType)(prevPageUrl)["pageNumber"];
        prevPage = {
            url: prevPageUrl,
            metric: prevPageMetric,
        };
    }
    catch (error) {
        console.error("Prev button not found");
    }
    // Need to fix the logic of next button
    let nextButtonClass = null;
    try {
        nextButtonClass = await page.$eval(".a-pagination li:nth-child(2)", (el) => el.getAttribute("class"));
        // If next button is not disabled. Extract the next page configurations
        if (nextButtonClass) {
            if (!nextButtonClass.includes("a-disabled a-last")) {
                let nextPageUrl = await page.$eval(".a-pagination li:nth-child(2) a", (el) => el.getAttribute("href"));
                nextPageUrl = `https://${String(process.env.AMAZON_DOMAIN)}${nextPageUrl}`;
                const nextPageMetric = (0, filter_1.filterQueryType)(String(nextPageUrl))["pageNumber"];
                nextPage = {
                    url: nextPageUrl,
                    metric: nextPageMetric,
                };
            }
            const currentPage = (0, filter_1.filterQueryType)(String(page.url()))["pageNumber"];
            collectedComments = collectedComments.map((comment) => ({
                ...comment,
                pagination: {
                    totalRecords: queryListOfComments.length,
                    currentPage,
                    nextPage: nextPage.url && nextPage.metric ? nextPage : { url: "", metric: 1 },
                    prevPage: prevPage.url && prevPage.metric ? prevPage : { url: "", metric: 1 },
                },
            }));
            console.log(colors_1.default.magenta(`Next page: ${nextPage.metric}`));
            if (nextPage.url) {
                await page.goto(nextPage.url);
                // Recursive call to scrape the next page
                return scrapeCommentsRecursively(page, collectedComments);
            }
            else {
                // No more pages, return collected comments
                return collectedComments;
            }
        }
    }
    catch (error) {
        console.log(colors_1.default.rainbow("Next page button not found"));
        collectedComments = collectedComments.map((comment) => ({
            ...comment,
            pagination: {
                totalRecords: queryListOfComments.length,
                currentPage: 1,
                nextPage: { url: "", metric: 1 },
                prevPage: { url: "", metric: 1 },
            },
        }));
        return collectedComments;
    }
}
/**
 * TODO: ============================================================= [AUTHENTICATION] - check Captcha Audio verification if it requires ============================================================= */
async function checkAndSolveNormalCaptcha(page) {
    try {
        const captchaPhotoSelector = "div.a-row.a-text-center > img";
        const captchaPhotoRemoteUrl = await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            return el ? el.getAttribute("src") : "";
        }, captchaPhotoSelector);
        if (captchaPhotoRemoteUrl) {
            console.log(colors_1.default.yellow("Captcha detected, solving..."));
            const executablePath = path_1.default.join(__dirname, "../../scripts/normal+captcha.py");
            const command = `python ${executablePath} ${captchaPhotoRemoteUrl}`;
            (0, child_process_1.exec)(command, async (error, stdout, stderr) => {
                const captureValue = stdout.trim();
                console.log("Capture value ", captureValue);
                await page.waitForSelector("#captchacharacters");
                await page.type("#captchacharacters", captureValue);
                const button = await page.$(".a-button-text");
                await button.click();
                await page.waitForNavigation({ waitUntil: "domcontentloaded" });
                console.log(colors_1.default.green("Normal captcha solved and form submitted."));
            });
        }
        else {
            console.log(colors_1.default.yellow("Normal captcha not detected, proceeding to login..."));
        }
    }
    catch (err) {
        console.error("Error handling normal captcha:", err.message);
    }
}
/**
 * TODO: ============================================================= Attepmt sign in more times =============================================================
 */
async function attemptSignIn(page) {
    try {
        await page.waitForSelector("a[data-nav-ref='nav_ya_signin']", {
            timeout: 10000, // wait up to 10 seconds
        });
        const signInButton = await page.$("a[data-nav-ref='nav_ya_signin']");
        if (signInButton) {
            await signInButton.click().catch(console.error);
            await page.waitForNavigation({ waitUntil: "domcontentloaded" });
            await page.waitForSelector("#ap_email").catch(console.error);
            await page.type("#ap_email", String(process.env.AMAZON_ACCOUNT_EMAIL));
            const continueButton = await page.$("#continue").catch(console.error);
            if (continueButton) {
                await continueButton.click().catch(console.error);
            }
            else {
                console.error("Continue button not found");
            }
            await page.waitForSelector("#ap_password").catch(console.error);
            console.log(`Password is ${String(process.env.AMAZON_ACCOUNT_PW)}`);
            await page.type("#ap_password", String(process.env.AMAZON_ACCOUNT_PW));
            const signInSubmitButton = await page.$("#signInSubmit");
            if (signInSubmitButton) {
                await signInSubmitButton.click();
                await page.waitForNavigation({ waitUntil: "domcontentloaded" });
            }
            else {
                console.error("Sign-in submit button not found");
            }
            // Call the captcha check function after sign-in attempt
            await checkAndHandleCaptchaAudio(page);
        }
        else {
            console.error("Sign-in button not found");
        }
    }
    catch (err) {
        console.error("Error during sign-in attempt:", err.message);
    }
}
// Function to check for the presence of the captcha
async function checkAndHandleCaptchaAudio(page) {
    const captchaSelector = "a.a-link-normal.cvf-widget-link-alternative-captcha.cvf-widget-btn-val.cvf-widget-link-disable-target.captcha_refresh_link";
    try {
        const captchaElement = await page.waitForSelector(captchaSelector, {
            timeout: 5000, // Wait up to 5 seconds for the captcha to appear
        });
        if (captchaElement) {
            console.log(colors_1.default.yellow("Captcha detected, handling audio captcha..."));
            await captchaElement.click();
            await page.waitForNavigation({ waitUntil: "domcontentloaded" });
            const audioUrl = await page.$eval("source[type='audio/ogg']", (el) => el.getAttribute("src"));
            const client = new assemblyai_1.AssemblyAI({
                apiKey: String(process.env.ASSEMBLY_AI_API_KEY),
            });
            const data = {
                audio_url: audioUrl,
            };
            const getTranscript = async () => {
                const transcript = await client.transcripts.transcribe(data);
                return transcript.text;
            };
            const processedTranscript = await getTranscript();
            const transcriptList = processedTranscript.split(" ");
            const processedAudioCaptchaValue = transcriptList[transcriptList.length - 1].replace(".", "");
            await page.waitForSelector(".a-input-text.a-span12.cvf-widget-input.cvf-widget-input-code.cvf-widget-input-captcha.fwcim-captcha-guess");
            await page.type(".a-input-text.a-span12.cvf-widget-input.cvf-widget-input-code.cvf-widget-input-captcha.fwcim-captcha-guess", processedAudioCaptchaValue);
            const continueCaptchaButton = await page.$(".a-button.a-button-span12.a-button-primary.cvf-widget-btn-captcha.cvf-widget-btn-verify-captcha");
            if (continueCaptchaButton) {
                await continueCaptchaButton.click();
                await page.waitForNavigation({ waitUntil: "domcontentloaded" });
            }
            else {
                throw new Error("Continue button for captcha not found.");
            }
        }
    }
    catch (err) {
        if (err.name === "TimeoutError") {
            // If captcha is not detected, proceed as normal
            console.log(colors_1.default.green("Captcha Audio not detected, continuing..."));
        }
        else {
            // Handle other errors as needed, possibly retry or log them
            console.log(colors_1.default.red("Error handling audio captcha:"));
        }
    }
}
//# sourceMappingURL=scraper.js.map