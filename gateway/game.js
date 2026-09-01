const gate = document.querySelector("#gate");
const runner = document.querySelector("#runner");
const form = document.querySelector("#gateForm");
const code = document.querySelector("#code");
const enter = document.querySelector("#enter");
const message = document.querySelector("#message");

let game = null;
const TUTORIAL_STORAGE_KEY = "niyant-rooftop-tutorial-v2-complete";
const VILLAIN_PROFILES = Object.freeze({
  joker: {
    name: "JOKER",
    health: 7,
    color: "#b26ade",
    hitColor: "#75ff8f",
    minDelay: 1.6,
    maxDelay: 2.4,
  },
  bane: {
    name: "BANE",
    health: 11,
    color: "#e06b50",
    hitColor: "#72f4df",
    minDelay: 1.9,
    maxDelay: 2.7,
  },
  riddler: {
    name: "RIDDLER",
    health: 8,
    color: "#5be07c",
    hitColor: "#d8ff65",
    minDelay: 2.05,
    maxDelay: 2.8,
  },
  penguin: {
    name: "PENGUIN",
    health: 9,
    color: "#78a9dc",
    hitColor: "#b9e8ff",
    minDelay: 2,
    maxDelay: 2.8,
  },
});

function readStorage(key, fallback = "") {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The game still works when private browsing blocks storage.
  }
}

code.focus();

code.addEventListener("input", () => {
  code.value = code.value.replace(/\D/g, "").slice(0, 3);
  enter.disabled = code.value.length !== 3;
  gate.classList.remove("error");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (code.value === "702") {
    gate.className = "gate success";
    message.textContent = "ACCESS GRANTED";
    window.setTimeout(() => {
      gate.className = "gate signal";
    }, 650);
    window.setTimeout(() => {
      gate.classList.add("hidden");
      runner.classList.remove("hidden");
      game = new RooftopGame();
    }, 1750);
    return;
  }

  gate.className = "gate error";
  message.textContent = "ACCESS DENIED";
  window.setTimeout(() => {
    code.value = "";
    enter.disabled = true;
    gate.className = "gate";
    message.textContent = "AWAITING CREDENTIALS";
    code.focus();
  }, 650);
});

class RooftopGame {
  constructor() {
    this.canvas = document.querySelector("#canvas");
    this.context = this.canvas.getContext("2d");
    this.scoreNode = document.querySelector("#score");
    this.highNode = document.querySelector("#highScore");
    this.phaseNode = document.querySelector("#phaseLabel");
    this.introNode = document.querySelector("#introCopy");
    this.helpNode = document.querySelector("#help");
    this.tutorialNode = document.querySelector("#tutorial");
    this.tutorialTitleNode = document.querySelector("#tutorialTitle");
    this.tutorialKeysNode = document.querySelector("#tutorialKeys");
    this.tutorialDetailNode = document.querySelector("#tutorialDetail");
    this.overNode = document.querySelector("#gameover");
    this.finalScoreNode = document.querySelector("#finalScore");
    this.finalBestNode = document.querySelector("#finalBest");

    this.controls = {
      left: false,
      right: false,
      down: false,
      jumpQueued: false,
      jumpHeld: false,
      throwQueued: false,
    };

    this.highScore = Number(readStorage("niyant-rooftop-high-score", "0")) || 0;
    this.signal = new Image();
    this.signal.src = "bat-signal.png";
    this.highNode.textContent = this.pad(this.highScore);
    this.fixedStep = 1 / 120;
    this.accumulator = 0;
    this.previousFrame = performance.now();

    this.bindControls();
    this.reset(false);
    this.frame = this.frame.bind(this);
    this.animationFrame = window.requestAnimationFrame(this.frame);
  }

  pad(value) {
    return Math.floor(value).toString().padStart(6, "0");
  }

  random(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  ease(value) {
    return value < 0.5
      ? 2 * value * value
      : 1 - Math.pow(-2 * value + 2, 2) / 2;
  }

  bindControls() {
    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      const gameKeys = [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        "w",
        "a",
        "s",
        "d",
        " ",
      ];

      if (gameKeys.includes(key)) event.preventDefault();

      if (this.phase === "gameover" && ["enter", "r", " "].includes(key)) {
        this.reset(true);
        return;
      }

      if (["arrowup", "w"].includes(key)) {
        if (!event.repeat) this.controls.jumpQueued = true;
        this.controls.jumpHeld = true;
      }
      if (key === " " && this.phase === "playing" && !event.repeat) {
        this.controls.throwQueued = true;
      }
      if (["arrowdown", "s"].includes(key)) this.controls.down = true;
      if (["arrowleft", "a"].includes(key)) this.controls.left = true;
      if (["arrowright", "d"].includes(key)) this.controls.right = true;
    }, { passive: false });

    window.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "w"].includes(key)) this.controls.jumpHeld = false;
      if (["arrowdown", "s"].includes(key)) this.controls.down = false;
      if (["arrowleft", "a"].includes(key)) this.controls.left = false;
      if (["arrowright", "d"].includes(key)) this.controls.right = false;
    });

    window.addEventListener("blur", () => {
      this.controls.left = false;
      this.controls.right = false;
      this.controls.down = false;
      this.controls.jumpHeld = false;
      this.controls.throwQueued = false;
    });

    document.querySelector("#restart").addEventListener("click", () => {
      this.reset(true);
    });

    document.querySelector("#returnButton").addEventListener("click", () => {
      window.location.href = "https://github.com/Niyants101";
    });

    document.querySelectorAll("[data-control]").forEach((button) => {
      const controlName = button.dataset.control;

      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        if (controlName === "jump") {
          this.controls.jumpQueued = true;
          this.controls.jumpHeld = true;
        } else if (controlName === "throw") {
          this.controls.throwQueued = true;
        } else {
          this.controls[controlName] = true;
        }
      });

      ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
        button.addEventListener(eventName, () => {
          if (controlName === "jump") this.controls.jumpHeld = false;
          else if (controlName !== "throw") this.controls[controlName] = false;
        });
      });
    });
  }

  reset(skipIntro) {
    this.phase = skipIntro ? "playing" : "intro";
    this.phaseNode.textContent = skipIntro ? "IN PURSUIT" : "SWINGING IN";
    runner.classList.toggle("playing", skipIntro);
    this.introNode.classList.toggle("hidden", skipIntro);
    this.overNode.classList.add("hidden");

    this.distance = 0;
    this.worldOffset = 0;
    this.elapsed = 0;
    this.introTime = 0;
    this.seed = 20;
    this.coyoteTime = 0.1;
    this.jumpBuffer = 0;
    this.lastHudUpdate = 0;
    this.tutorialGrace = 0;
    this.tutorialStep = 0;
    this.tutorialCompleteTimer = 0;
    this.tutorialActions = { jump: false, duck: false, ramp: false, move: false };
    this.tutorialEnabled = readStorage(TUTORIAL_STORAGE_KEY) !== "1";
    this.particles = [];
    this.batarangs = [];
    this.bombs = [];
    this.joker = null;
    this.nextJokerDistance = 500;
    this.jokerEncounters = 0;
    this.lastVillain = null;
    this.villainQueue = ["joker", ...this.shuffleVillains(["bane", "riddler", "penguin"], 31)];
    this.bossBannerTime = 0;
    this.throwCooldown = 0;
    this.throwAnimation = 0;

    this.controls.left = false;
    this.controls.right = false;
    this.controls.down = false;
    this.controls.jumpQueued = false;
    this.controls.jumpHeld = false;
    this.controls.throwQueued = false;

    this.player = {
      x: 220,
      feet: 410,
      velocityX: 0,
      velocityY: 0,
      grounded: true,
      duckAmount: 0,
      onRamp: null,
    };

    this.platforms = [
      { x: -180, width: 1540, y: 410, color: "#13233c", seed: 2 },
      { x: 1515, width: 650, y: 390, color: "#17233d", seed: 9 },
    ];

    this.ramps = [
      { x: 1218, width: 142, baseY: 410, height: 44, seed: 3, tutorial: "ramp" },
    ];

    this.obstacles = [
      { x: 680, y: 362, width: 58, height: 48, kind: "crate", tutorial: "jump", seed: 4 },
      { x: 1010, y: 342, width: 108, height: 18, kind: "beam", tutorial: "duck", seed: 5 },
    ];

    this.fillWorld();
    this.scoreNode.textContent = "000000";
    this.updateTutorialDisplay();

    if (skipIntro) this.showPlayingInterface();
    else {
      this.helpNode.classList.add("hidden");
      this.tutorialNode.classList.add("hidden");
    }
  }

  showPlayingInterface() {
    this.phase = "playing";
    this.phaseNode.textContent = "IN PURSUIT";
    runner.classList.add("playing");
    this.introNode.classList.add("hidden");
    this.helpNode.classList.toggle("hidden", this.tutorialEnabled);
    this.tutorialNode.classList.toggle("hidden", !this.tutorialEnabled);
  }

  finishRun() {
    if (this.phase !== "playing") return;

    this.phase = "gameover";
    runner.classList.remove("playing");
    this.phaseNode.textContent = "RUN ENDED";
    this.helpNode.classList.add("hidden");
    this.tutorialNode.classList.add("hidden");

    const finalScore = Math.floor(this.distance);
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      writeStorage("niyant-rooftop-high-score", String(finalScore));
      this.highNode.textContent = this.pad(finalScore);
    }

    this.finalScoreNode.textContent = this.pad(finalScore);
    this.finalBestNode.textContent = this.pad(this.highScore);
    this.overNode.classList.remove("hidden");
  }

  updateTutorialDisplay() {
    if (!this.tutorialEnabled) {
      this.tutorialNode.classList.add("hidden");
      return;
    }

    const steps = [
      {
        title: "JUMP",
        keys: ["W", "↑"],
        detail: "Jump over the construction barrier",
      },
      {
        title: "DUCK",
        keys: ["S", "↓"],
        detail: "Hold the key to slide under the light beam",
      },
      {
        title: "RAMP JUMP",
        keys: ["W", "↑"],
        detail: "Jump near the top of the ramp to clear the gap",
      },
      {
        title: "MOVE",
        keys: ["A", "←", "D", "→"],
        detail: "Adjust your position smoothly across the rooftop",
      },
      {
        title: "TRAINING COMPLETE",
        keys: ["✓"],
        detail: "Survive as long as you can",
      },
    ];

    const step = steps[this.tutorialStep] ?? steps[steps.length - 1];
    this.tutorialTitleNode.textContent = step.title;
    this.tutorialDetailNode.textContent = step.detail;
    this.tutorialKeysNode.replaceChildren(...step.keys.map((key) => {
      const keyNode = document.createElement("kbd");
      keyNode.textContent = key;
      return keyNode;
    }));

    if (this.phase === "playing") this.tutorialNode.classList.remove("hidden");
  }

  advanceTutorial() {
    if (!this.tutorialEnabled || this.tutorialStep >= 4) return;
    this.tutorialStep += 1;
    this.updateTutorialDisplay();

    if (this.tutorialStep === 4) {
      this.tutorialCompleteTimer = 1.8;
      writeStorage(TUTORIAL_STORAGE_KEY, "1");
    }
  }

  updateTutorial(delta) {
    if (!this.tutorialEnabled) return;
    this.tutorialGrace = Math.max(0, this.tutorialGrace - delta);

    if (this.tutorialStep === 0) {
      const target = this.obstacles.find((obstacle) => obstacle.tutorial === "jump");
      if (target && target.x + target.width < this.player.x - 20 && this.tutorialActions.jump) {
        this.advanceTutorial();
      }
    } else if (this.tutorialStep === 1) {
      const target = this.obstacles.find((obstacle) => obstacle.tutorial === "duck");
      if (target && target.x + target.width < this.player.x - 20 && this.tutorialActions.duck) {
        this.advanceTutorial();
      }
    } else if (this.tutorialStep === 2) {
      const ramp = this.ramps.find((item) => item.tutorial === "ramp");
      if (ramp && ramp.x + ramp.width < this.player.x - 20) {
        this.advanceTutorial();
      }
    } else if (this.tutorialStep === 3 && this.tutorialActions.move) {
      this.advanceTutorial();
    } else if (this.tutorialStep === 4) {
      this.tutorialCompleteTimer -= delta;
      if (this.tutorialCompleteTimer <= 0) {
        this.tutorialEnabled = false;
        this.tutorialNode.classList.add("hidden");
        this.helpNode.classList.remove("hidden");
      }
    }
  }

  repeatTutorialObstacle(obstacle) {
    if (this.tutorialGrace > 0) return;
    obstacle.x = this.player.x + 300;
    this.player.velocityX = -70;
    this.tutorialGrace = 0.65;

    if (obstacle.tutorial === "jump") this.tutorialActions.jump = false;
    if (obstacle.tutorial === "duck") this.tutorialActions.duck = false;
  }

  addPlatform() {
    const last = this.platforms[this.platforms.length - 1];
    const challenge = Math.min(this.distance / 1000, 1);
    const useRamp = last.width > 480 && this.random(this.seed + 6) > 0.74;

    if (useRamp) {
      const ramp = {
        x: last.x + last.width - 145,
        width: 145,
        baseY: last.y,
        height: 38 + this.random(this.seed + 7) * 16,
        seed: this.seed,
      };
      this.ramps.push(ramp);
      this.obstacles = this.obstacles.filter((obstacle) => (
        obstacle.x + obstacle.width < ramp.x - 60 || obstacle.x > last.x + last.width
      ));
    }

    const gap = useRamp
      ? 125 + this.random(this.seed) * (48 + challenge * 20)
      : 84 + this.random(this.seed) * (48 + challenge * 16);
    const width = 390 + this.random(this.seed + 1) * 360;
    const y = this.clamp(last.y + (this.random(this.seed + 2) - 0.5) * 48, 356, 428);
    const x = last.x + last.width + gap;
    const colors = ["#101d35", "#17233d", "#1d2340", "#102d39", "#20233a"];

    const platform = {
      x,
      width,
      y,
      color: colors[this.seed % colors.length],
      seed: this.seed,
    };
    this.platforms.push(platform);

    if (width > 440 && this.random(this.seed + 3) > 0.12) {
      const kinds = ["vent", "crate", "beam", "drone", "electric", "dish"];
      const kind = kinds[Math.floor(this.random(this.seed + 5) * kinds.length)];
      const sample = this.createObstacle(kind, 0, y, this.seed);
      const usableWidth = Math.max(25, width - 115 - 210 - sample.width);
      const obstacleX = x + 115 + this.random(this.seed + 4) * usableWidth;
      this.obstacles.push(this.createObstacle(kind, obstacleX, y, this.seed));
    }

    if (width > 620 && this.random(this.seed + 9) > 0.64) {
      const secondX = x + width * 0.56;
      const clear = this.obstacles.every((obstacle) => Math.abs(obstacle.x - secondX) > 150);
      if (clear) {
        const kind = this.random(this.seed + 10) > 0.5 ? "electric" : "vent";
        this.obstacles.push(this.createObstacle(kind, secondX, y, this.seed + 1));
      }
    }

    this.seed += 11;
  }

  createObstacle(kind, x, roofY, seed) {
    const specifications = {
      vent: { width: 50, height: 42, y: roofY - 42 },
      crate: { width: 58, height: 58, y: roofY - 58 },
      beam: { width: 108, height: 18, y: roofY - 68 },
      drone: { width: 66, height: 24, y: roofY - 72 },
      electric: { width: 96, height: 16, y: roofY - 16 },
      dish: { width: 58, height: 50, y: roofY - 50 },
    };
    return { x, kind, seed, ...specifications[kind] };
  }

  fillWorld() {
    let last = this.platforms[this.platforms.length - 1];
    while (last.x + last.width < 1700) {
      this.addPlatform();
      last = this.platforms[this.platforms.length - 1];
    }
  }

  scrollWorld(amount) {
    this.worldOffset += amount;
    this.platforms.forEach((platform) => { platform.x -= amount; });
    this.obstacles.forEach((obstacle) => { obstacle.x -= amount; });
    this.ramps.forEach((ramp) => { ramp.x -= amount; });

    this.platforms = this.platforms.filter((platform) => platform.x + platform.width > -240);
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -120);
    this.ramps = this.ramps.filter((ramp) => ramp.x + ramp.width > -120);
    this.fillWorld();
  }

  getSurface(x) {
    const ramp = this.ramps.find((item) => x >= item.x && x <= item.x + item.width);
    if (ramp) {
      const progress = this.clamp((x - ramp.x) / ramp.width, 0, 1);
      return {
        y: ramp.baseY - ramp.height * progress,
        ramp,
      };
    }

    const platform = this.platforms.find((item) => x >= item.x && x <= item.x + item.width);
    return platform ? { y: platform.y, ramp: null } : null;
  }

  obstacleBox(obstacle) {
    if (obstacle.kind === "drone") {
      return {
        ...obstacle,
        y: obstacle.y + Math.sin(this.elapsed * 3 + obstacle.seed) * 4,
      };
    }
    return obstacle;
  }

  overlaps(first, second) {
    return (
      first.x < second.x + second.width &&
      first.x + first.width > second.x &&
      first.y < second.y + second.height &&
      first.y + first.height > second.y
    );
  }

  spawnDust(x, y, count, color = "#7ddfce") {
    for (let index = 0; index < count; index += 1) {
      const angle = this.random(this.elapsed * 1000 + index) * Math.PI;
      const speed = 35 + this.random(index + this.elapsed * 31) * 75;
      this.particles.push({
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: -Math.sin(angle) * speed * 0.45,
        life: 0.35 + this.random(index + 90) * 0.28,
        size: 1.5 + this.random(index + 140) * 2.5,
        color,
      });
    }
  }

  updateParticles(delta) {
    this.particles.forEach((particle) => {
      particle.x += particle.velocityX * delta;
      particle.y += particle.velocityY * delta;
      particle.velocityY += 180 * delta;
      particle.life -= delta;
    });
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  shuffleVillains(villains, salt) {
    const shuffled = [...villains];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const characterSeed = shuffled[index].charCodeAt(0) + shuffled[index].charCodeAt(1);
      const swapIndex = Math.floor(this.random(salt + index * 31 + characterSeed) * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  nextVillain() {
    if (this.villainQueue.length === 0) {
      this.villainQueue = this.shuffleVillains(
        Object.keys(VILLAIN_PROFILES),
        this.seed + this.jokerEncounters * 23,
      );
      if (this.villainQueue[0] === this.lastVillain) {
        this.villainQueue.push(this.villainQueue.shift());
      }
    }
    const villain = this.villainQueue.shift();
    this.lastVillain = villain;
    return villain;
  }

  prepareBossArena() {
    const arena = this.platforms.find((platform) => (
      this.player.x >= platform.x && this.player.x <= platform.x + platform.width
    ));
    if (!arena) return null;

    arena.width = Math.max(arena.width, 1900 - arena.x);
    this.platforms = this.platforms
      .filter((platform) => platform === arena || platform.x + platform.width < arena.x)
      .sort((first, second) => first.x - second.x);
    this.ramps = this.ramps.filter((ramp) => ramp.x + ramp.width < this.player.x - 90);
    this.obstacles = this.obstacles.filter((obstacle) => (
      obstacle.x + obstacle.width < this.player.x - 90
    ));
    this.fillWorld();
    return arena;
  }

  spawnVillain() {
    const arena = this.prepareBossArena();
    const kind = this.nextVillain();
    const profile = VILLAIN_PROFILES[kind];
    const maxHealth = profile.health + Math.min(Math.floor(this.jokerEncounters / 4), 3);
    this.jokerEncounters += 1;
    this.nextJokerDistance += 500;
    this.batarangs = [];
    this.bombs = [];
    this.joker = {
      x: 1040,
      targetX: 730,
      feet: arena?.y ?? 410,
      kind,
      name: profile.name,
      color: profile.color,
      health: maxHealth,
      maxHealth,
      state: "entering",
      attackTimer: 1.05,
      lastAttack: this.random(this.jokerEncounters * 29) > 0.5 ? 0 : 1,
      attackRepeat: 0,
      attackMode: null,
      modeTimer: 0,
      attackLabel: "",
      attackLabelTimer: 0,
      hitFlash: 0,
      defeatTimer: 0,
      velocityY: 0,
      rotation: 0,
    };
    this.bossBannerTime = 3.2;
    this.phaseNode.textContent = `${profile.name} ENCOUNTER`;
  }

  throwBatarang() {
    if (this.throwCooldown > 0 || this.phase !== "playing") return;
    this.batarangs.push({
      x: this.player.x + 28,
      y: this.player.feet - 46 + this.player.duckAmount * 12,
      velocityX: 660,
      rotation: 0,
      life: 1.55,
    });
    this.throwCooldown = 0.24;
    this.throwAnimation = 0.18;
  }

  throwJokerBomb() {
    if (!this.joker || this.joker.state === "defeated") return;
    const variation = this.random(this.elapsed * 9 + this.jokerEncounters * 17);
    this.bombs.push({
      kind: "joker-bomb",
      x: this.joker.x - 23,
      y: this.joker.feet - 55,
      velocityX: -245 - variation * 70,
      velocityY: -285 - variation * 70,
      radius: 12,
      rotation: 0,
      landed: false,
      fuse: 2.25,
      exploded: false,
      explosionTime: 0,
      harmless: false,
      effectColor: "#ff9d4d",
    });
  }

  throwJokerGas() {
    if (!this.joker || this.joker.state === "defeated") return;
    const variation = this.random(this.elapsed * 7 + this.jokerEncounters * 19);
    this.bombs.push({
      kind: "joker-gas",
      x: this.joker.x - 24,
      y: this.joker.feet - 55,
      velocityX: -215 - variation * 50,
      velocityY: -245 - variation * 45,
      radius: 10,
      rotation: 0,
      landed: false,
      active: false,
      fuse: 0.62,
      life: 3.1,
      exploded: false,
      explosionTime: 0,
      harmless: false,
      effectColor: "#78e17f",
    });
  }

  spawnBaneWave() {
    this.bombs.push({
      kind: "bane-wave",
      x: this.joker.x - 45,
      y: this.joker.feet,
      width: 62,
      height: 28,
      telegraph: 0.68,
      active: false,
      life: 2.4,
      exploded: false,
      harmless: false,
      effectColor: "#ef7654",
    });
  }

  startBaneCharge() {
    this.joker.attackMode = "bane-charge-windup";
    this.joker.modeTimer = 0.72;
  }

  spawnRiddlerOrbs() {
    const firstHigh = this.random(this.elapsed * 11 + this.jokerEncounters * 5) > 0.5;
    [firstHigh, !firstHigh].forEach((high, index) => {
      this.bombs.push({
        kind: "riddler-orb",
        x: this.joker.x - 28,
        y: this.joker.feet - (high ? 72 : 25),
        yOffset: high ? 72 : 25,
        velocityX: -325,
        radius: 14,
        delay: index * 0.62,
        life: 3.2,
        rotation: index * Math.PI,
        exploded: false,
        explosionTime: 0,
        harmless: false,
        effectColor: "#79ef73",
      });
    });
  }

  spawnRiddlerLaser() {
    const high = this.random(this.elapsed * 17 + this.jokerEncounters * 13) > 0.5;
    this.bombs.push({
      kind: "riddler-laser",
      x: 0,
      y: this.joker.feet - (high ? 61 : 20),
      yOffset: high ? 61 : 20,
      width: Math.max(0, this.joker.x - 35),
      height: 9,
      telegraph: 0.9,
      active: false,
      activeTime: 0.48,
      life: 1.38,
      exploded: false,
      harmless: false,
      effectColor: "#65f58a",
    });
  }

  spawnPenguinMissiles() {
    const firstHigh = this.random(this.elapsed * 21 + this.jokerEncounters * 3) > 0.5;
    [firstHigh, !firstHigh].forEach((high, index) => {
      this.bombs.push({
        kind: "penguin-missile",
        x: this.joker.x - 24,
        y: this.joker.feet - 77,
        targetOffset: high ? 69 : 27,
        velocityX: -345,
        radius: 12,
        delay: 0.42 + index * 0.52,
        life: 3,
        rotation: 0,
        exploded: false,
        explosionTime: 0,
        harmless: false,
        effectColor: "#78c8ff",
      });
    });
  }

  spawnPenguinBot() {
    this.bombs.push({
      kind: "penguin-bot",
      x: this.joker.x - 34,
      y: this.joker.feet - 17,
      width: 36,
      height: 34,
      radius: 18,
      life: 3.8,
      fuse: 3.25,
      rotation: 0,
      exploded: false,
      explosionTime: 0,
      harmless: false,
      effectColor: "#8fcfff",
    });
  }

  scheduleVillainAttack() {
    if (!this.joker) return;
    const profile = VILLAIN_PROFILES[this.joker.kind];
    const variation = this.random(this.elapsed * 13 + this.jokerEncounters * 37);
    this.joker.attackTimer = profile.minDelay + variation * (profile.maxDelay - profile.minDelay);
  }

  performVillainAttack() {
    if (!this.joker || this.joker.state === "defeated") return;
    let attack = this.random(this.elapsed * 19 + this.jokerEncounters * 43) > 0.5 ? 1 : 0;
    if (attack === this.joker.lastAttack) {
      this.joker.attackRepeat += 1;
      if (this.joker.attackRepeat > 1) {
        attack = attack === 0 ? 1 : 0;
        this.joker.attackRepeat = 0;
      }
    } else {
      this.joker.attackRepeat = 0;
    }
    this.joker.lastAttack = attack;

    if (this.joker.kind === "joker") {
      if (attack === 0) {
        this.joker.attackLabel = "BOMB TOSS";
        this.throwJokerBomb();
      } else {
        this.joker.attackLabel = "LAUGHING GAS";
        this.throwJokerGas();
      }
    } else if (this.joker.kind === "bane") {
      if (attack === 0) {
        this.joker.attackLabel = "GROUND BREAKER";
        this.spawnBaneWave();
      } else {
        this.joker.attackLabel = "VENOM CHARGE";
        this.startBaneCharge();
      }
    } else if (this.joker.kind === "riddler") {
      if (attack === 0) {
        this.joker.attackLabel = "QUESTION VOLLEY";
        this.spawnRiddlerOrbs();
      } else {
        this.joker.attackLabel = "RIDDLE BEAM";
        this.spawnRiddlerLaser();
      }
    } else if (attack === 0) {
      this.joker.attackLabel = "UMBRELLA MISSILES";
      this.spawnPenguinMissiles();
    } else {
      this.joker.attackLabel = "PENGUIN BOT";
      this.spawnPenguinBot();
    }

    this.joker.attackLabelTimer = 1.05;
    this.scheduleVillainAttack();
  }

  explodeBomb(bomb, harmless = bomb.harmless) {
    if (bomb.exploded) return;
    bomb.exploded = true;
    bomb.harmless = harmless;
    bomb.explosionTime = 0.34;
    bomb.velocityX = 0;
    bomb.velocityY = 0;
    this.spawnDust(
      bomb.x,
      bomb.y,
      18,
      harmless ? "#72f4df" : (bomb.effectColor ?? "#ff9d4d"),
    );
  }

  defeatJoker() {
    if (!this.joker || this.joker.state === "defeated") return;
    this.joker.state = "defeated";
    this.joker.defeatTimer = 1.35;
    this.joker.velocityY = -330;
    this.joker.rotation = 0;
    this.bossBannerTime = 1.7;
    this.phaseNode.textContent = "TARGET DOWN";
    this.bombs.forEach((bomb) => {
      bomb.harmless = true;
      this.explodeBomb(bomb, true);
    });
  }

  hitJoker() {
    if (!this.joker || this.joker.state === "defeated" || this.joker.hitFlash > 0) return;
    this.joker.health -= 1;
    this.joker.hitFlash = 0.12;
    this.joker.x += 9;
    this.spawnDust(
      this.joker.x - 12,
      this.joker.feet - 48,
      10,
      VILLAIN_PROFILES[this.joker.kind].hitColor,
    );
    if (this.joker.health <= 0) this.defeatJoker();
  }

  updateBatarangs(delta) {
    this.batarangs.forEach((batarang) => {
      batarang.x += batarang.velocityX * delta;
      batarang.rotation += delta * 18;
      batarang.life -= delta;

      if (
        this.joker &&
        this.joker.state !== "defeated" &&
        batarang.x >= this.joker.x - 28 &&
        batarang.x <= this.joker.x + 30 &&
        batarang.y >= this.joker.feet - 88 &&
        batarang.y <= this.joker.feet - 10
      ) {
        this.hitJoker();
        batarang.life = 0;
        return;
      }

      const bomb = this.bombs.find((item) => (
        !item.exploded &&
        ["joker-bomb", "joker-gas", "riddler-orb", "penguin-missile", "penguin-bot"].includes(item.kind) &&
        Math.hypot(batarang.x - item.x, batarang.y - item.y) < item.radius + 12
      ));
      if (bomb) {
        this.explodeBomb(bomb, true);
        batarang.life = 0;
      }
    });
    this.batarangs = this.batarangs.filter((batarang) => (
      batarang.life > 0 && batarang.x < 1030
    ));
  }

  updateBombs(delta, speed) {
    this.bombs.forEach((hazard) => {
      if (hazard.exploded) {
        hazard.explosionTime -= delta;
        return;
      }

      if (hazard.kind === "joker-bomb" || hazard.kind === "joker-gas") {
        hazard.rotation += delta * (hazard.landed ? 4 : 11);
        if (!hazard.landed) {
          const previousY = hazard.y;
          hazard.x += hazard.velocityX * delta;
          hazard.velocityY += 900 * delta;
          hazard.y += hazard.velocityY * delta;
          const surface = this.getSurface(hazard.x);
          if (
            surface &&
            hazard.velocityY >= 0 &&
            previousY + hazard.radius <= surface.y + 4 &&
            hazard.y + hazard.radius >= surface.y
          ) {
            hazard.landed = true;
            hazard.y = surface.y - hazard.radius;
            hazard.velocityX = -speed;
            hazard.velocityY = 0;
          }
        } else {
          hazard.x -= speed * delta;
          const surface = this.getSurface(hazard.x);
          if (surface) {
            const targetY = surface.y - (hazard.active ? 30 : hazard.radius);
            hazard.y += (targetY - hazard.y) * (1 - Math.exp(-18 * delta));
          }
          hazard.fuse -= delta;
          if (hazard.kind === "joker-bomb" && hazard.fuse <= 0) {
            this.explodeBomb(hazard);
          } else if (hazard.kind === "joker-gas") {
            if (!hazard.active && hazard.fuse <= 0) hazard.active = true;
            if (hazard.active) {
              hazard.life -= delta;
              if (hazard.life <= 0) this.explodeBomb(hazard, true);
            }
          }
        }
        return;
      }

      if (hazard.kind === "bane-wave") {
        if (!hazard.active) {
          hazard.telegraph -= delta;
          if (this.joker?.kind === "bane") {
            hazard.x = this.joker.x - 45;
            hazard.y = this.joker.feet;
          }
          if (hazard.telegraph <= 0) hazard.active = true;
        } else {
          hazard.x -= (speed + 290) * delta;
          const surface = this.getSurface(hazard.x);
          if (surface) hazard.y = surface.y;
          hazard.life -= delta;
        }
        return;
      }

      if (hazard.kind === "riddler-orb") {
        if (hazard.delay > 0) {
          hazard.delay -= delta;
          if (this.joker?.kind === "riddler") {
            hazard.x = this.joker.x - 28;
            hazard.y = this.joker.feet - hazard.yOffset;
          }
        } else {
          hazard.x += hazard.velocityX * delta;
          const surface = this.getSurface(hazard.x);
          if (surface) {
            hazard.y = surface.y - hazard.yOffset + Math.sin(this.elapsed * 8 + hazard.rotation) * 3;
          }
          hazard.rotation += delta * 5;
          hazard.life -= delta;
        }
        return;
      }

      if (hazard.kind === "riddler-laser") {
        if (this.joker?.kind === "riddler") {
          hazard.width = Math.max(0, this.joker.x - 35);
          hazard.y = this.joker.feet - hazard.yOffset;
        }
        if (!hazard.active) {
          hazard.telegraph -= delta;
          if (hazard.telegraph <= 0) hazard.active = true;
        } else {
          hazard.activeTime -= delta;
          if (hazard.activeTime <= 0) hazard.life = 0;
        }
        return;
      }

      if (hazard.kind === "penguin-missile") {
        if (hazard.delay > 0) {
          hazard.delay -= delta;
          if (this.joker?.kind === "penguin") {
            hazard.x = this.joker.x - 24;
            hazard.y = this.joker.feet - 77;
          }
        } else {
          hazard.x += hazard.velocityX * delta;
          const surface = this.getSurface(hazard.x);
          if (surface) {
            const targetY = surface.y - hazard.targetOffset;
            hazard.y += (targetY - hazard.y) * (1 - Math.exp(-5.5 * delta));
          }
          hazard.rotation += delta * 8;
          hazard.life -= delta;
        }
        return;
      }

      if (hazard.kind === "penguin-bot") {
        hazard.x -= (speed + 105) * delta;
        const surface = this.getSurface(hazard.x);
        if (surface) hazard.y = surface.y - 17;
        hazard.rotation += delta * 9;
        hazard.fuse -= delta;
        hazard.life -= delta;
        if (hazard.fuse <= 0) this.explodeBomb(hazard);
      }
    });
    this.bombs = this.bombs.filter((hazard) => (
      hazard.x > -120 &&
      hazard.y < 640 &&
      (hazard.life === undefined || hazard.life > 0) &&
      (!hazard.exploded || hazard.explosionTime > 0)
    ));
  }

  updateJoker(delta) {
    if (!this.joker) return;
    this.joker.hitFlash = Math.max(0, this.joker.hitFlash - delta);
    this.joker.attackLabelTimer = Math.max(0, this.joker.attackLabelTimer - delta);

    if (this.joker.state === "defeated") {
      this.joker.defeatTimer -= delta;
      this.joker.velocityY += 980 * delta;
      this.joker.feet += this.joker.velocityY * delta;
      this.joker.x += 280 * delta;
      this.joker.rotation += delta * 5.8;
      if (this.joker.defeatTimer <= 0 || this.joker.feet > 620) {
        this.joker = null;
        this.bombs = [];
        this.phaseNode.textContent = "IN PURSUIT";
      }
      return;
    }

    const surface = this.getSurface(this.joker.x);
    if (surface) {
      this.joker.feet += (surface.y - this.joker.feet) * (1 - Math.exp(-15 * delta));
    }

    if (this.joker.state === "entering") {
      this.joker.x += (this.joker.targetX - this.joker.x) * (1 - Math.exp(-2.7 * delta));
      if (Math.abs(this.joker.x - this.joker.targetX) < 8) {
        this.joker.state = "fighting";
        this.joker.attackTimer = 0.95 + this.random(this.jokerEncounters * 41) * 0.4;
      }
      return;
    }

    if (this.joker.attackMode === "bane-charge-windup") {
      this.joker.modeTimer -= delta;
      if (this.joker.modeTimer <= 0) this.joker.attackMode = "bane-charge";
      return;
    }

    if (this.joker.attackMode === "bane-charge") {
      this.joker.x -= 510 * delta;
      if (this.joker.x <= 285) this.joker.attackMode = "bane-return";
      return;
    }

    if (this.joker.attackMode === "bane-return") {
      this.joker.x += (this.joker.targetX - this.joker.x) * (1 - Math.exp(-3.4 * delta));
      if (Math.abs(this.joker.x - this.joker.targetX) < 9) this.joker.attackMode = null;
      return;
    }

    const baseTarget = this.joker.kind === "bane"
      ? 750
      : (this.joker.kind === "penguin" ? 700 : 720);
    const targetX = baseTarget + Math.sin(this.elapsed * 0.9) * 34;
    this.joker.x += (targetX - this.joker.x) * (1 - Math.exp(-2.4 * delta));
    this.joker.attackTimer -= delta;
    if (this.joker.attackTimer <= 0) this.performVillainAttack();
  }

  updateCombat(delta, speed) {
    this.throwCooldown = Math.max(0, this.throwCooldown - delta);
    this.throwAnimation = Math.max(0, this.throwAnimation - delta);
    this.bossBannerTime = Math.max(0, this.bossBannerTime - delta);

    if (this.controls.throwQueued) {
      this.throwBatarang();
      this.controls.throwQueued = false;
    }

    if (
      !this.joker &&
      !this.tutorialEnabled &&
      this.player.grounded &&
      !this.player.onRamp &&
      this.distance >= this.nextJokerDistance
    ) {
      this.spawnVillain();
    }

    this.updateJoker(delta);
    this.updateBatarangs(delta);
    this.updateBombs(delta, speed);
  }

  hazardCollisionBox(hazard) {
    if (hazard.harmless || hazard.exploded) return null;

    if (hazard.kind === "joker-gas" && hazard.active) {
      return { x: hazard.x - 42, y: hazard.y - 30, width: 84, height: 60 };
    }

    if (hazard.kind === "bane-wave") {
      return hazard.active
        ? { x: hazard.x - hazard.width / 2, y: hazard.y - hazard.height, width: hazard.width, height: hazard.height }
        : null;
    }

    if (hazard.kind === "riddler-laser") {
      return hazard.active && hazard.activeTime > 0
        ? { x: hazard.x, y: hazard.y - hazard.height / 2, width: hazard.width, height: hazard.height }
        : null;
    }

    if (
      (hazard.kind === "riddler-orb" || hazard.kind === "penguin-missile") &&
      hazard.delay > 0
    ) return null;

    if (hazard.kind === "penguin-bot") {
      return {
        x: hazard.x - hazard.width / 2,
        y: hazard.y - hazard.height / 2,
        width: hazard.width,
        height: hazard.height,
      };
    }

    if (hazard.radius !== undefined) {
      return {
        x: hazard.x - hazard.radius,
        y: hazard.y - hazard.radius,
        width: hazard.radius * 2,
        height: hazard.radius * 2,
      };
    }
    return null;
  }

  checkCombatCollisions(playerBox) {
    if (
      this.joker?.kind === "bane" &&
      this.joker.attackMode === "bane-charge"
    ) {
      const baneBox = {
        x: this.joker.x - 34,
        y: this.joker.feet - 94,
        width: 68,
        height: 86,
      };
      if (this.overlaps(playerBox, baneBox)) {
        this.finishRun();
        return;
      }
    }

    for (const bomb of this.bombs) {
      if (bomb.harmless) continue;
      if (bomb.exploded) {
        const playerCenterX = playerBox.x + playerBox.width / 2;
        const playerCenterY = playerBox.y + playerBox.height / 2;
        if (
          bomb.explosionTime > 0.1 &&
          Math.hypot(playerCenterX - bomb.x, playerCenterY - bomb.y) < 62
        ) {
          this.finishRun();
          return;
        }
        continue;
      }

      const bombBox = this.hazardCollisionBox(bomb);
      if (bombBox && this.overlaps(playerBox, bombBox)) {
        this.finishRun();
        return;
      }
    }
  }

  updateGame(delta) {
    const tutorialSpeedFactor = this.tutorialEnabled && this.tutorialStep < 4 ? 0.88 : 1;
    const speed = (218 + Math.min(this.distance * 0.072, 152)) * tutorialSpeedFactor;
    this.distance += delta * speed * 0.078;
    this.scrollWorld(delta * speed);

    const moveDirection = Number(this.controls.right) - Number(this.controls.left);
    const targetVelocityX = moveDirection * 178;
    const response = 1 - Math.exp(-12 * delta);
    this.player.velocityX += (targetVelocityX - this.player.velocityX) * response;
    this.player.x += this.player.velocityX * delta;

    if (this.player.x <= 108 || this.player.x >= 365) {
      this.player.x = this.clamp(this.player.x, 108, 365);
      this.player.velocityX *= 0.35;
    }

    if (moveDirection !== 0) this.tutorialActions.move = true;

    const previousRamp = this.player.onRamp;
    const support = this.getSurface(this.player.x);
    if (this.player.grounded) {
      if (support && Math.abs(this.player.feet - support.y) < 20) {
        this.player.feet = support.y;
        this.player.onRamp = support.ramp;
      } else {
        this.player.grounded = false;
        this.player.velocityY = previousRamp ? -225 : 22;
        this.player.onRamp = null;
        if (previousRamp?.tutorial === "ramp") this.tutorialActions.ramp = true;
      }
    }

    if (this.player.grounded) this.coyoteTime = 0.105;
    else this.coyoteTime = Math.max(0, this.coyoteTime - delta);

    if (this.controls.jumpQueued) {
      this.jumpBuffer = 0.14;
      this.controls.jumpQueued = false;
    } else {
      this.jumpBuffer = Math.max(0, this.jumpBuffer - delta);
    }

    const targetDuck = this.controls.down && this.player.grounded ? 1 : 0;
    const duckResponse = 1 - Math.exp(-18 * delta);
    this.player.duckAmount += (targetDuck - this.player.duckAmount) * duckResponse;

    if (this.controls.down) {
      const duckTarget = this.obstacles.find((obstacle) => obstacle.tutorial === "duck");
      if (duckTarget && Math.abs(duckTarget.x - this.player.x) < 280) {
        this.tutorialActions.duck = true;
      }
    }

    if (this.jumpBuffer > 0 && this.coyoteTime > 0 && !this.controls.down) {
      const rampJump = Boolean(this.player.onRamp);
      this.player.velocityY = rampJump ? -790 : -720;
      this.player.grounded = false;
      this.player.onRamp = null;
      this.jumpBuffer = 0;
      this.coyoteTime = 0;
      this.spawnDust(this.player.x - 8, this.player.feet - 2, rampJump ? 8 : 5);

      const jumpTarget = this.obstacles.find((obstacle) => obstacle.tutorial === "jump");
      if (jumpTarget && Math.abs(jumpTarget.x - this.player.x) < 360) {
        this.tutorialActions.jump = true;
      }
      if (rampJump) this.tutorialActions.ramp = true;
    }

    const previousFeet = this.player.feet;
    if (!this.player.grounded) {
      let gravity = this.controls.down ? 2100 : 1400;
      if (!this.controls.jumpHeld && this.player.velocityY < 0) gravity = 2240;
      this.player.velocityY += gravity * delta;
      this.player.feet += this.player.velocityY * delta;

      if (this.player.velocityY >= 0) {
        const landingSurface = this.getSurface(this.player.x);
        if (
          landingSurface &&
          previousFeet <= landingSurface.y + 2 &&
          this.player.feet >= landingSurface.y
        ) {
          const landingSpeed = this.player.velocityY;
          this.player.feet = landingSurface.y;
          this.player.velocityY = 0;
          this.player.grounded = true;
          this.player.onRamp = landingSurface.ramp;
          if (landingSpeed > 190) this.spawnDust(this.player.x, this.player.feet - 1, 7);
        }
      }
    }

    this.updateCombat(delta, speed);

    const collisionHeight = 69 - this.player.duckAmount * 31;
    const playerBox = {
      x: this.player.x - 11.5,
      y: this.player.feet - collisionHeight,
      width: 23,
      height: collisionHeight - 10,
    };

    for (const obstacle of this.obstacles) {
      const visualObstacleBox = this.obstacleBox(obstacle);
      const lowObstacle = ["vent", "crate", "electric", "dish"].includes(obstacle.kind);
      const verticalInset = obstacle.tutorial === "jump" ? 20 : (lowObstacle ? 8 : 0);
      const obstacleBox = {
        ...visualObstacleBox,
        x: visualObstacleBox.x + 11,
        y: visualObstacleBox.y + verticalInset,
        width: visualObstacleBox.width - 22,
        height: visualObstacleBox.height - verticalInset,
      };
      if (!this.overlaps(playerBox, obstacleBox)) continue;

      const activeTutorialObstacle = (
        this.tutorialEnabled &&
        ((this.tutorialStep === 0 && obstacle.tutorial === "jump") ||
          (this.tutorialStep === 1 && obstacle.tutorial === "duck"))
      );

      if (activeTutorialObstacle) {
        const completedAction = (
          (obstacle.tutorial === "jump" && this.tutorialActions.jump) ||
          (obstacle.tutorial === "duck" && this.tutorialActions.duck)
        );
        if (!completedAction) this.repeatTutorialObstacle(obstacle);
      } else if (this.tutorialGrace <= 0) {
        this.finishRun();
      }
      break;
    }

    if (this.phase === "playing") this.checkCombatCollisions(playerBox);

    if (this.player.feet > 635) this.finishRun();

    this.updateTutorial(delta);
    this.updateParticles(delta);

    if (this.elapsed - this.lastHudUpdate > 0.065) {
      this.scoreNode.textContent = this.pad(this.distance);
      this.lastHudUpdate = this.elapsed;
    }
  }

  updateIntro(delta) {
    this.introTime += delta;

    if (this.introTime < 2.35) {
      this.worldOffset += delta * 18;
    } else {
      const runProgress = this.ease(this.clamp((this.introTime - 2.35) / 0.5, 0, 1));
      this.scrollWorld(delta * 210 * runProgress);
    }

    if (this.introTime >= 2.85) {
      this.player.x = 220;
      this.player.feet = 410;
      this.player.velocityX = 0;
      this.player.velocityY = 0;
      this.player.grounded = true;
      this.showPlayingInterface();
    }
  }

  tick(delta) {
    this.elapsed += delta;
    if (this.phase === "intro") this.updateIntro(delta);
    else if (this.phase === "playing") this.updateGame(delta);
  }

  drawSkyline(offset, baseY, spacing, color, windowAlpha, salt) {
    const context = this.context;
    const shift = offset % spacing;
    const firstIndex = Math.floor(offset / spacing) - 2;

    for (let column = -2; column < 12; column += 1) {
      const id = firstIndex + column;
      const width = spacing * (0.72 + this.random(id + salt) * 0.34);
      const height = 78 + this.random(id * 2 + salt) * 150;
      const x = column * spacing - shift;
      const top = baseY - height;

      context.fillStyle = color;
      context.fillRect(x, top, width, 540 - top);

      if (this.random(id + salt * 3) > 0.62) {
        context.fillRect(x + width * 0.44, top - 20, 3, 20);
      }

      context.globalAlpha = windowAlpha;
      for (let windowY = top + 20; windowY < baseY - 14; windowY += 25) {
        for (let windowX = x + 13; windowX < x + width - 10; windowX += 24) {
          const light = this.random(id * 31 + windowX * 0.07 + windowY * 0.11);
          if (light > 0.5) {
            context.fillStyle = light > 0.78 ? "#52bdad" : "#284769";
            context.fillRect(windowX, windowY, 7, 9);
          }
        }
      }
      context.globalAlpha = 1;
    }
  }

  drawSky() {
    const context = this.context;
    const sky = context.createLinearGradient(0, 0, 0, 540);
    sky.addColorStop(0, "#020815");
    sky.addColorStop(0.58, "#071225");
    sky.addColorStop(1, "#0c1727");
    context.fillStyle = sky;
    context.fillRect(0, 0, 960, 540);

    context.save();
    context.globalAlpha = 0.26;
    const glow = context.createRadialGradient(830, 92, 10, 830, 92, 100);
    glow.addColorStop(0, "#d8ffff");
    glow.addColorStop(0.25, "#8ecfd0");
    glow.addColorStop(1, "rgba(60, 130, 145, 0)");
    context.fillStyle = glow;
    context.fillRect(720, 0, 240, 210);
    if (this.signal.complete) {
      context.globalAlpha = 0.38;
      context.drawImage(this.signal, 786, 39, 90, 90);
    }
    context.restore();

    this.drawSkyline(this.worldOffset * 0.1, 248, 116, "#081326", 0.36, 2);
    this.drawSkyline(this.worldOffset * 0.24, 314, 94, "#0b1930", 0.54, 5);
    this.drawSkyline(this.worldOffset * 0.43, 355, 112, "#0d1d32", 0.72, 9);

    context.save();
    context.strokeStyle = "rgba(128, 225, 235, 0.13)";
    for (let index = 0; index < 56; index += 1) {
      const x = (index * 151 + this.elapsed * 190) % 1100 - 70;
      const y = (index * 83 + this.elapsed * 280) % 640 - 50;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - 9, y + 23);
      context.stroke();
    }
    context.restore();
  }

  drawPlatforms() {
    const context = this.context;
    const windowColors = ["#59ddb9", "#6e94ea", "#b184dc", "#d5ad59"];

    this.platforms.forEach((platform) => {
      const building = context.createLinearGradient(platform.x, platform.y, platform.x, 540);
      building.addColorStop(0, platform.color);
      building.addColorStop(1, "#07111f");
      context.fillStyle = building;
      context.fillRect(platform.x, platform.y, platform.width, 540 - platform.y);

      context.fillStyle = "#263750";
      context.fillRect(platform.x, platform.y, platform.width, 6);
      context.fillStyle = "#07101d";
      context.fillRect(platform.x, platform.y + 6, platform.width, 7);

      context.globalAlpha = 0.78;
      for (let windowY = platform.y + 33; windowY < 526; windowY += 30) {
        for (let windowX = platform.x + 19; windowX < platform.x + platform.width - 10; windowX += 31) {
          const glow = this.random(platform.seed * 47 + windowX * 0.13 + windowY * 0.19);
          if (glow > 0.34) {
            context.fillStyle = windowColors[Math.floor(glow * 10) % windowColors.length];
            context.fillRect(windowX, windowY, 9, 13);
          }
        }
      }
      context.globalAlpha = 1;

      if (platform.width > 520) {
        const tankX = platform.x + platform.width * 0.72;
        context.fillStyle = "#0a1422";
        context.fillRect(tankX, platform.y - 21, 52, 21);
        context.fillStyle = "#263a50";
        context.fillRect(tankX + 5, platform.y - 26, 42, 5);
        context.strokeStyle = "#17263a";
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(tankX + 8, platform.y);
        context.lineTo(tankX + 8, platform.y + 15);
        context.moveTo(tankX + 44, platform.y);
        context.lineTo(tankX + 44, platform.y + 15);
        context.stroke();
      }
    });
  }

  drawRamps() {
    const context = this.context;
    this.ramps.forEach((ramp) => {
      context.fillStyle = "#26384d";
      context.beginPath();
      context.moveTo(ramp.x, ramp.baseY);
      context.lineTo(ramp.x + ramp.width, ramp.baseY - ramp.height);
      context.lineTo(ramp.x + ramp.width, ramp.baseY);
      context.closePath();
      context.fill();

      context.strokeStyle = "#6ce6d5";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(ramp.x, ramp.baseY - 2);
      context.lineTo(ramp.x + ramp.width, ramp.baseY - ramp.height - 2);
      context.stroke();

      context.strokeStyle = "rgba(226, 166, 76, 0.85)";
      context.lineWidth = 3;
      for (let stripe = 20; stripe < ramp.width - 10; stripe += 28) {
        const progress = stripe / ramp.width;
        const surfaceY = ramp.baseY - ramp.height * progress;
        context.beginPath();
        context.moveTo(ramp.x + stripe - 8, surfaceY + 8);
        context.lineTo(ramp.x + stripe + 5, surfaceY + 13);
        context.stroke();
      }
    });
  }

  drawObstacle(obstacle) {
    const context = this.context;
    const box = this.obstacleBox(obstacle);

    if (obstacle.kind === "vent") {
      context.fillStyle = "#27384b";
      context.fillRect(box.x, box.y + 6, box.width, box.height - 6);
      context.fillStyle = "#3e5368";
      context.fillRect(box.x - 4, box.y, box.width + 8, 8);
      context.fillStyle = "#101c2a";
      for (let line = 0; line < 4; line += 1) {
        context.fillRect(box.x + 8, box.y + 14 + line * 6, box.width - 16, 2);
      }
      context.fillStyle = "#e2a64c";
      context.fillRect(box.x + 4, box.y + box.height - 5, box.width - 8, 3);
      return;
    }

    if (obstacle.kind === "crate") {
      context.fillStyle = "#503d32";
      context.fillRect(box.x, box.y, box.width, box.height);
      context.strokeStyle = "#9f7455";
      context.lineWidth = 5;
      context.strokeRect(box.x + 3, box.y + 3, box.width - 6, box.height - 6);
      context.beginPath();
      context.moveTo(box.x + 8, box.y + 8);
      context.lineTo(box.x + box.width - 8, box.y + box.height - 8);
      context.moveTo(box.x + box.width - 8, box.y + 8);
      context.lineTo(box.x + 8, box.y + box.height - 8);
      context.stroke();
      context.fillStyle = "#e2a64c";
      context.fillRect(box.x + 8, box.y + box.height - 8, box.width - 16, 4);
      return;
    }

    if (obstacle.kind === "beam") {
      context.save();
      context.shadowColor = "#63ead7";
      context.shadowBlur = 12;
      context.fillStyle = "#64e8d5";
      context.fillRect(box.x, box.y + 6, box.width, 6);
      context.restore();
      context.strokeStyle = "#53677f";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(box.x + 12, box.y + 6);
      context.lineTo(box.x + 20, box.y - 18);
      context.moveTo(box.x + box.width - 12, box.y + 6);
      context.lineTo(box.x + box.width - 20, box.y - 18);
      context.stroke();
      context.fillStyle = "#1f3146";
      context.fillRect(box.x + box.width / 2 - 12, box.y - 4, 24, 18);
      context.fillStyle = Math.sin(this.elapsed * 8) > 0 ? "#ff526c" : "#75283a";
      context.fillRect(box.x + box.width / 2 - 3, box.y + 1, 6, 4);
      return;
    }

    if (obstacle.kind === "drone") {
      context.fillStyle = "#263a52";
      context.beginPath();
      context.moveTo(box.x + 8, box.y + 8);
      context.lineTo(box.x + 22, box.y);
      context.lineTo(box.x + box.width - 22, box.y);
      context.lineTo(box.x + box.width - 8, box.y + 8);
      context.lineTo(box.x + box.width - 16, box.y + box.height);
      context.lineTo(box.x + 16, box.y + box.height);
      context.closePath();
      context.fill();
      context.strokeStyle = "#5e7896";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(box.x, box.y - 2);
      context.lineTo(box.x + 24, box.y + 4);
      context.moveTo(box.x + box.width, box.y - 2);
      context.lineTo(box.x + box.width - 24, box.y + 4);
      context.stroke();
      context.fillStyle = "#ff5570";
      context.fillRect(box.x + box.width / 2 - 4, box.y + 9, 8, 5);
      return;
    }

    if (obstacle.kind === "electric") {
      context.fillStyle = "rgba(41, 76, 89, .8)";
      context.fillRect(box.x, box.y + 10, box.width, 6);
      context.strokeStyle = Math.sin(this.elapsed * 16) > 0 ? "#72f4df" : "#d8ffff";
      context.lineWidth = 3;
      context.beginPath();
      for (let x = box.x; x < box.x + box.width; x += 16) {
        context.moveTo(x, box.y + 10);
        context.lineTo(x + 6, box.y + 1);
        context.lineTo(x + 12, box.y + 10);
      }
      context.stroke();
      return;
    }

    context.fillStyle = "#263a50";
    context.fillRect(box.x + 24, box.y + 29, 8, 21);
    context.strokeStyle = "#6d8298";
    context.lineWidth = 4;
    context.beginPath();
    context.arc(box.x + 27, box.y + 24, 22, Math.PI * 0.9, Math.PI * 1.9);
    context.stroke();
    context.strokeStyle = "#50d9c4";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(box.x + 28, box.y + 24);
    context.lineTo(box.x + 50, box.y + 9);
    context.stroke();
  }

  drawObstacles() {
    this.obstacles.forEach((obstacle) => this.drawObstacle(obstacle));
  }

  drawBombs() {
    const context = this.context;
    this.bombs.forEach((hazard) => {
      if (hazard.exploded) {
        const progress = 1 - this.clamp(hazard.explosionTime / 0.34, 0, 1);
        const radius = 14 + progress * 58;
        const blast = context.createRadialGradient(hazard.x, hazard.y, 2, hazard.x, hazard.y, radius);
        blast.addColorStop(0, hazard.harmless ? "rgba(190,255,245,.9)" : "rgba(255,245,188,.98)");
        blast.addColorStop(0.28, hazard.harmless ? "rgba(91,240,218,.5)" : "rgba(255,126,55,.68)");
        blast.addColorStop(1, "rgba(255,55,90,0)");
        context.fillStyle = blast;
        context.beginPath();
        context.arc(hazard.x, hazard.y, radius, 0, Math.PI * 2);
        context.fill();
        return;
      }

      if (hazard.kind === "joker-gas") {
        context.save();
        context.translate(hazard.x, hazard.y);
        if (hazard.active) {
          context.globalAlpha = 0.36;
          context.shadowColor = "#62ef7b";
          context.shadowBlur = 14;
          for (let puff = 0; puff < 7; puff += 1) {
            const angle = puff * 1.73 + this.elapsed * 0.7;
            const x = Math.cos(angle) * (15 + (puff % 3) * 8);
            const y = Math.sin(angle) * 12 - 7 - (puff % 2) * 9;
            context.fillStyle = puff % 2 ? "#62d66d" : "#9aef65";
            context.beginPath();
            context.arc(x, y, 18 + (puff % 3) * 4, 0, Math.PI * 2);
            context.fill();
          }
        } else {
          context.rotate(hazard.rotation);
          context.fillStyle = "#27392c";
          context.fillRect(-8, -12, 16, 24);
          context.strokeStyle = "#77ef7d";
          context.lineWidth = 2;
          context.strokeRect(-8, -12, 16, 24);
          context.fillStyle = "#bbff75";
          context.fillRect(-3, -4, 6, 8);
        }
        context.restore();
        return;
      }

      if (hazard.kind === "bane-wave") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.strokeStyle = "#ef7654";
        context.fillStyle = "rgba(239,118,84,.32)";
        context.shadowColor = "#ef7654";
        context.shadowBlur = 12;
        if (!hazard.active) {
          const pulse = 18 + Math.sin(this.elapsed * 18) * 7;
          context.lineWidth = 4;
          context.beginPath();
          context.ellipse(0, -2, pulse * 1.7, pulse * 0.35, 0, 0, Math.PI * 2);
          context.stroke();
        } else {
          context.beginPath();
          context.moveTo(-31, 0);
          context.lineTo(-20, -16);
          context.lineTo(-9, -4);
          context.lineTo(2, -27);
          context.lineTo(13, -7);
          context.lineTo(27, -20);
          context.lineTo(31, 0);
          context.closePath();
          context.fill();
          context.stroke();
        }
        context.restore();
        return;
      }

      if (hazard.kind === "riddler-orb") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.globalAlpha = hazard.delay > 0 ? 0.38 : 1;
        context.shadowColor = "#72f08b";
        context.shadowBlur = 15;
        const glow = context.createRadialGradient(0, 0, 2, 0, 0, hazard.radius + 5);
        glow.addColorStop(0, "#e7ff8a");
        glow.addColorStop(0.4, "#5fe77c");
        glow.addColorStop(1, "rgba(39,130,69,.2)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(0, 0, hazard.radius + 4, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#092717";
        context.font = "700 20px 'Courier New', monospace";
        context.textAlign = "center";
        context.fillText("?", 0, 7);
        context.restore();
        return;
      }

      if (hazard.kind === "riddler-laser") {
        context.save();
        const pulse = 0.45 + Math.sin(this.elapsed * 24) * 0.18;
        context.globalAlpha = hazard.active ? 0.95 : pulse;
        context.shadowColor = "#6fff8d";
        context.shadowBlur = hazard.active ? 18 : 7;
        context.fillStyle = hazard.active ? "#8dffa1" : "#3b9e55";
        context.fillRect(hazard.x, hazard.y - (hazard.active ? 5 : 1), hazard.width, hazard.active ? 10 : 2);
        for (let marker = 80; marker < hazard.width; marker += 120) {
          context.fillStyle = "#dfff7d";
          context.font = "700 15px 'Courier New', monospace";
          context.textAlign = "center";
          context.fillText("?", marker, hazard.y - 9);
        }
        context.restore();
        return;
      }

      if (hazard.kind === "penguin-missile") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.rotate(-0.45 + Math.sin(hazard.rotation) * 0.08);
        context.globalAlpha = hazard.delay > 0 ? 0.42 : 1;
        context.shadowColor = "#76c8ff";
        context.shadowBlur = 11;
        context.fillStyle = "#263b53";
        context.beginPath();
        context.arc(0, 0, 13, Math.PI, 0);
        context.lineTo(0, 2);
        context.closePath();
        context.fill();
        context.strokeStyle = "#9bdcff";
        context.lineWidth = 2;
        context.stroke();
        context.strokeStyle = "#8ea7b9";
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(0, 21);
        context.stroke();
        context.fillStyle = Math.sin(this.elapsed * 26) > 0 ? "#ffb04d" : "#ff5471";
        context.beginPath();
        context.moveTo(11, -4);
        context.lineTo(23, 0);
        context.lineTo(11, 4);
        context.closePath();
        context.fill();
        context.restore();
        return;
      }

      if (hazard.kind === "penguin-bot") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.shadowColor = "#78c8ff";
        context.shadowBlur = 8;
        context.fillStyle = "#111a28";
        context.beginPath();
        context.ellipse(0, 0, 17, 20, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#dceff2";
        context.beginPath();
        context.ellipse(0, 4, 10, 13, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#e7a845";
        context.beginPath();
        context.moveTo(0, -7);
        context.lineTo(9, -3);
        context.lineTo(0, 0);
        context.closePath();
        context.fill();
        context.fillStyle = Math.sin(this.elapsed * 20) > 0 ? "#ff4d6e" : "#6b2b3c";
        context.fillRect(-4, 5, 8, 5);
        context.strokeStyle = "#7b94aa";
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(-9, 17);
        context.lineTo(-12, 22);
        context.moveTo(9, 17);
        context.lineTo(12, 22);
        context.stroke();
        context.restore();
        return;
      }

      context.save();
      context.translate(hazard.x, hazard.y);
      context.rotate(hazard.rotation);
      context.shadowColor = hazard.harmless ? "#64f4df" : "#ff466a";
      context.shadowBlur = 9;
      context.fillStyle = "#11101d";
      context.beginPath();
      context.arc(0, 0, hazard.radius, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 3;
      context.strokeStyle = "#6c3a83";
      context.stroke();
      context.fillStyle = Math.sin(this.elapsed * 18) > 0 ? "#ff4966" : "#753044";
      context.fillRect(-3, -4, 6, 7);
      context.strokeStyle = "#82ef7b";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(5, -10);
      context.quadraticCurveTo(10, -18, 15, -14);
      context.stroke();
      context.restore();
    });
  }

  drawBane() {
    const context = this.context;
    const bane = this.joker;
    const runCycle = Math.sin(this.elapsed * 11) * (bane.state === "entering" ? 5 : 2);
    const charging = bane.attackMode === "bane-charge";

    context.save();
    context.translate(bane.x, bane.feet);
    if (bane.state === "defeated") context.rotate(bane.rotation);
    else if (charging) context.rotate(-0.1);
    if (bane.hitFlash > 0) {
      context.globalAlpha = 0.72 + Math.sin(this.elapsed * 80) * 0.2;
      context.shadowColor = "white";
      context.shadowBlur = 18;
    }

    context.fillStyle = "rgba(0,0,0,.32)";
    context.beginPath();
    context.ellipse(0, 2, 37, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#202731";
    context.lineWidth = 13;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-13, -23);
    context.lineTo(-17 - runCycle, -2);
    context.moveTo(13, -23);
    context.lineTo(18 + runCycle, -2);
    context.stroke();

    context.fillStyle = bane.hitFlash > 0 ? "#d9fff8" : "#3a403c";
    context.beginPath();
    context.moveTo(-29, -72);
    context.quadraticCurveTo(0, -86, 30, -70);
    context.lineTo(25, -20);
    context.lineTo(-25, -20);
    context.closePath();
    context.fill();
    context.fillStyle = "#5b3028";
    context.fillRect(-26, -50, 52, 12);
    context.fillStyle = "#7f8d74";
    context.fillRect(-8, -67, 16, 39);

    context.strokeStyle = bane.hitFlash > 0 ? "#d9fff8" : "#4b504b";
    context.lineWidth = 15;
    context.beginPath();
    context.moveTo(-24, -64);
    context.lineTo(-39 - (charging ? 12 : 0), -37);
    context.moveTo(24, -64);
    context.lineTo(40 + (charging ? 15 : 0), -39);
    context.stroke();
    context.fillStyle = "#1d2428";
    context.beginPath();
    context.arc(-42 - (charging ? 12 : 0), -35, 9, 0, Math.PI * 2);
    context.arc(43 + (charging ? 15 : 0), -37, 9, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#c5b5a0";
    context.beginPath();
    context.arc(0, -88, 18, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#20262a";
    context.beginPath();
    context.moveTo(-18, -94);
    context.lineTo(-11, -106);
    context.lineTo(11, -106);
    context.lineTo(18, -94);
    context.lineTo(13, -77);
    context.lineTo(5, -84);
    context.lineTo(0, -76);
    context.lineTo(-6, -84);
    context.lineTo(-14, -77);
    context.closePath();
    context.fill();
    context.fillStyle = "#e9f5e7";
    context.fillRect(-10, -93, 6, 3);
    context.fillRect(5, -93, 6, 3);

    context.strokeStyle = "#62efac";
    context.shadowColor = "#62efac";
    context.shadowBlur = bane.attackMode?.startsWith("bane-charge") ? 13 : 6;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-16, -72);
    context.quadraticCurveTo(-28, -86, -13, -100);
    context.moveTo(16, -72);
    context.quadraticCurveTo(28, -86, 13, -100);
    context.stroke();
    context.restore();
  }

  drawRiddler() {
    const context = this.context;
    const riddler = this.joker;
    const runCycle = Math.sin(this.elapsed * 13) * (riddler.state === "entering" ? 5 : 1.5);
    const casting = riddler.attackLabelTimer > 0;

    context.save();
    context.translate(riddler.x, riddler.feet);
    if (riddler.state === "defeated") context.rotate(riddler.rotation);
    if (riddler.hitFlash > 0) {
      context.globalAlpha = 0.72 + Math.sin(this.elapsed * 80) * 0.2;
      context.shadowColor = "white";
      context.shadowBlur = 18;
    }
    context.fillStyle = "rgba(0,0,0,.28)";
    context.beginPath();
    context.ellipse(0, 2, 27, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#173d29";
    context.lineWidth = 9;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-7, -18);
    context.lineTo(-10 - runCycle, -2);
    context.moveTo(8, -18);
    context.lineTo(12 + runCycle, -2);
    context.stroke();

    context.fillStyle = riddler.hitFlash > 0 ? "#eafff0" : "#23834e";
    context.beginPath();
    context.moveTo(-18, -62);
    context.lineTo(18, -62);
    context.lineTo(22, -17);
    context.lineTo(-20, -17);
    context.closePath();
    context.fill();
    context.fillStyle = "#131d18";
    context.fillRect(-18, -43, 38, 5);
    context.fillStyle = "#d9ff6d";
    context.font = "700 24px 'Courier New', monospace";
    context.textAlign = "center";
    context.fillText("?", 1, -27);

    context.strokeStyle = riddler.hitFlash > 0 ? "#eafff0" : "#2a9b59";
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(-14, -55);
    context.lineTo(-27 - (casting ? 12 : 0), -38);
    context.moveTo(15, -55);
    context.lineTo(29, -39);
    context.stroke();

    context.fillStyle = "#d9ddd2";
    context.beginPath();
    context.arc(0, -73, 14, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#123822";
    context.fillRect(-16, -88, 32, 7);
    context.fillRect(-11, -102, 22, 15);
    context.fillStyle = "#d9ff6d";
    context.fillRect(-10, -90, 20, 3);
    context.fillStyle = "#1b3022";
    context.fillRect(-8, -76, 5, 3);
    context.fillRect(4, -76, 5, 3);
    context.strokeStyle = "#6be386";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(29, -39);
    context.lineTo(34, -3);
    context.arc(29, -1, 7, 0, Math.PI * 1.45);
    context.stroke();
    context.restore();
  }

  drawPenguin() {
    const context = this.context;
    const penguin = this.joker;
    const runCycle = Math.sin(this.elapsed * 12) * (penguin.state === "entering" ? 4 : 1.3);
    const attacking = penguin.attackLabelTimer > 0;

    context.save();
    context.translate(penguin.x, penguin.feet);
    if (penguin.state === "defeated") context.rotate(penguin.rotation);
    if (penguin.hitFlash > 0) {
      context.globalAlpha = 0.72 + Math.sin(this.elapsed * 80) * 0.2;
      context.shadowColor = "white";
      context.shadowBlur = 18;
    }
    context.fillStyle = "rgba(0,0,0,.3)";
    context.beginPath();
    context.ellipse(0, 2, 31, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#161f2c";
    context.lineWidth = 9;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-8, -13);
    context.lineTo(-12 - runCycle, -1);
    context.moveTo(8, -13);
    context.lineTo(12 + runCycle, -1);
    context.stroke();

    context.fillStyle = penguin.hitFlash > 0 ? "#e8f7ff" : "#151d29";
    context.beginPath();
    context.ellipse(0, -35, 28, 34, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e4edf1";
    context.beginPath();
    context.ellipse(0, -31, 15, 24, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#87394e";
    context.beginPath();
    context.moveTo(-9, -52);
    context.lineTo(0, -45);
    context.lineTo(9, -52);
    context.lineTo(0, -57);
    context.closePath();
    context.fill();

    context.fillStyle = "#d6d4cb";
    context.beginPath();
    context.arc(0, -65, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#111927";
    context.fillRect(-17, -81, 34, 7);
    context.fillRect(-11, -99, 22, 19);
    context.fillStyle = "#7aa4ce";
    context.fillRect(-10, -83, 20, 3);
    context.fillStyle = "#1f2730";
    context.fillRect(-8, -68, 5, 3);
    context.fillRect(4, -68, 5, 3);

    context.strokeStyle = "#8da9bb";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(22, -48);
    context.lineTo(34 + (attacking ? 11 : 0), -4);
    context.stroke();
    context.fillStyle = "#263b53";
    context.beginPath();
    context.arc(22, -49, 21, Math.PI, 0);
    context.lineTo(22, -45);
    context.closePath();
    context.fill();
    context.strokeStyle = "#9bdcff";
    context.stroke();
    context.restore();
  }

  drawJoker() {
    if (!this.joker) return;
    if (this.joker.kind === "bane") {
      this.drawBane();
      return;
    }
    if (this.joker.kind === "riddler") {
      this.drawRiddler();
      return;
    }
    if (this.joker.kind === "penguin") {
      this.drawPenguin();
      return;
    }
    const context = this.context;
    const joker = this.joker;
    const runCycle = Math.sin(this.elapsed * 12) * (joker.state === "entering" ? 5 : 2);
    const attackPose = joker.state !== "defeated" && joker.attackLabelTimer > 0 ? 1 : 0;

    context.save();
    context.translate(joker.x, joker.feet);
    if (joker.state === "defeated") context.rotate(joker.rotation);
    if (joker.hitFlash > 0) {
      context.globalAlpha = 0.72 + Math.sin(this.elapsed * 80) * 0.2;
      context.shadowColor = "white";
      context.shadowBlur = 18;
    }

    context.fillStyle = "rgba(0,0,0,.28)";
    context.beginPath();
    context.ellipse(0, 2, 29, 7, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#37224e";
    context.lineWidth = 9;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-8, -18);
    context.lineTo(-11 - runCycle, -2);
    context.moveTo(8, -18);
    context.lineTo(12 + runCycle, -2);
    context.stroke();

    context.fillStyle = joker.hitFlash > 0 ? "#d9fff8" : "#542b75";
    context.beginPath();
    context.moveTo(-21, -58);
    context.lineTo(19, -58);
    context.lineTo(24, -17);
    context.lineTo(10, -10);
    context.lineTo(1, -22);
    context.lineTo(-12, -9);
    context.lineTo(-24, -18);
    context.closePath();
    context.fill();

    context.fillStyle = "#3e9f65";
    context.beginPath();
    context.moveTo(-7, -54);
    context.lineTo(8, -54);
    context.lineTo(5, -23);
    context.lineTo(-4, -23);
    context.closePath();
    context.fill();
    context.fillStyle = "#e6c54c";
    context.fillRect(-2, -50, 5, 20);

    context.strokeStyle = joker.hitFlash > 0 ? "#d9fff8" : "#613184";
    context.lineWidth = 9;
    context.beginPath();
    context.moveTo(-16, -51);
    context.lineTo(-31 - attackPose * 9, -34 - attackPose * 8);
    context.moveTo(15, -51);
    context.lineTo(27, -37);
    context.stroke();

    context.fillStyle = "#e5eee4";
    context.beginPath();
    context.arc(0, -70, 15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#319456";
    context.beginPath();
    context.moveTo(-15, -76);
    context.lineTo(-11, -89);
    context.lineTo(-4, -82);
    context.lineTo(1, -92);
    context.lineTo(6, -82);
    context.lineTo(14, -88);
    context.lineTo(15, -73);
    context.quadraticCurveTo(0, -82, -15, -76);
    context.fill();
    context.fillStyle = "#182025";
    context.fillRect(-9, -73, 5, 3);
    context.fillRect(5, -73, 5, 3);
    context.strokeStyle = "#c93551";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, -66, 9, 0.15, Math.PI - 0.15);
    context.stroke();
    context.restore();
  }

  drawBatarangs() {
    const context = this.context;
    this.batarangs.forEach((batarang) => {
      context.save();
      context.translate(batarang.x, batarang.y);
      context.rotate(batarang.rotation);
      context.shadowColor = "#75f4df";
      context.shadowBlur = 8;
      context.fillStyle = "#172a39";
      context.strokeStyle = "#75e5d5";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(-15, 0);
      context.lineTo(-8, -7);
      context.lineTo(-1, -3);
      context.lineTo(0, -9);
      context.lineTo(2, -3);
      context.lineTo(9, -7);
      context.lineTo(15, 0);
      context.lineTo(7, 3);
      context.lineTo(0, 1);
      context.lineTo(-7, 3);
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    });
  }

  drawBossHud() {
    if (!this.joker) return;
    const context = this.context;
    const joker = this.joker;
    const profile = VILLAIN_PROFILES[joker.kind];
    const healthRatio = this.clamp(joker.health / joker.maxHealth, 0, 1);

    context.save();
    context.fillStyle = "rgba(3,10,21,.84)";
    context.strokeStyle = profile.color;
    context.lineWidth = 1;
    context.fillRect(328, 78, 304, 58);
    context.strokeRect(328.5, 78.5, 303, 57);
    context.fillStyle = "#d9fff8";
    context.font = "700 15px 'Courier New', monospace";
    context.textAlign = "left";
    context.fillText(profile.name, 344, 98);
    context.fillStyle = "#7f9da0";
    context.font = "10px 'Courier New', monospace";
    context.textAlign = "right";
    context.fillText(`${Math.max(0, joker.health)} / ${joker.maxHealth}`, 616, 98);
    context.fillStyle = "#171b2c";
    context.fillRect(344, 106, 272, 8);
    context.fillStyle = healthRatio > 0.55
      ? "#70ef91"
      : (healthRatio > 0.28 ? "#e6c35d" : "#ff4d70");
    context.fillRect(344, 106, 272 * healthRatio, 8);

    if (joker.attackLabelTimer > 0 && joker.state !== "defeated") {
      context.globalAlpha = this.clamp(joker.attackLabelTimer / 0.2, 0, 1);
      context.fillStyle = profile.color;
      context.font = "700 10px 'Courier New', monospace";
      context.textAlign = "center";
      context.fillText(`// ${joker.attackLabel}`, 480, 129);
      context.globalAlpha = 1;
    }

    if (this.bossBannerTime > 0) {
      const alpha = this.clamp(this.bossBannerTime / 0.45, 0, 1);
      context.globalAlpha = alpha;
      context.fillStyle = "rgba(3,10,21,.8)";
      context.fillRect(292, 140, 376, 38);
      context.strokeStyle = joker.state === "defeated" ? "#70ef91" : profile.color;
      context.strokeRect(292.5, 140.5, 375, 37);
      context.fillStyle = joker.state === "defeated" ? "#92ffab" : "#f0e1ff";
      context.font = "700 13px 'Courier New', monospace";
      context.textAlign = "center";
      context.fillText(
        joker.state === "defeated"
          ? `${profile.name} DEFEATED`
          : `${profile.name} INCOMING  •  SPACE / THROW`,
        480,
        164,
      );
    }
    context.restore();
  }

  drawParticles() {
    const context = this.context;
    this.particles.forEach((particle) => {
      context.globalAlpha = this.clamp(particle.life * 2, 0, 1);
      context.fillStyle = particle.color;
      context.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    context.globalAlpha = 1;
  }

  drawBatman(x, feet, duckAmount, grounded, motion = 1) {
    const context = this.context;
    const runCycle = grounded ? Math.sin(this.elapsed * 16) * motion * (1 - duckAmount) : 0.25;
    const capeWave = Math.sin(this.elapsed * 11) * 4 * motion;
    const throwReach = this.throwAnimation > 0
      ? Math.sin((this.throwAnimation / 0.18) * Math.PI) * 20
      : 0;

    context.save();
    context.translate(x + duckAmount * 7, feet);
    context.scale(1 + duckAmount * 0.1, 1 - duckAmount * 0.39);

    context.fillStyle = "rgba(4, 9, 20, .92)";
    context.beginPath();
    context.moveTo(-13, -57);
    context.quadraticCurveTo(-47 - runCycle * 7, -44 + capeWave, -43, -7);
    context.lineTo(-25, -18);
    context.lineTo(-10, -8);
    context.closePath();
    context.fill();

    context.strokeStyle = "#17243a";
    context.lineWidth = 9;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-7, -11);
    context.lineTo(-10 - runCycle * 9, -1);
    context.moveTo(8, -11);
    context.lineTo(13 + runCycle * 9, -1);
    context.stroke();

    context.fillStyle = "#17253d";
    context.beginPath();
    context.moveTo(-16, -56);
    context.lineTo(15, -56);
    context.lineTo(20, -17);
    context.lineTo(-17, -17);
    context.closePath();
    context.fill();

    context.fillStyle = "#b6a34a";
    context.fillRect(-17, -20, 37, 5);
    context.fillStyle = "#52dac3";
    context.fillRect(-4, -37, 8, 4);

    context.strokeStyle = "#1d2e49";
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(11, -49);
    context.lineTo(25 + runCycle * 4 + throwReach, -37 - throwReach * 0.22);
    context.stroke();

    context.fillStyle = "#0b1628";
    context.beginPath();
    context.moveTo(-15, -57);
    context.lineTo(-12, -78);
    context.lineTo(-4, -68);
    context.lineTo(5, -68);
    context.lineTo(14, -79);
    context.lineTo(16, -55);
    context.lineTo(7, -49);
    context.lineTo(-7, -49);
    context.closePath();
    context.fill();

    context.fillStyle = "#b6fff4";
    context.fillRect(-8, -62, 6, 2);
    context.fillRect(5, -62, 6, 2);
    context.restore();
  }

  drawIntro() {
    const context = this.context;
    const pivotX = 185;
    const pivotY = 20;
    const ropeLength = 285;

    if (this.introTime < 1.85) {
      const progress = this.ease(this.clamp(this.introTime / 1.85, 0, 1));
      const angle = -1.27 + progress * 1.29;
      const batX = pivotX + Math.sin(angle) * ropeLength;
      const batFeet = pivotY + Math.cos(angle) * ropeLength + 32;

      context.save();
      context.strokeStyle = "#73f2df";
      context.lineWidth = 3;
      context.shadowColor = "#5cf4de";
      context.shadowBlur = 8;
      context.beginPath();
      context.moveTo(pivotX, pivotY);
      context.lineTo(batX + 21, batFeet - 39);
      context.stroke();
      context.fillStyle = "#d8ffff";
      context.beginPath();
      context.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
      context.fill();
      context.restore();

      this.drawBatman(batX, batFeet, 0, false, 0.35 + progress * 0.35);
      return;
    }

    const releaseAngle = 0.02;
    const releaseX = pivotX + Math.sin(releaseAngle) * ropeLength;
    const releaseFeet = pivotY + Math.cos(releaseAngle) * ropeLength + 32;

    if (this.introTime < 2.35) {
      const progress = this.ease(this.clamp((this.introTime - 1.85) / 0.5, 0, 1));
      const batX = releaseX + (220 - releaseX) * progress;
      const batFeet = releaseFeet + (410 - releaseFeet) * progress - Math.sin(progress * Math.PI) * 18;
      const retract = this.clamp((this.introTime - 1.85) / 0.3, 0, 1);

      if (retract < 1) {
        const handX = batX + 21;
        const handY = batFeet - 39;
        context.strokeStyle = `rgba(115, 242, 223, ${1 - retract})`;
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(pivotX, pivotY);
        context.lineTo(
          handX + (pivotX - handX) * retract,
          handY + (pivotY - handY) * retract,
        );
        context.stroke();
      }

      this.drawBatman(batX, batFeet, 0, progress > 0.94, 0.45 + progress * 0.45);
      return;
    }

    const runProgress = this.ease(this.clamp((this.introTime - 2.35) / 0.5, 0, 1));
    this.drawBatman(220, 410, 0, true, runProgress);
  }

  draw() {
    const context = this.context;
    context.clearRect(0, 0, 960, 540);
    this.drawSky();
    this.drawPlatforms();
    this.drawRamps();
    this.drawObstacles();
    this.drawBombs();
    this.drawJoker();

    if (this.phase === "intro") this.drawIntro();
    else {
      this.drawBatman(
        this.player.x,
        this.player.feet,
        this.player.duckAmount,
        this.player.grounded,
      );
    }

    this.drawBatarangs();
    this.drawParticles();

    const bottomShade = context.createLinearGradient(0, 440, 0, 540);
    bottomShade.addColorStop(0, "rgba(1, 5, 12, 0)");
    bottomShade.addColorStop(1, "rgba(1, 5, 12, .72)");
    context.fillStyle = bottomShade;
    context.fillRect(0, 440, 960, 100);
    this.drawBossHud();
  }

  frame(now) {
    const frameTime = Math.min((now - this.previousFrame) / 1000, 0.05);
    this.previousFrame = now;
    this.accumulator += frameTime;

    while (this.accumulator >= this.fixedStep) {
      this.tick(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }

    this.draw();
    this.animationFrame = window.requestAnimationFrame(this.frame);
  }
}
