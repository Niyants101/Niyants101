const VARIANT_IDS = Object.freeze(["wide", "laptop", "tablet", "mobile", "micro"]);

const IMAGE_PATHS = Object.freeze(Object.fromEntries(VARIANT_IDS.map((variant) => [
  variant,
  Object.freeze({
    batman: `/night-shift-${variant}.gif`,
    spider: `/spider-night-shift-${variant}.gif`,
  }),
])));

export function variantFromPath(pathname) {
  if (pathname === "/profile.gif") return "wide";
  const match = pathname.match(/^\/profile-(wide|laptop|tablet|mobile|micro)\.gif$/);
  return match?.[1] ?? null;
}

export function themeFromByte(randomByte) {
  return (randomByte & 1) === 1 ? "batman" : "spider";
}

export function chooseTheme() {
  const bytes = new Uint8Array(1);
  crypto.getRandomValues(bytes);
  return themeFromByte(bytes[0]);
}

function noStoreHeaders(sourceHeaders, theme) {
  const headers = new Headers(sourceHeaders);
  headers.set("Content-Type", "image/gif");
  headers.set("Cache-Control", "no-cache, no-store, must-revalidate, private, max-age=0");
  headers.set("CDN-Cache-Control", "no-store");
  headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  headers.set("Surrogate-Control", "no-store");
  headers.set("Expires", "0");
  headers.set("Pragma", "no-cache");
  headers.set("Vary", "*");
  headers.set("X-Niyant-Theme", theme);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.delete("ETag");
  headers.delete("Last-Modified");
  return headers;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const variant = variantFromPath(url.pathname);
    if (!variant) {
      return new Response("Niyant random profile image\n", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed\n", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    const forcedTheme = url.searchParams.get("theme");
    const theme = Object.hasOwn(IMAGE_PATHS[variant], forcedTheme)
      ? forcedTheme
      : chooseTheme();
    const assetUrl = new URL(IMAGE_PATHS[variant][theme], "https://assets.local");
    const image = await env.ASSETS.fetch(assetUrl);

    if (!image.ok) {
      return new Response("Profile animation unavailable\n", {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    return new Response(request.method === "HEAD" ? null : image.body, {
      status: 200,
      headers: noStoreHeaders(image.headers, theme),
    });
  },
};
