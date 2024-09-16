import { Page } from "puppeteer";
import colors from "colors";
import path from "path";
import { exec } from "child_process";
import { AssemblyAI } from "assemblyai";

export interface PreProcessedSolver {
  execute(page: Page): Promise<void>
}

export class SignInSolver implements PreProcessedSolver {
  private audioCaptchaSolver: AudioCaptchaSolver;
  constructor() {
    this.audioCaptchaSolver = new AudioCaptchaSolver();
  }

  public async execute(page: Page): Promise<void> {
    try {
      await page.waitForSelector("a[data-nav-ref='nav_ya_signin']", {
        timeout: 50000, // wait up to 10 seconds
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
        } else {
          console.error("Continue button not found");
        }
        await page.waitForSelector("#ap_password").catch(console.error);
        await page.type("#ap_password", String(process.env.AMAZON_ACCOUNT_PW));
  
        const signInSubmitButton = await page.$("#signInSubmit");
  
        if (signInSubmitButton) {
          await signInSubmitButton.click();
          await page.waitForNavigation({ waitUntil: "domcontentloaded" });
        } else {
          console.error("Sign-in submit button not found");
        }
  
        // Call the captcha check function after sign-in attempt
        await this.audioCaptchaSolver.execute(page as Page);
      } else {
        console.error("Sign-in button not found");
      }
    } catch (err) {
      console.error("Error during sign-in attempt:", err.message);
    }
  }
}

export class NormalCaptchaSolver implements PreProcessedSolver {
  public async execute(page: Page): Promise<void> {
    try {
      const captchaPhotoSelector = "div.a-row.a-text-center > img";
      const captchaPhotoRemoteUrl = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute("src") : "";
      }, captchaPhotoSelector);
  
      if (captchaPhotoRemoteUrl) {
        console.log(colors.yellow("Captcha detected, solving..."));
        const executablePath = path.join(
          __dirname,
          "../../../src/scripts/normal+captcha.py",
        );
        const command = `python ${executablePath} ${captchaPhotoRemoteUrl}`;
        console.log(command);
  
        exec(command, async (error, stdout, stderr) => {
          const captureValue = stdout.trim();
          console.log("Capture value ", captureValue);
  
          await page.waitForSelector("#captchacharacters");
          await page.type("#captchacharacters", captureValue);
  
          const button = await page.$(".a-button-text");
          await button.click();
  
          // await page.waitForNavigation({ waitUntil: "load" });
  
          console.log(colors.green("Normal captcha solved and form submitted."));
        });
      } else {
        console.log(
          colors.yellow("Normal captcha not detected, proceeding to login..."),
        );
      }
    } catch (err) {
      console.error("Error handling normal captcha:", err.message);
    }
  }
}

export class AudioCaptchaSolver implements PreProcessedSolver {
  public async execute(page: Page): Promise<void> {
    const captchaSelector =
    "a.a-link-normal.cvf-widget-link-alternative-captcha.cvf-widget-btn-val.cvf-widget-link-disable-target.captcha_refresh_link";

  try {
    const captchaElement = await page.waitForSelector(captchaSelector, {
      timeout: 5000, // Wait up to 5 seconds for the captcha to appear
    });

    if (captchaElement) {
      console.log(colors.yellow("Captcha detected, handling audio captcha..."));
      await captchaElement.click();

      await page.waitForNavigation({ waitUntil: "domcontentloaded" });
      const audioUrl = await page.$eval("source[type='audio/ogg']", (el) =>
        el.getAttribute("src"),
      );
      const client = new AssemblyAI({
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
      const processedAudioCaptchaValue = transcriptList[
        transcriptList.length - 1
      ].replace(".", "");

      await page.waitForSelector(
        ".a-input-text.a-span12.cvf-widget-input.cvf-widget-input-code.cvf-widget-input-captcha.fwcim-captcha-guess",
      );
      await page.type(
        ".a-input-text.a-span12.cvf-widget-input.cvf-widget-input-code.cvf-widget-input-captcha.fwcim-captcha-guess",
        processedAudioCaptchaValue,
      );

      const continueCaptchaButton = await page.$(
        ".a-button.a-button-span12.a-button-primary.cvf-widget-btn-captcha.cvf-widget-btn-verify-captcha",
      );
      if (continueCaptchaButton) {
        await continueCaptchaButton.click();
        await page.waitForNavigation({ waitUntil: "domcontentloaded" });
      } else {
        throw new Error("Continue button for captcha not found.");
      }
    }
  } catch (err) {
    if (err.name === "TimeoutError") {
      // If captcha is not detected, proceed as normal
      console.log(colors.green("Captcha Audio not detected, continuing..."));
    } else {
      // Handle other errors as needed, possibly retry or log them
      console.log(colors.red("Error handling audio captcha:"));
    }
  }
  }
}