import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const testDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDirectory, "..");
const router = require("../gateway/random/signal-router.js");
const signals = Object.fromEntries(router.SIGNALS.map((signal) => [signal.theme, signal]));
const destinations = { batman: "../", spider: "../spider/" };

const signalDistance = Math.hypot(
  signals.batman.x - signals.spider.x,
  signals.batman.y - signals.spider.y,
);
assert.ok(
  signalDistance > signals.batman.radius + signals.spider.radius,
  "Batman and Spider Man click areas must never overlap",
);

for (const viewportWidth of [320, 390, 768, 1024, 1440, 2560]) {
  const scale = router.profileImageWidth(viewportWidth) / 960;
  for (const signal of router.SIGNALS) {
    const interiorPoints = [
      [0, 0],
      [0.82, 0],
      [-0.82, 0],
      [0, 0.82],
      [0, -0.82],
      [0.56, 0.56],
      [-0.56, 0.56],
      [0.56, -0.56],
      [-0.56, -0.56],
    ];

    for (const [horizontal, vertical] of interiorPoints) {
      const clickedX = Math.round((signal.x + signal.radius * horizontal) * scale);
      const clickedY = Math.round((signal.y + signal.radius * vertical) * scale);
      assert.equal(
        router.themeFromClick(clickedX, clickedY, viewportWidth),
        signal.theme,
        `${signal.theme} logo must route correctly at ${viewportWidth}px`,
      );
      assert.equal(
        router.destinationFromQuery(`?${clickedX},${clickedY}`, viewportWidth),
        destinations[signal.theme],
      );
    }
  }
}

assert.equal(router.themeFromClick(0, 0, 1440), null);
const gapDistance = signalDistance - signals.batman.radius - signals.spider.radius;
const gapProgress = (signals.spider.radius + gapDistance / 2) / signalDistance;
const gapX = signals.spider.x + (signals.batman.x - signals.spider.x) * gapProgress;
const gapY = signals.spider.y + (signals.batman.y - signals.spider.y) * gapProgress;
assert.equal(router.themeFromClick(gapX * 0.875, gapY * 0.875, 1440), null);
assert.equal(router.destinationFromQuery("", 1440), null);
assert.equal(router.destinationFromQuery("?not-coordinates", 1440), null);

const gateway = readFileSync(resolve(projectRoot, "gateway/random/index.html"), "utf8");
const rootEntry = readFileSync(resolve(projectRoot, "index.html"), "utf8");
assert.match(gateway, /signal-router\.js/);
assert.match(gateway, /NiyantSignalRouter\.destinationFromQuery/);
assert.match(gateway, /location\.replace\(destination/);
assert.match(gateway, /https:\/\/github\.com\/Niyants101/);
assert.match(gateway, /full-logo-routing-v2/);
assert.match(rootEntry, /gateway\/random/);

process.stdout.write("PASS: each full logo routes only to its matching game at every supported profile size\n");
