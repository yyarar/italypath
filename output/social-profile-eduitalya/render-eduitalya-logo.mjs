import { pathToFileURL } from "node:url";
import { chromium } from "file:///Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

const page = await browser.newPage({
  viewport: { width: 1080, height: 1080 },
  deviceScaleFactor: 1,
});

await page.goto(
  pathToFileURL(
    "/Users/keremyarar/italypath-main/output/social-profile-eduitalya/eduitalya-profile-dark.html",
  ).href,
  { waitUntil: "networkidle" },
);

await page.screenshot({
  path: "/Users/keremyarar/italypath-main/output/social-profile-eduitalya/eduitalya-instagram-profile.png",
  fullPage: false,
});

await browser.close();
