import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const testDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDirectory, "..");
const router = require("../gateway/random/signal-router.js");

for (const viewportWidth of [390, 768, 1440, 2560]) {
  const scale = router.profileImageWidth(viewportWidth) / 960;
  const batmanX = Math.round(824 * scale);
  const spiderX = Math.round(884 * scale);
  const signalY = Math.round(72 * scale);

  assert.equal(router.themeFromClick(batmanX, signalY, viewportWidth), "batman");
  assert.equal(router.themeFromClick(spiderX, signalY, viewportWidth), "spider");
  assert.equal(
    router.destinationFromQuery("?" + batmanX + "," + signalY, viewportWidth),
    "../",
  );
  assert.equal(
    router.destinationFromQuery("?" + spiderX + "," + signalY, viewportWidth),
    "../spider/",
  );
}

assert.equal(router.themeFromClick(0, 0, 1440), null);
assert.equal(
  router.themeFromClick(Math.round(854 * 0.875), Math.round(72 * 0.875), 1440),
  null,
);
assert.equal(router.destinationFromQuery("", 1440), null);
assert.equal(router.destinationFromQuery("?not-coordinates", 1440), null);

const gateway = readFileSync(resolve(projectRoot, "gateway/random/index.html"), "utf8");
const rootEntry = readFileSync(resolve(projectRoot, "index.html"), "utf8");
assert.match(gateway, /signal-router\.js/);
assert.match(gateway, /NiyantSignalRouter\.destinationFromQuery/);
assert.match(gateway, /location\.replace\(destination/);
assert.match(gateway, /https:\/\/github\.com\/Niyants101/);
assert.match(rootEntry, /gateway\/random/);

process.stdout.write("PASS: each signal glint routes to its matching game at every supported profile size\n");
