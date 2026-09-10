(function attachRoutingGeometry(root, factory) {
  const geometry = factory();
  if (typeof module === "object" && module.exports) module.exports = geometry;
  if (root) root.NiyantRoutingGeometry = geometry;
}(typeof globalThis === "object" ? globalThis : this, () => {
  const SOURCE = Object.freeze({
    width: 960,
    height: 416,
    signalX: 855,
    signalY: 74,
    signalRadius: 48,
  });

  // Spider Man receives equal transparent padding on both horizontal sides.
  // Because GitHub centers the selected image, its visible 16:7 scene lands on
  // the same pixels as Batman's narrower canvas. The padding changes only the
  // server-side image-map coordinate, giving the router one stateless bit.
  const VARIANTS = Object.freeze([
    Object.freeze({ id: "wide", minViewport: 1280, sceneWidth: 688, xPadding: 76 }),
    Object.freeze({ id: "laptop", minViewport: 768, sceneWidth: 492, xPadding: 54 }),
    Object.freeze({ id: "tablet", minViewport: 480, sceneWidth: 360, xPadding: 40 }),
    Object.freeze({ id: "mobile", minViewport: 320, sceneWidth: 226, xPadding: 27 }),
    Object.freeze({ id: "micro", minViewport: 0, sceneWidth: 178, xPadding: 21 }),
  ].map((variant) => Object.freeze({
    ...variant,
    sceneHeight: Math.round(variant.sceneWidth * SOURCE.height / SOURCE.width),
    spiderWidth: variant.sceneWidth + variant.xPadding * 2,
  })));

  function variantForViewport(viewportWidth) {
    const safeWidth = Number.isFinite(viewportWidth) ? viewportWidth : 1280;
    return VARIANTS.find((variant) => safeWidth >= variant.minViewport)
      || VARIANTS[VARIANTS.length - 1];
  }

  function signalForTheme(theme, variant) {
    const scaleX = variant.sceneWidth / SOURCE.width;
    const scaleY = variant.sceneHeight / SOURCE.height;
    return Object.freeze({
      theme,
      x: SOURCE.signalX * scaleX + (theme === "spider" ? variant.xPadding : 0),
      y: SOURCE.signalY * scaleY,
      radiusX: SOURCE.signalRadius * scaleX,
      radiusY: SOURCE.signalRadius * scaleY,
    });
  }

  return Object.freeze({ SOURCE, VARIANTS, signalForTheme, variantForViewport });
}));
