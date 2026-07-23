import sharp from "sharp";

const size = 1080;
const circleMask = Buffer.from(
  `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>
  </svg>`,
);

const variants = [
  {
    input: "italypath-instagram-profile.png",
    jpeg: "italypath-instagram-profile.jpg",
    thumb: "italypath-instagram-profile-128.png",
  },
  {
    input: "italypath-instagram-profile-light.png",
    jpeg: "italypath-instagram-profile-light.jpg",
    thumb: "italypath-instagram-profile-light-128.png",
  },
];

for (const variant of variants) {
  await sharp(variant.input)
    .flatten()
    .toColourspace("srgb")
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(variant.jpeg);

  await sharp(variant.input)
    .resize(128, 128, { fit: "cover" })
    .composite([
      {
        input: Buffer.from(
          `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
            <circle cx="64" cy="64" r="64" fill="#fff"/>
          </svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(variant.thumb);
}

const darkCircleFull = await sharp(variants[0].input)
  .composite([{ input: circleMask, blend: "dest-in" }])
  .png()
  .toBuffer();

const lightCircleFull = await sharp(variants[1].input)
  .composite([{ input: circleMask, blend: "dest-in" }])
  .png()
  .toBuffer();

const darkCircle = await sharp(darkCircleFull).resize(300, 300).png().toBuffer();
const lightCircle = await sharp(lightCircleFull).resize(300, 300).png().toBuffer();

await sharp({
  create: {
    width: 720,
    height: 360,
    channels: 4,
    background: "#d8ded9",
  },
})
  .composite([
    { input: darkCircle, left: 30, top: 30 },
    { input: lightCircle, left: 390, top: 30 },
  ])
  .png({ compressionLevel: 9 })
  .toFile("italypath-instagram-circle-preview.png");
