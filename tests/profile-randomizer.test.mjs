import assert from "node:assert/strict";
import worker, { themeFromByte, variantFromPath } from "../profile-randomizer/worker.mjs";

for (let value = 0; value < 256; value += 1) {
  assert.equal(themeFromByte(value), value % 2 === 1 ? "batman" : "spider");
}

const requestedAssets = [];
const env = {
  ASSETS: {
    async fetch(url) {
      requestedAssets.push(new URL(url).pathname);
      return new Response(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), {
        headers: {
          "Content-Type": "image/gif",
          ETag: "must-be-removed",
          "Last-Modified": "Wed, 09 Sep 2026 00:00:00 GMT",
        },
      });
    },
  },
};

for (const variant of ["wide", "laptop", "tablet", "mobile", "micro"]) {
  assert.equal(variantFromPath(`/profile-${variant}.gif`), variant);
  for (const theme of ["batman", "spider"]) {
    const response = await worker.fetch(
      new Request(`https://profile.example/profile-${variant}.gif?theme=${theme}`),
      env,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-Niyant-Theme"), theme);
    assert.match(response.headers.get("Cache-Control"), /no-store/);
    assert.equal(response.headers.get("CDN-Cache-Control"), "no-store");
    assert.equal(response.headers.get("ETag"), null);
    assert.equal(response.headers.get("Last-Modified"), null);
    const prefix = theme === "batman" ? "night-shift" : "spider-night-shift";
    assert.equal(requestedAssets.at(-1), `/${prefix}-${variant}.gif`);
  }
}

assert.equal(variantFromPath("/profile.gif"), "wide");
assert.equal(variantFromPath("/not-a-profile.gif"), null);

const missing = await worker.fetch(new Request("https://profile.example/other"), env);
assert.equal(missing.status, 404);

process.stdout.write("PASS: the profile Worker selects both GIFs and prevents intermediary caching\n");
