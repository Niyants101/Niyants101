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
    PROFILE_CACHE_VERSION: "20260909",
    PROFILE_README_FILE: readmePath,
  },
  encoding: "utf8",
});

assert.equal(result.status, 0, result.stderr);
const readme = readFileSync(readmePath, "utf8");
for (const variant of ["wide", "laptop", "tablet", "mobile", "micro"]) {
  assert.ok(readme.includes(`/profile-${variant}.gif?v=20260909`));
}
assert.equal((readme.match(/PROFILE_THEME_START/g) || []).length, 1);
assert.equal((readme.match(/PROFILE_THEME_END/g) || []).length, 1);
assert.ok(readme.includes("https://niyants101.github.io/Niyants101/gateway/random/"));
assert.ok(readme.includes("Click only the glowing hero signal"));
assert.ok(readme.includes("Niyant's Random Hero Night Shift"));
assert.ok(readme.includes("<picture>"));
assert.ok(readme.includes("(min-width: 1280px)"));
assert.doesNotMatch(readme, /<img[^>]+(?:width|height)=/);

process.stdout.write("PASS: the setup workflow connects every responsive Worker image to synchronized routing\n");
