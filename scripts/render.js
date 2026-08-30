const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const W = 960, H = 416, FPS = 20, DURATION = 6.5, FRAMES = FPS * DURATION;
const root = path.resolve(__dirname, '..');
const frames = path.join(root, 'frames');
fs.mkdirSync(frames, { recursive: true });

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);

function swing(anchor, radius, a0, a1, p) {
  const a = lerp(a0, a1, ease(clamp(p))) * Math.PI / 180;
  return { x: anchor.x + Math.sin(a) * radius, y: anchor.y + Math.cos(a) * radius, angle: lerp(-20, 24, p) };
}

function heroAt(t) {
  if (t < .55) {
    const p = ease(t / .55);
    return { x: lerp(-70, 120, p), y: lerp(210, 196, p), shot: 1, shotP: t / .55 };
  }
  if (t < 2.7) return { ...swing({x:300,y:70}, 220, -55, 60, (t-.55)/2.15), rope: 1 };
  if (t < 3.12) {
    const p = ease((t-2.7)/.42);
    return { x: lerp(491, 520, p), y: lerp(180, 196, p), shot: 2, shotP: (t-2.7)/.42 };
  }
  if (t < 5.55) return { ...swing({x:700,y:70}, 220, -55, 65, (t-3.12)/2.43), rope: 2 };
  const p = ease((t-5.55)/.95);
  return { x: lerp(899, 1080, p), y: lerp(163, 205, p) };
}

function buildings(offset, layer, color, windowColor) {
  const specs = layer === 0
    ? [[0,120,110],[140,165,90],[255,110,135],[390,190,100],[535,135,125],[700,205,95],[820,150,140]]
    : [[0,190,150],[180,245,130],[340,175,170],[535,260,145],[705,210,165],[900,235,150]];
  let out = '';
  for (let copy = -1; copy < 3; copy++) {
    for (const [bx,bh,bw] of specs) {
      let x = bx + copy * 1050 - (offset % 1050);
      const y = H - 48 - bh;
      out += `<rect x="${x}" y="${y}" width="${bw}" height="${bh+55}" fill="${color}"/>`;
      if (layer === 1) {
        for (let wx=x+14; wx<x+bw-10; wx+=26) for (let wy=y+22; wy<y+bh-18; wy+=32)
          out += `<rect x="${wx}" y="${wy}" width="10" height="15" rx="1" fill="${windowColor}" opacity="${((wx+wy)%3)?'.24':'.65'}"/>`;
      }
    }
  }
  return out;
}

function hero(p) {
  const cape = `<path d="M-14 5c-28 15-34 49-28 70L2 51 15 13z" fill="#080d19" stroke="#334b68" stroke-width="2"/>`;
  return `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})">
    ${cape}<path d="M-17-26l10-18L0-33 8-44 19-26l-4 31h-29z" fill="#101b30" stroke="#70f0bd" stroke-width="2"/>
    <path d="M-11-17l8 3-8 5zm22 0l-8 3 8 5z" fill="#e8fff9"/>
    <path d="M-13 5h27l8 49L0 70l-21-16z" fill="#182943" stroke="#476a82" stroke-width="2"/>
    <path d="M-7 15H8v10H-7z" fill="#70f0bd"/><path d="M-12 10l-25 20m50-20l26-17" stroke="#182943" stroke-width="9"/>
    <path d="M-10 54l-10 31m31-31l11 31" stroke="#182943" stroke-width="10"/><path d="M-28 86h16m27 0h17" stroke="#70f0bd" stroke-width="4"/>
  </g>`;
}

function robot(p) {
  if (p.x < -80 || p.x > W+80) return '';
  return `<g transform="translate(${p.x-92} ${p.y+28})">
    <path d="M-13 29l5 22 5-22zm18 0l5 22 5-22z" fill="#70f0bd" opacity=".85"/>
    <path d="M0-5v-12m-5 0h10" stroke="#70f0bd" stroke-width="3"/><rect x="-23" y="-5" width="46" height="35" rx="8" fill="#263b55" stroke="#70f0bd" stroke-width="2"/>
    <rect x="-14" y="4" width="29" height="15" rx="4" fill="#050b16"/><circle cx="-6" cy="11" r="3" fill="#8ffff0"/><circle cx="7" cy="11" r="3" fill="#8ffff0"/>
  </g>`;
}

function cable(p) {
  const anchors = {1:{x:300,y:70},2:{x:700,y:70}};
  if (p.rope) {
    const a = anchors[p.rope];
    return `<line x1="${p.x}" y1="${p.y-7}" x2="${a.x}" y2="${a.y}" stroke="#91f5df" stroke-width="3"/><circle cx="${a.x}" cy="${a.y}" r="5" fill="#91f5df"/>`;
  }
  if (p.shot) {
    const a = anchors[p.shot], sx=p.x+20, sy=p.y-10, q=ease(p.shotP);
    const ex=lerp(sx,a.x,q), ey=lerp(sy,a.y,q);
    return `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="#91f5df" stroke-width="3"/><circle cx="${ex}" cy="${ey}" r="5" fill="#dffff6"/>`;
  }
  return '';
}

function frameSvg(i) {
  const t = i / FPS;
  const p = heroAt(t);
  const rp = heroAt((t - .48 + DURATION) % DURATION);
  const far = (t / DURATION) * 1050, mid = (t / DURATION) * 2100;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#02040d"/><stop offset="1" stop-color="#142440"/></linearGradient><radialGradient id="beam"><stop stop-color="#dffff5" stop-opacity=".35"/><stop offset="1" stop-color="#70f0bd" stop-opacity="0"/></radialGradient></defs>
  <rect width="960" height="416" rx="16" fill="url(#sky)"/>
  <path d="M710 350L775 75h90l72 275z" fill="url(#beam)"/><path d="M820 48l12 11 20-7-9 16 18 14-27-4-14 16-15-16-27 4 18-14-9-16 20 7z" fill="#050a15"/>
  ${buildings(far,0,'#17223b','#27415e')}${buildings(mid,1,'#081122','#70f0bd')}
  <g fill="#050914"><rect x="225" y="70" width="150" height="292"/><rect x="625" y="70" width="150" height="292"/></g>
  <g fill="#162943"><rect x="250" y="102" width="18" height="25"/><rect x="292" y="102" width="18" height="25"/><rect x="650" y="102" width="18" height="25"/><rect x="692" y="102" width="18" height="25"/></g>
  <g stroke="#91f5df" stroke-width="3"><path d="M300 70V48"/><path d="M700 70V48"/></g>
  ${cable(p)}${robot(rp)}${hero(p)}
  <path d="M0 378h150l25-27h210l22 27h180l30-36h190l26 36h147v38H0z" fill="#02050c"/>
  <g><rect x="28" y="25" width="330" height="82" rx="4" fill="#030713" opacity=".84"/><text x="45" y="58" fill="#effffb" font-family="monospace" font-size="27" font-weight="700" letter-spacing="2">NIYANT SITHAMRAJU</text><text x="47" y="87" fill="#70f0bd" font-family="monospace" font-size="15" letter-spacing="7">ROBOTICS</text></g>
  <rect x="1.5" y="1.5" width="957" height="413" rx="14.5" fill="none" stroke="#263b5a" stroke-width="3"/>
  </svg>`;
}

(async () => {
  for (let i=0;i<FRAMES;i++) {
    const file = path.join(frames, `frame-${String(i).padStart(3,'0')}.png`);
    await sharp(Buffer.from(frameSvg(i))).png().toFile(file);
  }
})();
