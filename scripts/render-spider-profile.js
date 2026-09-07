const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const WIDTH = 960;
const HEIGHT = 416;
const FPS = 30;
const DURATION = 7.2;
const FRAME_COUNT = Math.round(FPS * DURATION);
const projectRoot = path.resolve(__dirname, "..");
const frameDirectory = process.env.SPIDER_FRAME_DIR || path.join(__dirname, ".spider-frames");
const signal = fs.readFileSync(path.join(projectRoot, "gateway", "spider-signal.svg")).toString("base64");

fs.mkdirSync(frameDirectory, { recursive: true });

const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));
const lerp = (start, end, progress) => start + (end - start) * progress;
const ease = (progress) => progress * progress * (3 - 2 * progress);

function swing(anchor, radius, startAngle, endAngle, progress) {
  const safeProgress = clamp(progress);
  const motion = safeProgress - 0.55 * Math.sin(Math.PI * 2 * safeProgress) / (Math.PI * 2);
  const angle = lerp(startAngle, endAngle, motion) * Math.PI / 180;
  return {
    x: anchor.x + Math.sin(angle) * radius,
    y: anchor.y + Math.cos(angle) * radius,
    progress: safeProgress,
  };
}

function swingState(point, web, nextWeb) {
  const retractProgress = clamp((point.progress - 0.7) / 0.14);
  const shotProgress = clamp((point.progress - 0.84) / 0.14);
  return {
    ...point,
    web,
    nextWeb,
    retractProgress,
    shotProgress,
    released: point.progress >= 0.84,
  };
}

function heroAt(time) {
  if (time < 2.25) {
    return swingState(swing({ x: 360, y: 80 }, 180, -55, 60, time / 2.25), 1, 2);
  }
  if (time < 4.72) {
    return swingState(swing({ x: 680, y: 70 }, 192, -58.65, 60, (time - 2.25) / 2.47), 2, 3);
  }
  return swingState(
    swing({ x: 1014, y: 80 }, 189, -62.95, 57.2, (time - 4.72) / (DURATION - 4.72)),
    3,
    1,
  );
}

function buildings(offset, layer) {
  const specifications = layer === 0
    ? [[0, 130, 100], [118, 188, 78], [218, 118, 132], [378, 205, 94], [500, 150, 116], [646, 218, 90], [766, 164, 138], [925, 196, 105]]
    : [[0, 202, 138], [166, 260, 122], [314, 190, 158], [500, 272, 134], [663, 223, 154], [846, 252, 139]];
  const farColors = ["#1d2140", "#20264a", "#2b1e3c", "#152b4a"];
  const nearColors = ["#0c1026", "#121935", "#21122f", "#13243b", "#24162f"];
  const windowColors = ["#ff6877", "#6f91ff", "#d089ef", "#efbd66", "#62d6ff"];
  let output = "";

  for (let copy = -1; copy < 3; copy += 1) {
    specifications.forEach(([buildingX, buildingHeight, buildingWidth], index) => {
      const x = buildingX + copy * 1050 - (offset % 1050);
      const y = HEIGHT - 48 - buildingHeight;
      const palette = layer === 0 ? farColors : nearColors;
      const color = palette[(index + copy + 12) % palette.length];
      output += `<rect x="${x}" y="${y}" width="${buildingWidth}" height="${buildingHeight + 55}" fill="${color}"/>`;

      if ((index + copy + 12) % 3 === 0) {
        output += `<path d="M${x + buildingWidth * 0.28} ${y}h${buildingWidth * 0.44}l-8-15h-${buildingWidth * 0.44 - 16}z" fill="#3c3156"/>`;
      }

      if (layer === 1) {
        for (let windowX = x + 14; windowX < x + buildingWidth - 10; windowX += 25) {
          for (let windowY = y + 22; windowY < y + buildingHeight - 18; windowY += 31) {
            const colorIndex = (Math.round(windowX / 20) + Math.round(windowY / 20) + index + 30) % windowColors.length;
            const opacity = Math.round(windowX + windowY) % 3 ? 0.26 : 0.76;
            output += `<rect x="${windowX}" y="${windowY}" width="9" height="14" rx="1" fill="${windowColors[colorIndex]}" opacity="${opacity}"/>`;
          }
        }

        if ((index + copy + 12) % 2 === 0) {
          const tankX = x + buildingWidth * 0.43;
          output += `<g fill="#36415e"><rect x="${tankX}" y="${y - 18}" width="${buildingWidth * 0.26}" height="18"/><path d="M${tankX + 5} ${y - 18}v-9m${buildingWidth * 0.18} 9v-9" stroke="#7784a1" stroke-width="3"/></g>`;
        }

        if ((index + copy + 12) % 4 === 1) {
          output += `<g stroke="#5b5370" stroke-width="3" opacity=".8"><path d="M${x + buildingWidth - 4} ${y + 45}h18v52h-18m0-27h18m-12-25l12 25m-12 0l12 27" fill="none"/></g>`;
        }
      }
    });
  }
  return output;
}

function webLines(point) {
  const anchors = { 1: { x: 360, y: 80 }, 2: { x: 680, y: 70 }, 3: { x: 1014, y: 80 } };
  const nextAnchors = { 1: { x: 1320, y: 80 }, 2: anchors[2], 3: anchors[3] };
  const shifts = [-WIDTH, 0, WIDTH];
  let output = "";

  if (!point.released) {
    const anchor = anchors[point.web];
    const handX = point.x + 17;
    const handY = point.y - 11;
    const progress = ease(point.retractProgress);
    const endX = lerp(anchor.x, handX, progress);
    const endY = lerp(anchor.y, handY, progress);
    shifts.forEach((shift) => {
      output += `<line x1="${handX + shift}" y1="${handY}" x2="${endX + shift}" y2="${endY}" stroke="#eefcff" stroke-width="2.4"/><circle cx="${endX + shift}" cy="${endY}" r="4" fill="#ffffff"/>`;
    });
  }

  if (point.shotProgress > 0) {
    const anchor = nextAnchors[point.nextWeb];
    const handX = point.x + 17;
    const handY = point.y - 11;
    const progress = ease(point.shotProgress);
    const endX = lerp(handX, anchor.x, progress);
    const endY = lerp(handY, anchor.y, progress);
    shifts.forEach((shift) => {
      output += `<line x1="${handX + shift}" y1="${handY}" x2="${endX + shift}" y2="${endY}" stroke="#ffffff" stroke-width="2.2"/><circle cx="${endX + shift}" cy="${endY}" r="3.5" fill="#effcff"/>`;
    });
  }
  return output;
}

function spiderHero(point) {
  const draw = (x) => `<g transform="translate(${x.toFixed(1)} ${point.y.toFixed(1)}) scale(.8)">
    <path d="M-11 52l-11 34m33-34l12 34" stroke="#17478f" stroke-width="11" stroke-linecap="round"/>
    <path d="M-25 87h17m24 0h18" stroke="#d82d49" stroke-width="5"/>
    <path d="M-15 5h30l8 49L0 68l-22-14z" fill="#174990" stroke="#6d8bc4" stroke-width="2"/>
    <path d="M-14 7h28l-4 31L0 44-10 38z" fill="#d72e49"/>
    <path d="M-12 12l-27 20m51-20l27-18" stroke="#d72e49" stroke-width="9" stroke-linecap="round"/>
    <path d="M0 13v25m-8-19l16 12m0-12L-8 31" stroke="#1a1724" stroke-width="1.5"/>
    <path d="M-17-27c0-15 8-24 17-24s17 9 17 24v15H-17z" fill="#d72e49" stroke="#4c1b2a" stroke-width="2"/>
    <g fill="#f5fbff" stroke="#11182a" stroke-width="2"><path d="M-12-34c6 1 9 4 10 12-6-1-9-5-10-12z"/><path d="M12-34c-6 1-9 4-10 12 6-1 9-5 10-12z"/></g>
    <g stroke="#541b2b" stroke-width="1" fill="none"><path d="M0-49v36M-15-39Q0-28 15-39M-16-27Q0-18 16-27"/></g>
  </g>`;
  return draw(point.x - WIDTH) + draw(point.x) + draw(point.x + WIDTH);
}

function spiderDrone(point) {
  const draw = (x) => `<g transform="translate(${x - 78} ${point.y + 26}) scale(.78)">
    <path d="M-19 19l-17 12m19-4l-12 20m48-28l17 12m-19-4l12 20" stroke="#ff5f77" stroke-width="4" stroke-linecap="round"/>
    <path d="M0-7v-11m-5 0h10" stroke="#79dfff" stroke-width="3"/>
    <rect x="-22" y="-6" width="44" height="33" rx="12" fill="#243a67" stroke="#ff5f77" stroke-width="2"/>
    <path d="M-13 7c5 0 8 3 9 9-5-1-8-4-9-9zm26 0c-5 0-8 3-9 9 5-1 8-4 9-9z" fill="#eaffff"/>
    <path d="M-10 27l5 20m15-20L5 47" stroke="#79dfff" stroke-width="4"/>
  </g>`;
  return draw(point.x - WIDTH) + draw(point.x) + draw(point.x + WIDTH);
}

function frameSvg(frameIndex) {
  const time = frameIndex / FPS;
  const hero = heroAt(time);
  const drone = heroAt((time - 0.48 + DURATION) % DURATION);
  const farOffset = time / DURATION * 1050;
  const nearOffset = time / DURATION * 2100;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#070511"/><stop offset=".56" stop-color="#11152f"/><stop offset="1" stop-color="#26132c"/></linearGradient>
    <radialGradient id="signal"><stop stop-color="#ffcad2" stop-opacity=".34"/><stop offset=".45" stop-color="#e13c57" stop-opacity=".16"/><stop offset="1" stop-color="#e13c57" stop-opacity="0"/></radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>
  <rect width="960" height="416" rx="16" fill="url(#sky)"/>
  <g fill="#aabfff" opacity=".48"><circle cx="470" cy="38" r="1.5"/><circle cx="575" cy="112" r="1"/><circle cx="740" cy="41" r="1.5"/><circle cx="913" cy="145" r="1"/></g>
  ${buildings(farOffset, 0)}${buildings(nearOffset, 1)}
  <circle cx="852" cy="72" r="75" fill="url(#signal)" filter="url(#soft)"/>
  <image href="data:image/svg+xml;base64,${signal}" x="797" y="21" width="110" height="104"/>
  <g fill="#080a18"><rect x="315" y="80" width="90" height="282"/><rect x="635" y="70" width="90" height="292"/><rect x="930" y="80" width="30" height="282"/></g>
  <g fill="#3a3158"><rect x="330" y="112" width="14" height="22"/><rect x="660" y="102" width="14" height="22"/><rect x="692" y="102" width="14" height="22"/><rect x="942" y="112" width="12" height="22"/></g>
  <g stroke="#f1fbff" stroke-width="2"><path d="M360 80V54"/><path d="M680 70V44"/><path d="M1014 80V54"/></g>
  ${webLines(hero)}${spiderDrone(drone)}${spiderHero(hero)}
  <path d="M0 378h150l25-27h210l22 27h180l30-36h190l26 36h147v38H0z" fill="#04040c"/>
  <g><rect x="28" y="25" width="330" height="82" rx="4" fill="#080511" opacity=".86"/><text x="45" y="58" fill="#f4fbff" font-family="monospace" font-size="27" font-weight="700" letter-spacing="2">NIYANT SITHAMRAJU</text><text x="47" y="87" fill="#ff647a" font-family="monospace" font-size="15" letter-spacing="7">ROBOTICS</text></g>
  <rect x="1.5" y="1.5" width="957" height="413" rx="14.5" fill="none" stroke="#433052" stroke-width="3"/>
  </svg>`;
}

(async () => {
  for (let frameIndex = 0; frameIndex < FRAME_COUNT; frameIndex += 1) {
    const filename = path.join(frameDirectory, `frame-${String(frameIndex).padStart(3, "0")}.png`);
    await sharp(Buffer.from(frameSvg(frameIndex))).png().toFile(filename);
  }
  process.stdout.write(`${frameDirectory}\n`);
})();
