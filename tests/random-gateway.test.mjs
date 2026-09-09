import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const testDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDirectory, "..");
const { rollTheme } = require("../gateway/random/random-theme.js");

for (let value = 0; value < 256; value += 1) {
  assert.equal(rollTheme(value), value % 2 === 1 ? "batman" : "spider");
}

const gateway = readFileSync(resolve(projectRoot, "gateway/random/index.html"), "utf8");
const rootEntry = readFileSync(resolve(projectRoot, "index.html"), "utf8");
assert.match(gateway, /chooseRandomTheme\(\)/);
assert.match(gateway, /document\.body\.dataset\.theme = theme/);
assert.match(gateway, /\.\.\/game\.js/);
assert.match(gateway, /assets\/spider-night-shift\.gif/);
assert.match(gateway, /\.\.\/night-shift\.gif/);
assert.match(gateway, /nativeX - 854/);
assert.doesNotMatch(gateway, /nativeX - 520/);
assert.match(gateway, /location\.replace\("https:\/\/github\.com\/Niyants101"\)/);
assert.match(rootEntry, /gateway\/random/);

process.stdout.write("PASS: every byte maps consistently to a fresh Batman or Spider Man gateway theme\n");
