import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "niyant-profile-rotation-"));
const readmePath = join(temporaryRoot, "README.md");
const statePath = join(temporaryRoot, "state.json");
const scriptPath = join(projectRoot, "scripts", "rotate-profile-theme.mjs");

copyFileSync(join(projectRoot, "README.md"), readmePath);
copyFileSync(join(projectRoot, ".profile-theme.json"), statePath);

let previousTheme = null;
let observedStreak = 0;

for (let rotation = 0; rotation < 24; rotation += 1) {
  const result = spawnSync(process.execPath, [scriptPath], {
    env: {
      ...process.env,
      PROFILE_THEME: "random",
      PROFILE_README_FILE: readmePath,
      PROFILE_STATE_FILE: statePath,
    },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);

  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const readme = readFileSync(readmePath, "utf8");
  if (state.current === previousTheme) observedStreak += 1;
  else observedStreak = 1;
  previousTheme = state.current;

  assert.ok(observedStreak <= 2, "a theme never appears more than twice in a row");
  assert.equal((readme.match(/PROFILE_THEME_START/g) || []).length, 1);
  assert.equal((readme.match(/PROFILE_THEME_END/g) || []).length, 1);

  if (state.current === "spider") {
    assert.match(readme, /assets\/spider-night-shift\.gif/);
    assert.match(readme, /gateway\/spider\//);
  } else {
    assert.match(readme, /assets\/night-shift-final\.gif/);
    assert.match(readme, /Niyants101\/gateway\//);
    assert.doesNotMatch(readme, /gateway\/spider\//);
  }
}

process.stdout.write("PASS: timed profile theme rotation stays synchronized\n");
