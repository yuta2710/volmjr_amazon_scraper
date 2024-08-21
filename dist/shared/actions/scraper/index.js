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
const pipelines_1 = require("../pipelines");
// import { PuppeteerCrawler } from 'crawlee';
async function scrapeAmazonProduct(url) {
    if (!url)
        return;
    const browser = await puppeteer_1.default.launch({
        defaultViewport: { width: 800, height: 600 },
        headless: false,
    });
    const page = await browser.newPage();
    await page.goto(url);
    try {
        // const solver = new TwoCaptcha.Solver(TWOCAPCHA_API_KEY)
        const captchaPhotoRemoteUrl = await page.$eval("div.a-row.a-text-center > img", (node) => node.getAttribute("src"));
        console.log("\nLink " + captchaPhotoRemoteUrl);
        let captureValue;
        if (captchaPhotoRemoteUrl) {
            const executablePath = path_1.default.join(__dirname, "../../../../src/scripts/normal+captcha.py");
            console.log("Executable path: " + executablePath);
            const command = `python ${executablePath} ${captchaPhotoRemoteUrl}`;
            (0, child_process_1.exec)(command, async (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                    return;
                }
                captureValue = stdout.trim();
                console.log(`Result from python file`);
                console.log(captureValue);
                await page.waitForSelector("#captchacharacters");
                await page.type("#captchacharacters", captureValue);
                const button = await page.$(".a-button-text");
                button.click();
                // setTimeout(async () => {
                // await page.waitForNavigation({ waitUntil: "domcontentloaded" });
                // }, 2000); // 1000 milliseconds = 1 second
            });
        }
        await page.waitForNavigation({ waitUntil: "domcontentloaded" });
        const signInButton = await page.$("a[data-nav-ref='nav_ya_signin']");
        if (signInButton) {
            await signInButton.click();
            await page.waitForNavigation({ waitUntil: "domcontentloaded" });
            await page.waitForSelector("#ap_email");
            await page.type("#ap_email", "nguyenphucloi2710@gmail.com");
            const continueButton = await page.$("#continue");
            await continueButton.click();
            await page.waitForSelector("#ap_password");
            await page.type("#ap_password", "phucloi2710");
            const signInSubmitButton = await page.$("#signInSubmit");
            await signInSubmitButton.click();
            await page.waitForNavigation({ waitUntil: "domcontentloaded" });
            setTimeout(async () => {
                const changeToAudioCaptchaButton = await page.$("a.a-link-normal.cvf-widget-link-alternative-captcha.cvf-widget-btn-val.cvf-widget-link-disable-target.captcha_refresh_link");
                if (changeToAudioCaptchaButton) {
                    await changeToAudioCaptchaButton.click();
                    await page.waitForNavigation({ waitUntil: "domcontentloaded" });
                    const audioUrl = await page.$eval("source[type='audio/ogg']", (el) => el.getAttribute("src"));
                    console.log(`This is ${audioUrl}`);
                    // Start by making sure the `assemblyai` package is installed.
                    // If not, you can install it by running the following command:
                    // npm install assemblyai
                    console.log("API KEY = ", process.env.ASSEMBLY_AI_API_KEY);
                    const client = new assemblyai_1.AssemblyAI({
                        apiKey: String(process.env.ASSEMBLY_AI_API_KEY),
                    });
                    // Request parameters
                    const data = {
                        audio_url: audioUrl,
                    };
                    const getTranscript = async () => {
                        const transcript = await client.transcripts.transcribe(data);
                        console.log(transcript.text);
                        return transcript.text;
                    };
                    const processedTranscript = await getTranscript();
                    const transcriptList = processedTranscript.split(" ");
                    console.log("Haha " +
                        transcriptList[transcriptList.length - 1].replace(".", ""));
                    const processedAudioCaptchaValue = transcriptList[transcriptList.length - 1].replace(".", "");
                    await page.waitForSelector(".a-input-text.a-span12.cvf-widget-input.cvf-widget-input-code.cvf-widget-input-captcha.fwcim-captcha-guess");
                    await page.type(".a-input-text.a-span12.cvf-widget-input.cvf-widget-input-code.cvf-widget-input-captcha.fwcim-captcha-guess", processedAudioCaptchaValue);
                    const continueButton = await page.$(".a-button.a-button-span12.a-button-primary.cvf-widget-btn-captcha.cvf-widget-btn-verify-captcha");
                    await continueButton.click();
                    await page.waitForNavigation({ waitUntil: "domcontentloaded" });
                }
            }, 2000);
            /** Scrape the main data of the products */
            const asin = (0, pipelines_1.extractAsinFromUrl)(page.url(), pipelines_1.ProductFieldExtractorFromUrl.ASIN);
            const title = (await page.$eval("#productTitle", (span) => span.textContent)).trim();
            // await page.waitForSelector("span", {timeout: 5_000})
            const price = (await page.$eval(".a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay", (el) => el.textContent)).trim();
            const averageRating = await page.$eval(".a-icon-alt", (el) => el.textContent);
            console.log({ asin, title, price, averageRating });
            // // After saved asin, title, price...., navigate to comment page
            const reviewButton = await page.$(".a-link-emphasis.a-text-bold");
            await reviewButton.click();
            await page.waitForNavigation({ waitUntil: "domcontentloaded" });
            /** Change the sort by type */
            // setTimeout(async () => {
            //   const sortByButton = await page.$(
            //     ".a-button.a-button-dropdown.cr-sort-dropdown",
            //   );
            //   await sortByButton.click();
            //   const mostRecentButton = await page.$("a#sort-order-dropdown_1");
            //   await mostRecentButton.click(); // Click to change the client-side URL.
            // }, 2000);
            const comment_url = page.url() + "&sortBy=recent&pageNumber=1";
            console.log("After navigate = ", comment_url);
            await page.goto(comment_url);
            // await page.waitForNavigation({ waitUntil: "domcontentloaded" });
            // console.log(currentUrlInCommentPageComponents)
            /** Scrape the comments steps */
            // const listOfComments = await page.$$(".review.aok-relative");
            try {
                const commentContainer = await page.$(".a-section.a-spacing-none.reviews-content.a-size-base");
                const listOfComments = await commentContainer.$$("div[data-hook='review']");
                console.log("Length of this list of comments = ", listOfComments.length);
                for (let i = 0; i < listOfComments.length; i++) {
                    const title = await listOfComments[i].$eval(".a-size-base.a-link-normal.review-title.a-color-base.review-title-content.a-text-bold", (el) => el.textContent);
                    const description = await listOfComments[i].$eval(".a-size-base.review-text.review-text-content", (el) => el.textContent);
                    const pipelineTitleAndRating = title
                        .split("\n")
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0);
                    const pipelineDescription = (0, pipelines_1.processNewlineSeparatedText)(description);
                    const verifiedPurchase = (await listOfComments[i].$eval(".a-size-mini.a-color-state.a-text-bold", (el) => el.textContent)) !== "";
                    let helpfulCount = null;
                    try {
                        helpfulCount = await listOfComments[i].$eval("span[data-hook='helpful-vote-statement']", (el) => el.textContent);
                        console.log("Helpful count = ", helpfulCount);
                    }
                    catch (error) {
                        helpfulCount = "Unknown";
                    }
                    console.log({
                        rating: pipelineTitleAndRating[0].trim(),
                        title: pipelineTitleAndRating[1].trim(),
                        description: pipelineDescription,
                        verifiedPurchase,
                        helpfulCount,
                    });
                }
            }
            catch (error) {
                console.log(error);
            }
            // reviewerType=all_reviews&filterByStar=all_stars&pageNumber=1&sortBy=recent
            // https://www.amazon.com/Tanisa-Organic-Spring-Paper-Wrapper/product-reviews/B07KXPKRNK/ref=cm_cr_arp_d_viewpnt_lft?ie=UTF8&reviewerType=all_reviews&filterByStar=all_stars&pageNumber=1
        }
        else {
            console.error("Sign-in button not found");
        }
    }
    catch (error) { }
    // await browser.close();
    try {
    }
    catch (err) {
        console.log(err);
    }
}
//# sourceMappingURL=index.js.map