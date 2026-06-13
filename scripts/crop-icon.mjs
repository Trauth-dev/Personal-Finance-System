import sharp from "sharp"

const src = "public/prospera-logo.png"

// The full logo is 1254x1254. The "P+" mark sits in the upper-center area.
// Crop a tight square around it, then resize to 512x512 for the app icon/favicon.
const left = 345
const top = 180
const size = 595

await sharp(src)
  .extract({ left, top, width: size, height: size })
  .resize(512, 512, { fit: "cover" })
  .png()
  .toFile("public/prospera-icon.png")

// Regenerate the auto-discovered icon assets from the same P+ mark
const cropped = await sharp(src)
  .extract({ left, top, width: size, height: size })
  .png()
  .toBuffer()

await sharp(cropped).resize(180, 180, { fit: "cover" }).png().toFile("public/apple-icon.png")
await sharp(cropped).resize(32, 32, { fit: "cover" }).png().toFile("public/icon-dark-32x32.png")
await sharp(cropped).resize(32, 32, { fit: "cover" }).png().toFile("public/icon-light-32x32.png")

console.log("prospera-icon.png + apple/32x32 icons generated")
