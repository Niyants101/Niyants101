import assert from "node:assert/strict";
import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const testDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDirectory, "..");
const proxySafeLimit = 5 * 1024 * 1024;
const geometry = require("../gateway/random/routing-geometry.js");

function inspectGif(filename) {
  const path = resolve(projectRoot, "assets", filename);
  const size = statSync(path).size;
  assert.ok(size < proxySafeLimit, `${filename} must remain below 5 MiB`);

  const descriptor = openSync(path, "r");
  const header = Buffer.alloc(10);
  readSync(descriptor, header, 0, header.length, 0);
  closeSync(descriptor);
  assert.match(header.subarray(0, 6).toString("ascii"), /^GIF8[79]a$/);
  return { width: header.readUInt16LE(6), height: header.readUInt16LE(8) };
}

for (const filename of ["night-shift-final.gif", "spider-night-shift.gif"]) {
  assert.deepEqual(inspectGif(filename), { width: 960, height: 416 });
}

for (const variant of geometry.VARIANTS) {
  assert.deepEqual(inspectGif(`night-shift-${variant.id}.gif`), {
    width: variant.sceneWidth,
    height: variant.sceneHeight,
  });
  assert.deepEqual(inspectGif(`spider-night-shift-${variant.id}.gif`), {
    width: variant.spiderWidth,
    height: variant.sceneHeight,
  });
}

const batmanRenderer = readFileSync(resolve(projectRoot, "scripts", "build-profile-animations.mjs"), "utf8");
const spiderRenderer = readFileSync(resolve(projectRoot, "scripts", "render-spider-profile.js"), "utf8");
assert.doesNotMatch(batmanRenderer, /circle 824,72 829,72/);
assert.doesNotMatch(spiderRenderer, /M884 56v8/);
assert.doesNotMatch(spiderRenderer, /cx="884" cy="72" r="5"/);

process.stdout.write("PASS: every responsive routing GIF is valid, aligned, crosshair free, and proxy safe\n");
