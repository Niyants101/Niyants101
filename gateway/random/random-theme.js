(function attachRandomTheme(root) {
  "use strict";

  function rollTheme(randomByte) {
    return (randomByte & 1) === 1 ? "batman" : "spider";
  }

  function chooseRandomTheme() {
    if (root.crypto && typeof root.crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(1);
      root.crypto.getRandomValues(bytes);
      return rollTheme(bytes[0]);
    }

    return Math.random() < 0.5 ? "spider" : "batman";
  }

  const api = { rollTheme, chooseRandomTheme };
  root.NiyantThemeRandomizer = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
