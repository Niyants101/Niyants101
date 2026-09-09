import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "niyant-profile-animations-"));
const spiderFrames = join(temporaryRoot, "spider-frames");
const batmanFrames = join(temporaryRoot, "batman-frames");
const batmanOutput = join(temporaryRoot, "night-shift-final.gif");
const spiderOutput = join(temporaryRoot, "spider-night-shift.gif");
const SOURCE_FPS = 30;
const PROFILE_FPS = 24;
const PROFILE_FRAME_COUNT = 173;

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    ...options,
  });
}

try {
  mkdirSync(batmanFrames, { recursive: true });
  run(process.execPath, [join(scriptDirectory, "render-spider-profile.js")], {
    env: { ...process.env, SPIDER_FRAME_DIR: spiderFrames },
  });

  run("convert", [
    join(projectRoot, "gateway", "night-shift.gif"),
    "-coalesce",
    join(batmanFrames, "frame-%03d.png"),
  ]);

  function animationArguments(frameDirectory, output) {
    const argumentsList = ["-dispose", "Background"];
    for (let frame = 0; frame < PROFILE_FRAME_COUNT; frame += 1) {
      const sourceFrame = Math.round(frame * SOURCE_FPS / PROFILE_FPS);
      const delay = frame % 6 === 5 ? "5" : "4";
      argumentsList.push(
        "-delay",
        delay,
        join(frameDirectory, `frame-${String(sourceFrame).padStart(3, "0")}.png`),
      );
    }
    argumentsList.push("-layers", "Optimize", "-loop", "0", output);
    return argumentsList;
  }

  run("convert", animationArguments(spiderFrames, spiderOutput));
  run("convert", animationArguments(batmanFrames, batmanOutput));

  renameSync(batmanOutput, join(projectRoot, "assets", "night-shift-final.gif"));
  renameSync(spiderOutput, join(projectRoot, "assets", "spider-night-shift.gif"));
  process.stdout.write("Built synchronized Batman and Spider Man profile animations\n");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
