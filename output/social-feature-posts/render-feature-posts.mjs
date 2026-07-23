import { pathToFileURL } from "node:url";
import { chromium } from "file:///Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

const posts = [
  {
    input: "/Users/keremyarar/italypath-main/output/social-feature-posts/sat/sat-post.html",
    output: "/Users/keremyarar/italypath-main/output/social-feature-posts/sat/italypath-sat-free-post.png",
  },
  {
    input: "/Users/keremyarar/italypath-main/output/social-feature-posts/volunteer/volunteer-post.html",
    output:
      "/Users/keremyarar/italypath-main/output/social-feature-posts/volunteer/italypath-volunteer-free-post.png",
  },
];

for (const post of posts) {
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(post.input).href, { waitUntil: "networkidle" });
  await page.screenshot({ path: post.output, fullPage: false });
  await page.close();
}

await browser.close();
