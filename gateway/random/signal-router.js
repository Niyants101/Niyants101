(function attachSignalRouter(root, factory) {
  const router = factory();
  if (typeof module === "object" && module.exports) module.exports = router;
  if (root) root.NiyantSignalRouter = router;
}(typeof globalThis === "object" ? globalThis : this, () => {
  const SIGNALS = Object.freeze([
    Object.freeze({ theme: "batman", x: 824, y: 72, radius: 28, destination: "../" }),
    Object.freeze({ theme: "spider", x: 884, y: 72, radius: 28, destination: "../spider/" }),
  ]);

  function profileImageWidth(viewportWidth) {
    return Math.min(840, Math.max(280, viewportWidth - 32));
  }

  function themeFromClick(clickedX, clickedY, viewportWidth) {
    if (![clickedX, clickedY, viewportWidth].every(Number.isFinite)) return null;
    const scale = profileImageWidth(viewportWidth) / 960;
    const nativeX = clickedX / scale;
    const nativeY = clickedY / scale;
    const signal = SIGNALS.find((candidate) =>
      Math.hypot(nativeX - candidate.x, nativeY - candidate.y) <= candidate.radius
    );
    return signal?.theme ?? null;
  }

  function destinationFromQuery(search, viewportWidth) {
    const coordinates = String(search).replace(/^\?/, "").match(/^(\d+),(\d+)$/);
    if (!coordinates) return null;
    const theme = themeFromClick(
      Number(coordinates[1]),
      Number(coordinates[2]),
      viewportWidth,
    );
    return SIGNALS.find((signal) => signal.theme === theme)?.destination ?? null;
  }

  return Object.freeze({
    SIGNALS,
    destinationFromQuery,
    profileImageWidth,
    themeFromClick,
  });
}));
