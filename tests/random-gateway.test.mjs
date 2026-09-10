import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const testDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDirectory, "..");
const router = require("../gateway/random/signal-router.js");
const destinations = { batman: "../", spider: "../spider/" };

for (const viewportWidth of [280, 320, 390, 480, 700, 768, 1024, 1280, 1440, 2560]) {
  const variant = router.geometry.variantForViewport(viewportWidth);
  const signals = Object.fromEntries(["batman", "spider"].map((theme) => [
    theme,
    router.geometry.signalForTheme(theme, variant),
  ]));
  const horizontalGap = signals.spider.x - signals.batman.x
    - router.HIT_TOLERANCE * (signals.batman.radiusX + signals.spider.radiusX);
  assert.ok(horizontalGap > 0.5, `${variant.id} click areas must have a rounding-safe gap`);

  for (const [theme, signal] of Object.entries(signals)) {
    const interiorPoints = [
      [0, 0],
      [0.72, 0],
      [-0.72, 0],
      [0, 0.72],
      [0, -0.72],
      [0.48, 0.48],
      [-0.48, 0.48],
      [0.48, -0.48],
      [-0.48, -0.48],
    ];

    for (const [horizontal, vertical] of interiorPoints) {
      const clickedX = Math.round(signal.x + signal.radiusX * horizontal);
      const clickedY = Math.round(signal.y + signal.radiusY * vertical);
      assert.equal(
        router.themeFromClick(clickedX, clickedY, viewportWidth),
        theme,
        `${theme} logo must route correctly at ${viewportWidth}px`,
      );
      assert.equal(
        router.destinationFromQuery(`?${clickedX},${clickedY}`, viewportWidth),
        destinations[theme],
      );
    }

    for (let degrees = 0; degrees < 360; degrees += 15) {
      const radians = degrees * Math.PI / 180;
      const clickedX = Math.round(signal.x + signal.radiusX * Math.cos(radians));
      const clickedY = Math.round(signal.y + signal.radiusY * Math.sin(radians));
      assert.equal(
        router.themeFromClick(clickedX, clickedY, viewportWidth),
        theme,
        `${theme} outer logo edge must route correctly at ${viewportWidth}px and ${degrees} degrees`,
      );
    }
  }
}

assert.equal(router.themeFromClick(0, 0, 1440), null);
const wide = router.geometry.variantForViewport(1440);
const wideBatman = router.geometry.signalForTheme("batman", wide);
const wideSpider = router.geometry.signalForTheme("spider", wide);
const gapX = (wideBatman.x + wideBatman.radiusX + wideSpider.x - wideSpider.radiusX) / 2;
assert.equal(router.themeFromClick(gapX, wideBatman.y, 1440), null);
assert.equal(router.destinationFromQuery("", 1440), null);
assert.equal(router.destinationFromQuery("?not-coordinates", 1440), null);

const gateway = readFileSync(resolve(projectRoot, "gateway/random/index.html"), "utf8");
const rootEntry = readFileSync(resolve(projectRoot, "index.html"), "utf8");
assert.match(gateway, /signal-router\.js/);
assert.match(gateway, /routing-geometry\.js/);
assert.match(gateway, /NiyantSignalRouter\.destinationFromQuery/);
assert.match(gateway, /location\.replace\(destination/);
assert.match(gateway, /https:\/\/github\.com\/Niyants101/);
assert.match(gateway, /hidden-geometry-v1/);
assert.match(rootEntry, /gateway\/random/);

process.stdout.write("PASS: hidden geometry routes each aligned logo to only its matching game at every size\n");
