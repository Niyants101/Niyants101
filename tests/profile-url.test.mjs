import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDirectory, "..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "niyant-profile-url-"));
const readmePath = join(temporaryRoot, "README.md");
const scriptPath = resolve(projectRoot, "scripts/set-profile-worker-url.mjs");
const workerUrl = "https://niyant-random-profile.example.workers.dev/profile.gif";

copyFileSync(resolve(projectRoot, "README.md"), readmePath);
const result = spawnSync(process.execPath, [scriptPath], {
  env: {
    ...process.env,
    PROFILE_IMAGE_URL: workerUrl,
    PROFILE_README_FILE: readmePath,
  },
  encoding: "utf8",
});

assert.equal(result.status, 0, result.stderr);
const readme = readFileSync(readmePath, "utf8");
assert.ok(readme.includes(`src="${workerUrl}"`));
assert.equal((readme.match(/PROFILE_THEME_START/g) || []).length, 1);
assert.equal((readme.match(/PROFILE_THEME_END/g) || []).length, 1);
assert.ok(readme.includes("https://niyants101.github.io/Niyants101/gateway/random/"));
assert.ok(readme.includes("Click the glowing hero signal"));
assert.ok(readme.includes("Niyant's Random Hero Night Shift"));

process.stdout.write("PASS: the setup workflow connects the Worker image to synchronized signal routing\n");
