import fs from 'fs';
import path from 'path';

async function processIcon() {
  console.log("Loading jimp library...");
  let Jimp;
  try {
    const jimpModule = await import('jimp');
    if (jimpModule.Jimp) {
      Jimp = jimpModule.Jimp;
    } else {
      Jimp = jimpModule.default;
    }
  } catch (err) {
    console.error("Failed to load jimp:", err);
    process.exit(1);
  }

  const rawPath = path.join(process.cwd(), 'public', 'icon-raw.png');
  const target192 = path.join(process.cwd(), 'public', 'icon-192.png');
  const target512 = path.join(process.cwd(), 'public', 'icon-512.png');
  const targetMaskable = path.join(process.cwd(), 'public', 'icon-maskable.png');
  const appleTouch = path.join(process.cwd(), 'public', 'apple-touch-icon.png');
  const finalIcon = path.join(process.cwd(), 'public', 'icon.png');

  if (!fs.existsSync(rawPath)) {
    console.error(`Raw icon not found at ${rawPath}`);
    process.exit(1);
  }

  try {
    console.log("Reading raw icon file...");
    const rawImage = await Jimp.read(rawPath);

    // 1. Create a 512x512 standard icon with solid white background
    console.log("Creating standard 512x512 icon with solid white background...");
    const background512 = new Jimp({ width: 512, height: 512, color: 0xffffffff });
    
    // Resize original transparent icon leaving nice padding (scale to 360x360)
    const resizedOriginal = rawImage.clone().resize({ w: 360, h: 360 });
    
    // Center composite
    const x = Math.floor((512 - 360) / 2);
    const y = Math.floor((512 - 360) / 2);
    background512.composite(resizedOriginal, x, y);
    await background512.write(target512);
    // Also save as main icon.png
    await background512.write(finalIcon);
    console.log("Saved standard 512x512 icon.");

    // 2. Create the 192x192 version
    console.log("Creating standard 192x192 icon...");
    const background192 = new Jimp({ width: 192, height: 192, color: 0xffffffff });
    const resizedOriginal192 = rawImage.clone().resize({ w: 135, h: 135 });
    const x192 = Math.floor((192 - 135) / 2);
    const y192 = Math.floor((192 - 135) / 2);
    background192.composite(resizedOriginal192, x192, y192);
    await background192.write(target192);
    console.log("Saved 192x192 icon.");

    // 3. Create the 180x180 version for Apple iOS devices
    console.log("Creating apple-touch-icon 180x180 icon...");
    const background180 = new Jimp({ width: 180, height: 180, color: 0xffffffff });
    const resizedOriginal180 = rawImage.clone().resize({ w: 126, h: 126 });
    const x180 = Math.floor((180 - 126) / 2);
    const y180 = Math.floor((180 - 126) / 2);
    background180.composite(resizedOriginal180, x180, y180);
    await background180.write(appleTouch);
    console.log("Saved apple-touch-icon 180x180 icon.");

    // 4. Create a Maskable version (needs a bit more padding: centered in 65% safe zone)
    console.log("Creating maskable 512x512 icon (safeguarded)...");
    const backgroundMask = new Jimp({ width: 512, height: 512, color: 0xffffffff });
    // Shrink item to 300x300 to stay within the 65% safe zone circle for maskable PWA specs
    const resizedMaskOriginal = rawImage.clone().resize({ w: 300, h: 300 });
    const xMask = Math.floor((512 - 300) / 2);
    const yMask = Math.floor((512 - 300) / 2);
    backgroundMask.composite(resizedMaskOriginal, xMask, yMask);
    await backgroundMask.write(targetMaskable);
    console.log("Saved maskable 512x512 icon.");

    console.log("All icons processed beautifully with white solid background backgrounds, preventing black-edges on Android/iOS!");
  } catch (error) {
    console.error("Error processing icons:", error);
    process.exit(1);
  }
}

processIcon();
