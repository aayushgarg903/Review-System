import fs from "fs/promises";
import path from "path";
import process from "process";
import url from "url";
import QRCode from "qrcode";

export function isValidSlug(slug) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

export function buildUrl(siteUrl, slug) {
  if (!siteUrl || typeof siteUrl !== "string" || !siteUrl.startsWith("https://")) {
    throw new Error("SITE_URL must be set and start with https://");
  }
  if (!isValidSlug(slug)) {
    throw new Error("Invalid slug format. Only lowercase letters, numbers, and hyphens allowed (no leading/trailing hyphens).");
  }
  const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
  return `${base}/r/${slug}`;
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: node scripts/make-qr.mjs <slug>");
    process.exit(1);
  }

  try {
    const siteUrl = process.env.SITE_URL;
    const targetUrl = buildUrl(siteUrl, slug);
    
    await fs.mkdir("qr", { recursive: true });

    const options = {
      errorCorrectionLevel: "Q",
      margin: 4,
    };

    const svgPath = path.join("qr", `${slug}.svg`);
    const pngPath = path.join("qr", `${slug}.png`);

    await QRCode.toFile(svgPath, targetUrl, { ...options, type: 'svg' });
    await QRCode.toFile(pngPath, targetUrl, { ...options, type: 'png', width: 1200 });

    console.log(`\nExact Encoded URL: ${targetUrl}`);
    console.log(`Files generated:`);
    console.log(`  - ${svgPath}`);
    console.log(`  - ${pngPath} (1200px)`);
    console.log(`\nIMPORTANT: Please scan the printed card with BOTH an iPhone and an Android phone before delivery!\n`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  main();
}
