import { execFileSync } from "node:child_process";
import { mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "niyant-profile-signals-"));
const spiderFrames = join(temporaryRoot, "spider-frames");
const batmanOutput = join(temporaryRoot, "night-shift-final.gif");
const spiderOutput = join(temporaryRoot, "spider-night-shift.gif");

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    ...options,
  });
}

try {
  run(process.execPath, [join(scriptDirectory, "render-spider-profile.js")], {
    env: { ...process.env, SPIDER_FRAME_DIR: spiderFrames },
  });

  const spiderArguments = ["-dispose", "Background"];
  for (let frame = 0; frame < 216; frame += 1) {
    const delay = frame % 3 === 1 ? "4" : "3";
    spiderArguments.push(
      "-delay",
      delay,
      join(spiderFrames, `frame-${String(frame).padStart(3, "0")}.png`),
    );
  }
  spiderArguments.push("-layers", "Optimize", "-loop", "0", spiderOutput);
  run("convert", spiderArguments);

  run("convert", [
    join(projectRoot, "gateway", "night-shift.gif"),
    "-coalesce",
    "-fill", "rgba(232,255,251,0.96)",
    "-stroke", "rgba(111,255,232,0.92)",
    "-strokewidth", "1.4",
    "-draw", "circle 824,72 829,72 line 824,56 824,64 line 824,80 824,88 line 808,72 816,72 line 832,72 840,72",
    "-fill", "none",
    "-stroke", "rgba(111,255,232,0.58)",
    "-strokewidth", "1.8",
    "-draw", "circle 824,72 836,72",
    "-layers", "Optimize",
    "-loop", "0",
    batmanOutput,
  ]);

  renameSync(batmanOutput, join(projectRoot, "assets", "night-shift-final.gif"));
  renameSync(spiderOutput, join(projectRoot, "assets", "spider-night-shift.gif"));
  process.stdout.write("Built synchronized Batman and Spider Man profile animations\n");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
