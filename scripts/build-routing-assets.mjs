import { execFileSync } from "node:child_process";
import { mkdtempSync, renameSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const assetsDirectory = join(projectRoot, "assets");
const geometry = require(join(projectRoot, "gateway", "random", "routing-geometry.js"));
const temporaryRoot = mkdtempSync(join(tmpdir(), "niyant-routing-assets-"));

const themes = Object.freeze({
  batman: Object.freeze({ source: "night-shift-final.gif", prefix: "night-shift" }),
  spider: Object.freeze({ source: "spider-night-shift.gif", prefix: "spider-night-shift" }),
});

function run(command, args) {
  execFileSync(command, args, { cwd: projectRoot, stdio: "inherit" });
}

try {
  for (const variant of geometry.VARIANTS) {
    for (const [theme, files] of Object.entries(themes)) {
      const outputName = `${files.prefix}-${variant.id}.gif`;
      const temporaryOutput = join(temporaryRoot, outputName);
      const argumentsList = [
        join(assetsDirectory, files.source),
        "-coalesce",
        "-resize",
        `${variant.sceneWidth}x${variant.sceneHeight}!`,
      ];

      if (theme === "spider") {
        argumentsList.push(
          "-gravity",
          "center",
          "-background",
          "none",
          "-extent",
          `${variant.spiderWidth}x${variant.sceneHeight}`,
        );
      }

      argumentsList.push("-layers", "Optimize", "-loop", "0", temporaryOutput);
      run("convert", argumentsList);
      renameSync(temporaryOutput, join(assetsDirectory, outputName));
      process.stdout.write(`Built ${theme} ${variant.id} routing animation\n`);
    }
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
