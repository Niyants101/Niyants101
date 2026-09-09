import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDirectory, "..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "niyant-profile-banner-"));
const readmePath = join(temporaryRoot, "README.md");
const statePath = join(temporaryRoot, "state.json");
const scriptPath = join(projectRoot, "scripts", "rotate-profile-theme.mjs");
const randomGateway = "https://niyants101.github.io/Niyants101/gateway/random/";

copyFileSync(join(projectRoot, "README.md"), readmePath);
copyFileSync(join(projectRoot, ".profile-theme.json"), statePath);

function runRotation(randomBit) {
  const result = spawnSync(process.execPath, [scriptPath], {
    env: {
      ...process.env,
      PROFILE_THEME: "random",
      PROFILE_RANDOM_BIT: String(randomBit),
      PROFILE_NOW: "2026-09-09T12:00:00.000Z",
      PROFILE_README_FILE: readmePath,
      PROFILE_STATE_FILE: statePath,
    },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return {
    readme: readFileSync(readmePath, "utf8"),
    state: JSON.parse(readFileSync(statePath, "utf8")),
  };
}

let files = runRotation(0);
assert.equal(files.state.current, "spider");
assert.equal(files.state.lastRoll, 0);
assert.match(files.readme, /assets\/spider-night-shift\.gif/);
assert.ok(files.readme.includes(randomGateway));

files = runRotation(1);
assert.equal(files.state.current, "batman");
assert.equal(files.state.lastRoll, 1);
assert.match(files.readme, /assets\/night-shift-final\.gif/);
assert.ok(files.readme.includes(randomGateway));
assert.equal((files.readme.match(/PROFILE_THEME_START/g) || []).length, 1);
assert.equal((files.readme.match(/PROFILE_THEME_END/g) || []).length, 1);

process.stdout.write("PASS: the optional static banner selector always links to the random gateway\n");
