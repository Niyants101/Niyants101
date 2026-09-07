import { randomInt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const readmePath = resolve(projectRoot, process.env.PROFILE_README_FILE || "README.md");
const statePath = resolve(projectRoot, process.env.PROFILE_STATE_FILE || ".profile-theme.json");
const requestedTheme = (process.env.PROFILE_THEME || "random").toLowerCase();

const themes = {
  batman: {
    destination: "https://niyants101.github.io/Niyants101/gateway/",
    title: "Find the Bat Signal",
    image: "./assets/night-shift-final.gif",
    alt: "Niyant's Batman Night Shift",
  },
  spider: {
    destination: "https://niyants101.github.io/Niyants101/gateway/spider/",
    title: "Find the Spider Signal",
    image: "./assets/spider-night-shift.gif",
    alt: "Niyant's Spider Man Night Shift",
  },
};

let state = { current: "batman", streak: 0 };
try {
  state = { ...state, ...JSON.parse(readFileSync(statePath, "utf8")) };
} catch {
  // A missing or invalid state file simply starts a new rotation.
}

let nextTheme;
if (Object.hasOwn(themes, requestedTheme)) {
  nextTheme = requestedTheme;
} else if (state.streak >= 2 && Object.hasOwn(themes, state.current)) {
  nextTheme = state.current === "batman" ? "spider" : "batman";
} else {
  nextTheme = randomInt(2) === 0 ? "batman" : "spider";
}

const nextStreak = nextTheme === state.current ? state.streak + 1 : 1;
const theme = themes[nextTheme];
const profileBlock = [
  "<!-- PROFILE_THEME_START -->",
  `<div align="center"><a href="${theme.destination}" title="${theme.title}"><img width="840" height="364" src="${theme.image}" alt="${theme.alt}" ismap></a></div>`,
  "<!-- PROFILE_THEME_END -->",
].join("\n");

const currentReadme = readFileSync(readmePath, "utf8");
const markerPattern = /<!-- PROFILE_THEME_START -->[\s\S]*?<!-- PROFILE_THEME_END -->/;
const nextReadme = markerPattern.test(currentReadme)
  ? currentReadme.replace(markerPattern, profileBlock)
  : `${profileBlock}\n\n${currentReadme}`;

writeFileSync(readmePath, nextReadme.endsWith("\n") ? nextReadme : `${nextReadme}\n`);
writeFileSync(statePath, `${JSON.stringify({
  current: nextTheme,
  streak: nextStreak,
  updatedAt: new Date().toISOString(),
}, null, 2)}\n`);

process.stdout.write(`Profile theme selected: ${nextTheme}\n`);
