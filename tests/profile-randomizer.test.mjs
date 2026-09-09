import assert from "node:assert/strict";
import worker, { themeFromByte } from "../profile-randomizer/worker.mjs";

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

const batman = await worker.fetch(
  new Request("https://profile.example/profile.gif?theme=batman"),
  env,
);
assert.equal(batman.status, 200);
assert.equal(batman.headers.get("X-Niyant-Theme"), "batman");
assert.match(batman.headers.get("Cache-Control"), /no-store/);
assert.equal(batman.headers.get("CDN-Cache-Control"), "no-store");
assert.equal(batman.headers.get("ETag"), null);
assert.equal(batman.headers.get("Last-Modified"), null);
assert.equal(requestedAssets.at(-1), "/night-shift-final.gif");

const spider = await worker.fetch(
  new Request("https://profile.example/profile.gif?theme=spider"),
  env,
);
assert.equal(spider.headers.get("X-Niyant-Theme"), "spider");
assert.equal(requestedAssets.at(-1), "/spider-night-shift.gif");

const missing = await worker.fetch(new Request("https://profile.example/other"), env);
assert.equal(missing.status, 404);

process.stdout.write("PASS: the profile Worker selects both GIFs and prevents intermediary caching\n");
