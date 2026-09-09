import assert from "node:assert/strict";
import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDirectory, "..");
const proxySafeLimit = 5 * 1024 * 1024;

for (const filename of ["night-shift-final.gif", "spider-night-shift.gif"]) {
  const path = resolve(projectRoot, "assets", filename);
  const size = statSync(path).size;
  assert.ok(size < proxySafeLimit, `${filename} must remain below 5 MiB`);

  const descriptor = openSync(path, "r");
  const signature = Buffer.alloc(6);
  readSync(descriptor, signature, 0, signature.length, 0);
  closeSync(descriptor);
  assert.match(signature.toString("ascii"), /^GIF8[79]a$/);
}

const batmanRenderer = readFileSync(resolve(projectRoot, "scripts", "build-profile-animations.mjs"), "utf8");
const spiderRenderer = readFileSync(resolve(projectRoot, "scripts", "render-spider-profile.js"), "utf8");
assert.doesNotMatch(batmanRenderer, /circle 824,72 829,72/);
assert.doesNotMatch(spiderRenderer, /M884 56v8/);
assert.doesNotMatch(spiderRenderer, /cx="884" cy="72" r="5"/);

process.stdout.write("PASS: both clean profile GIFs are valid, crosshair free, and below the proxy safe size\n");
