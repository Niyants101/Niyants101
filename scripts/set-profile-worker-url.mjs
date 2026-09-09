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
imageUrl.hash = "";
imageUrl.searchParams.set(
  "v",
  process.env.PROFILE_CACHE_VERSION || String(Date.now()),
);

const currentReadme = readFileSync(readmePath, "utf8");
const markerPattern = /<!-- PROFILE_THEME_START -->[\s\S]*?<!-- PROFILE_THEME_END -->/;
if (!markerPattern.test(currentReadme)) {
  throw new Error("Could not find the marked profile image in README.md");
}

const profileBlock = [
  "<!-- PROFILE_THEME_START -->",
  `<div align="center"><a href="https://niyants101.github.io/Niyants101/gateway/random/" title="Click the glowing hero signal"><img width="840" height="364" src="${imageUrl.href}" alt="Niyant's Random Hero Night Shift" ismap></a></div>`,
  "<!-- PROFILE_THEME_END -->",
].join("\n");
const nextReadme = currentReadme.replace(markerPattern, profileBlock);
writeFileSync(readmePath, nextReadme);
process.stdout.write(`Profile README now uses ${imageUrl.href} with synchronized signal routing\n`);
