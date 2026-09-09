import { randomInt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const readmePath = resolve(projectRoot, process.env.PROFILE_README_FILE || "README.md");
const statePath = resolve(projectRoot, process.env.PROFILE_STATE_FILE || ".profile-theme.json");
const requestedTheme = (process.env.PROFILE_THEME || "random").toLowerCase();
const randomGateway = "https://niyants101.github.io/Niyants101/gateway/random/";

const themes = {
  batman: {
    title: "Enter the random hero signal",
    image: "./assets/night-shift-final.gif",
    alt: "Niyant's Batman Night Shift",
  },
  spider: {
    title: "Enter the random hero signal",
    image: "./assets/spider-night-shift.gif",
    alt: "Niyant's Spider Man Night Shift",
  },
};

if (requestedTheme !== "random" && !Object.hasOwn(themes, requestedTheme)) {
  throw new Error("PROFILE_THEME must be random, batman, or spider");
}

let randomBit;
if (process.env.PROFILE_RANDOM_BIT === undefined) {
  randomBit = randomInt(2);
} else {
  randomBit = Number(process.env.PROFILE_RANDOM_BIT);
  if (randomBit !== 0 && randomBit !== 1) {
    throw new Error("PROFILE_RANDOM_BIT must be 0 or 1");
  }
}

const selectedTheme = requestedTheme === "random"
  ? (randomBit === 1 ? "batman" : "spider")
  : requestedTheme;
const theme = themes[selectedTheme];
const now = process.env.PROFILE_NOW ? new Date(process.env.PROFILE_NOW) : new Date();
if (Number.isNaN(now.getTime())) throw new Error("PROFILE_NOW must be a valid date");

const profileBlock = [
  "<!-- PROFILE_THEME_START -->",
  `<div align="center"><a href="${randomGateway}" title="${theme.title}"><img width="840" height="364" src="${theme.image}" alt="${theme.alt}" ismap></a></div>`,
  "<!-- PROFILE_THEME_END -->",
].join("\n");

const currentReadme = readFileSync(readmePath, "utf8");
const markerPattern = /<!-- PROFILE_THEME_START -->[\s\S]*?<!-- PROFILE_THEME_END -->/;
const nextReadme = markerPattern.test(currentReadme)
  ? currentReadme.replace(markerPattern, profileBlock)
  : `${profileBlock}\n\n${currentReadme}`;

writeFileSync(readmePath, nextReadme.endsWith("\n") ? nextReadme : `${nextReadme}\n`);
writeFileSync(statePath, `${JSON.stringify({
  current: selectedTheme,
  lastRoll: selectedTheme === "batman" ? 1 : 0,
  updatedAt: now.toISOString(),
}, null, 2)}\n`);

process.stdout.write(
  `Static profile banner selected: ${selectedTheme}. The linked gateway rerolls on every load.\n`,
);
