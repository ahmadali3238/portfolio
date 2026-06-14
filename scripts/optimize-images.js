/**
 * Image Optimization Script
 *
 * This script optimizes all images in the public folder by:
 * - Converting large PNGs to WebP format
 * - Compressing JPEGs
 * - Resizing images larger than 1920px
 *
 * Usage: node scripts/optimize-images.js
 *
 * Note: Run this script manually when adding new images.
 * The originals are preserved with .original extension.
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const MAX_WIDTH = 1920;
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;

// Files to skip (icons, favicons, etc.)
const SKIP_PATTERNS = [
  /android-icon/,
  /apple-icon/,
  /favicon/,
  /ms-icon/,
  /placeholder/,
  /\.ico$/,
];

async function getImageFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await getImageFiles(fullPath, files);
    } else if (/\.(png|jpg|jpeg)$/i.test(item)) {
      // Skip small files (under 100KB) and pattern matches
      const shouldSkip = SKIP_PATTERNS.some((pattern) => pattern.test(item));
      if (!shouldSkip && stat.size > 100 * 1024) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    console.log(
      `\nProcessing: ${fileName} (${Math.round(fs.statSync(filePath).size / 1024)}KB)`
    );
    console.log(`  Original: ${metadata.width}x${metadata.height}`);

    // Create backup of original
    const backupPath = filePath + ".original";
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
    }

    // Resize if too large
    let pipeline = image;
    if (metadata.width > MAX_WIDTH) {
      pipeline = pipeline.resize(MAX_WIDTH, null, {
        withoutEnlargement: true,
        fit: "inside",
      });
      console.log(`  Resizing to max width: ${MAX_WIDTH}px`);
    }

    const tempPath = filePath + ".tmp";

    // Optimize based on format
    if (ext === ".png") {
      // Convert PNG to WebP for better compression, keep PNG for compatibility
      const webpPath = filePath.replace(/\.png$/i, ".webp");

      // Need to read fresh for each output
      await sharp(filePath)
        .resize(metadata.width > MAX_WIDTH ? MAX_WIDTH : null, null, {
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({ quality: WEBP_QUALITY })
        .toFile(webpPath);

      // Also optimize the original PNG
      await sharp(filePath)
        .resize(metadata.width > MAX_WIDTH ? MAX_WIDTH : null, null, {
          withoutEnlargement: true,
          fit: "inside",
        })
        .png({ compressionLevel: 9 })
        .toFile(tempPath);

      fs.renameSync(tempPath, filePath);

      const newSize = fs.statSync(filePath).size;
      const webpSize = fs.statSync(webpPath).size;
      console.log(`  Optimized PNG: ${Math.round(newSize / 1024)}KB`);
      console.log(`  Created WebP: ${Math.round(webpSize / 1024)}KB`);
    } else {
      // Optimize JPEG
      await sharp(filePath)
        .resize(metadata.width > MAX_WIDTH ? MAX_WIDTH : null, null, {
          withoutEnlargement: true,
          fit: "inside",
        })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toFile(tempPath);

      fs.renameSync(tempPath, filePath);

      const newSize = fs.statSync(filePath).size;
      console.log(`  Optimized: ${Math.round(newSize / 1024)}KB`);
    }
  } catch (error) {
    console.error(`  Error processing ${fileName}:`, error.message);
  }
}

async function main() {
  console.log("🖼️  Image Optimization Script");
  console.log("============================\n");
  console.log(`Scanning: ${PUBLIC_DIR}`);
  console.log(`Max width: ${MAX_WIDTH}px`);
  console.log(`JPEG quality: ${JPEG_QUALITY}%`);
  console.log(`WebP quality: ${WEBP_QUALITY}%\n`);

  const files = await getImageFiles(PUBLIC_DIR);

  if (files.length === 0) {
    console.log("No large images found to optimize.");
    return;
  }

  console.log(`Found ${files.length} images to optimize:\n`);
  files.forEach((f) => console.log(`  - ${path.relative(PUBLIC_DIR, f)}`));

  for (const file of files) {
    await optimizeImage(file);
  }

  console.log("\n✅ Optimization complete!");
  console.log(
    "\nNote: Original files are preserved with .original extension."
  );
  console.log(
    "You can delete them after verifying the optimized images look good."
  );
}

main().catch(console.error);
