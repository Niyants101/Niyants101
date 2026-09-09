import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const readmePath = resolve(projectRoot, process.env.PROFILE_README_FILE || "README.md");
const suppliedUrl = process.env.PROFILE_IMAGE_URL || process.argv[2];

if (!suppliedUrl) {
  throw new Error("Provide PROFILE_IMAGE_URL or pass the deployed /profile.gif URL as the first argument");
}

const imageUrl = new URL(suppliedUrl);
if (imageUrl.protocol !== "https:" || !imageUrl.pathname.endsWith("/profile.gif")) {
  throw new Error("The profile image URL must use HTTPS and end with /profile.gif");
}

const currentReadme = readFileSync(readmePath, "utf8");
const markerPattern = /(<!-- PROFILE_THEME_START -->[\s\S]*?<img\b[^>]*?\bsrc=")[^"]+("[^>]*>[\s\S]*?<!-- PROFILE_THEME_END -->)/;
if (!markerPattern.test(currentReadme)) {
  throw new Error("Could not find the marked profile image in README.md");
}

const nextReadme = currentReadme.replace(markerPattern, `$1${imageUrl.href}$2`);
writeFileSync(readmePath, nextReadme);
process.stdout.write(`Profile README now uses ${imageUrl.href}\n`);
