import sharp from "file:///Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/lib/index.js";

const input =
  "/Users/keremyarar/italypath-main/output/social-profile-eduitalya/eduitalya-instagram-profile.png";
const outputDir =
  "/Users/keremyarar/italypath-main/output/social-profile-eduitalya";

const circleMask = Buffer.from(`
  <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
    <circle cx="540" cy="540" r="540" fill="#fff"/>
  </svg>
`);

await sharp(input)
  .resize(128, 128, { fit: "cover" })
  .png({ compressionLevel: 9 })
  .toFile(`${outputDir}/eduitalya-instagram-profile-128.png`);

await sharp(input)
  .composite([{ input: circleMask, blend: "dest-in" }])
  .png({ compressionLevel: 9 })
  .toFile(`${outputDir}/eduitalya-instagram-circle-preview.png`);
