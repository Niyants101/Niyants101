(function attachSignalRouter(root, factory) {
  const geometry = typeof module === "object" && module.exports
    ? require("./routing-geometry.js")
    : root?.NiyantRoutingGeometry;
  const router = factory(geometry);
  if (typeof module === "object" && module.exports) module.exports = router;
  if (root) root.NiyantSignalRouter = router;
}(typeof globalThis === "object" ? globalThis : this, (geometry) => {
  if (!geometry) throw new Error("Routing geometry is unavailable");

  const DESTINATIONS = Object.freeze({ batman: "../", spider: "../spider/" });
  const HIT_TOLERANCE = 1.08;

  function themeFromClick(clickedX, clickedY, viewportWidth) {
    if (![clickedX, clickedY, viewportWidth].every(Number.isFinite)) return null;
    const variant = geometry.variantForViewport(viewportWidth);

    for (const theme of ["batman", "spider"]) {
      const signal = geometry.signalForTheme(theme, variant);
      const normalizedDistance = Math.hypot(
        (clickedX - signal.x) / signal.radiusX,
        (clickedY - signal.y) / signal.radiusY,
      );
      // A small tolerance covers integer rounding in HTML server-side image
      // maps, including the outermost visible pixels of the circular logo.
      if (normalizedDistance <= HIT_TOLERANCE) return theme;
    }

    return null;
  }

  function destinationFromQuery(search, viewportWidth) {
    const coordinates = String(search).replace(/^\?/, "").match(/^(\d+),(\d+)$/);
    if (!coordinates) return null;
    const theme = themeFromClick(
      Number(coordinates[1]),
      Number(coordinates[2]),
      viewportWidth,
    );
    return theme ? DESTINATIONS[theme] : null;
  }

  return Object.freeze({
    DESTINATIONS,
    HIT_TOLERANCE,
    destinationFromQuery,
    geometry,
    themeFromClick,
  });
}));
