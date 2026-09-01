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
    health: 12,
    color: "#b26ade",
    hitColor: "#75ff8f",
    minDelay: 1.05,
    maxDelay: 1.55,
    meleeLabel: "CROWBAR RUSH",
    meleeWindup: 0.48,
    meleeSpeed: 610,
    meleeReach: 18,
    baseTarget: 720,
  },
  bane: {
    name: "BANE",
    health: 16,
    color: "#e06b50",
    hitColor: "#72f4df",
    minDelay: 1.15,
    maxDelay: 1.7,
    meleeLabel: "VENOM CHARGE",
    meleeWindup: 0.52,
    meleeSpeed: 730,
    meleeReach: 10,
    baseTarget: 750,
  },
  riddler: {
    name: "RIDDLER",
    health: 13,
    color: "#5be07c",
    hitColor: "#d8ff65",
    minDelay: 1.12,
    maxDelay: 1.68,
    meleeLabel: "CANE STRIKE",
    meleeWindup: 0.55,
    meleeSpeed: 570,
    meleeReach: 20,
    baseTarget: 720,
  },
  penguin: {
    name: "PENGUIN",
    health: 14,
    color: "#78a9dc",
    hitColor: "#b9e8ff",
    minDelay: 1.14,
    maxDelay: 1.7,
    meleeLabel: "UMBRELLA LUNGE",
    meleeWindup: 0.52,
    meleeSpeed: 590,
    meleeReach: 22,
    baseTarget: 700,
  },
  ivy: {
    name: "POISON IVY",
    health: 14,
    color: "#66d66f",
    hitColor: "#ff8ab1",
    minDelay: 1.1,
    maxDelay: 1.65,
    meleeLabel: "THORN LASH",
    meleeWindup: 0.5,
    meleeSpeed: 605,
    meleeReach: 24,
    baseTarget: 715,
  },
  twoface: {
    name: "TWO-FACE",
    health: 15,
    color: "#e09a55",
    hitColor: "#bfe8ff",
    minDelay: 1,
    maxDelay: 1.55,
    meleeLabel: "COIN-FLIP RUSH",
    meleeWindup: 0.46,
    meleeSpeed: 650,
    meleeReach: 18,
    baseTarget: 725,
  },
  scarecrow: {
    name: "SCARECROW",
    health: 14,
    color: "#c99b55",
    hitColor: "#e7ff86",
    minDelay: 1.08,
    maxDelay: 1.62,
    meleeLabel: "SCYTHE LUNGE",
    meleeWindup: 0.54,
    meleeSpeed: 620,
    meleeReach: 23,
    baseTarget: 710,
  },
  freeze: {
    name: "MR. FREEZE",
    health: 17,
    color: "#76d9ff",
    hitColor: "#e7fbff",
    minDelay: 1.18,
    maxDelay: 1.75,
    meleeLabel: "CRYO HAMMER",
    meleeWindup: 0.58,
    meleeSpeed: 560,
    meleeReach: 14,
    baseTarget: 750,
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
    this.heartsNode = document.querySelector("#hearts");

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

  combatRandom() {
    if (globalThis.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      globalThis.crypto.getRandomValues(value);
      return value[0] / 4294967296;
    }
    return Math.random();
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
    this.playerHearts = 3;
    this.maxPlayerHearts = 3;
    this.bossInvulnerability = 0;
    this.damageFlash = 0;
    this.damageBannerTime = 0;
    this.joker = null;
    this.nextBossTime = Number.POSITIVE_INFINITY;
    this.bossArenaActive = false;
    this.jokerEncounters = 0;
    this.lastVillain = null;
    this.villainQueue = this.shuffleVillains(Object.keys(VILLAIN_PROFILES));
    if (!this.tutorialEnabled) this.scheduleNextBossEncounter(true);
    this.bossBannerTime = 0;
    this.throwCooldown = 0;
    this.throwAnimation = 0;
    this.maxBatarangCharges = 3;
    this.batarangCharges = 3;
    this.batarangRechargeInterval = 1.1;
    this.batarangRechargeTimer = 0;
    this.batarangEmptyFlash = 0;

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
    this.updateHearts();
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
    this.updateHearts();

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

  updateHearts() {
    const fullHearts = Math.max(0, this.playerHearts);
    const emptyHearts = Math.max(0, this.maxPlayerHearts - fullHearts);
    const bossFight = Boolean(
      this.phase === "playing" &&
      this.joker &&
      this.joker.state !== "defeated"
    );
    this.heartsNode.textContent = `${"♥ ".repeat(fullHearts)}${"♡ ".repeat(emptyHearts)}`.trim();
    this.heartsNode.classList.toggle("visible", bossFight);
    this.heartsNode.classList.toggle("critical", fullHearts === 1);
    this.heartsNode.setAttribute(
      "aria-label",
      `Batman health: ${fullHearts} ${fullHearts === 1 ? "heart" : "hearts"}`,
    );
  }

  takeBossDamage() {
    if (
      this.phase !== "playing" ||
      !this.joker ||
      this.joker.state === "defeated" ||
      this.bossInvulnerability > 0
    ) return false;

    this.playerHearts = Math.max(0, this.playerHearts - 1);
    this.bossInvulnerability = 1.1;
    this.damageFlash = 0.32;
    this.damageBannerTime = 1.05;
    this.player.x = this.clamp(this.player.x - 34, 108, 365);
    this.player.velocityX = -250;
    if (this.player.grounded) {
      this.player.grounded = false;
      this.player.onRamp = null;
      this.player.velocityY = -285;
    }
    this.spawnDust(this.player.x + 15, this.player.feet - 42, 20, "#ff6279");
    this.updateHearts();

    if (this.playerHearts === 0) this.finishRun();
    return true;
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
        if (!this.joker && !Number.isFinite(this.nextBossTime)) {
          this.scheduleNextBossEncounter(true);
        }
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
    if (this.bossArenaActive) {
      const arena = this.platforms.find((platform) => (
        this.player.x >= platform.x && this.player.x <= platform.x + platform.width
      ));
      if (arena) {
        arena.width = Math.max(arena.width, 1900 - arena.x);
        this.platforms = this.platforms
          .filter((platform) => platform === arena || platform.x + platform.width < arena.x)
          .sort((first, second) => first.x - second.x);
      }
      this.obstacles = [];
      this.ramps = [];
      return;
    }

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

  shuffleVillains(villains) {
    const shuffled = [...villains];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.combatRandom() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  nextVillain() {
    if (this.villainQueue.length === 0) {
      this.villainQueue = this.shuffleVillains(Object.keys(VILLAIN_PROFILES));
      if (this.villainQueue[0] === this.lastVillain) {
        this.villainQueue.push(this.villainQueue.shift());
      }
    }
    const villain = this.villainQueue.shift();
    this.lastVillain = villain;
    return villain;
  }

  scheduleNextBossEncounter(firstEncounter = false) {
    const minimumDelay = firstEncounter ? 12 : 22;
    const maximumDelay = firstEncounter ? 34 : 58;
    this.nextBossTime = this.elapsed + minimumDelay + this.combatRandom() * (
      maximumDelay - minimumDelay
    );
  }

  prepareBossArena() {
    const arena = this.platforms.find((platform) => (
      this.player.x >= platform.x && this.player.x <= platform.x + platform.width
    ));
    if (!arena) return null;

    this.bossArenaActive = true;
    arena.width = Math.max(arena.width, 1900 - arena.x);
    this.platforms = this.platforms
      .filter((platform) => platform === arena || platform.x + platform.width < arena.x)
      .sort((first, second) => first.x - second.x);
    this.ramps = [];
    this.obstacles = [];
    this.fillWorld();
    return arena;
  }

  releaseBossArena() {
    const arena = this.platforms.find((platform) => (
      this.player.x >= platform.x && this.player.x <= platform.x + platform.width
    ));
    this.bossArenaActive = false;

    if (arena) {
      const runwayEnd = 1040;
      arena.width = Math.max(260, runwayEnd - arena.x);
      this.platforms = this.platforms
        .filter((platform) => platform === arena || platform.x + platform.width < arena.x)
        .sort((first, second) => first.x - second.x);
    }

    this.fillWorld();
  }

  spawnVillain() {
    const arena = this.prepareBossArena();
    const kind = this.nextVillain();
    const profile = VILLAIN_PROFILES[kind];
    const maxHealth = profile.health + Math.min(Math.floor(this.jokerEncounters / 2), 6);
    const baseTarget = profile.baseTarget;
    const targetX = baseTarget + (this.combatRandom() - 0.5) * 54;
    const entryStyle = this.combatRandom() < 0.45 ? "drop" : "dash";
    const arenaY = arena?.y ?? 410;
    this.jokerEncounters += 1;
    this.nextBossTime = Number.POSITIVE_INFINITY;
    this.batarangs = [];
    this.bombs = [];
    this.playerHearts = this.maxPlayerHearts;
    this.bossInvulnerability = 0;
    this.batarangCharges = this.maxBatarangCharges;
    this.batarangRechargeTimer = 0;
    this.batarangEmptyFlash = 0;
    this.joker = {
      x: entryStyle === "drop" ? targetX : 1040,
      targetX,
      feet: entryStyle === "drop" ? -105 : arenaY,
      landingFeet: arenaY,
      entryStyle,
      kind,
      name: profile.name,
      color: profile.color,
      health: maxHealth,
      maxHealth,
      state: "entering",
      attackTimer: 1.05,
      lastAttack: -1,
      attackRepeat: 0,
      attackMode: null,
      modeTimer: 0,
      meleeTargetX: 0,
      meleeConnected: false,
      meleeTrailTimer: 0,
      attackLabel: "",
      attackLabelTimer: 0,
      hitFlash: 0,
      defeatTimer: 0,
      velocityY: entryStyle === "drop" ? 70 : 0,
      rotation: 0,
    };
    this.bossBannerTime = 3.2;
    this.phaseNode.textContent = `${profile.name} ENCOUNTER`;
    this.updateHearts();
  }

  throwBatarang() {
    if (this.throwCooldown > 0 || this.phase !== "playing") return;
    if (this.batarangCharges <= 0) {
      this.batarangEmptyFlash = 0.45;
      this.throwCooldown = 0.12;
      return;
    }
    this.batarangCharges -= 1;
    if (this.batarangRechargeTimer <= 0) {
      this.batarangRechargeTimer = this.batarangRechargeInterval;
    }
    this.batarangs.push({
      x: this.player.x + 28,
      y: this.player.feet - 46 + this.player.duckAmount * 12,
      velocityX: 660,
      rotation: 0,
      life: 1.55,
    });
    this.throwCooldown = 0.36;
    this.throwAnimation = 0.18;
  }

  throwJokerBomb() {
    if (!this.joker || this.joker.state === "defeated") return;
    const variation = this.combatRandom();
    this.bombs.push({
      kind: "joker-bomb",
      x: this.joker.x - 23,
      y: this.joker.feet - 55,
      velocityX: -285 - variation * 85,
      velocityY: -315 - variation * 75,
      radius: 12,
      rotation: 0,
      landed: false,
      fuse: 1.75,
      exploded: false,
      explosionTime: 0,
      harmless: false,
      effectColor: "#ff9d4d",
    });
  }

  throwJokerGas() {
    if (!this.joker || this.joker.state === "defeated") return;
    const variation = this.combatRandom();
    this.bombs.push({
      kind: "joker-gas",
      x: this.joker.x - 24,
      y: this.joker.feet - 55,
      velocityX: -255 - variation * 65,
      velocityY: -275 - variation * 55,
      radius: 10,
      rotation: 0,
      landed: false,
      active: false,
      fuse: 0.46,
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
      telegraph: 0.45,
      active: false,
      life: 2.4,
      exploded: false,
      harmless: false,
      effectColor: "#ef7654",
    });
  }

  startBaneCharge() {
    this.startVillainMelee();
  }

  startVillainMelee() {
    if (!this.joker || this.joker.state === "defeated") return;
    const profile = VILLAIN_PROFILES[this.joker.kind];
    this.joker.attackMode = "melee-windup";
    this.joker.modeTimer = profile.meleeWindup;
    this.joker.meleeTargetX = this.clamp(
      this.player.x + profile.meleeReach,
      126,
      395,
    );
    this.joker.meleeConnected = false;
    this.joker.meleeTrailTimer = 0;
  }

  spawnRiddlerOrbs() {
    const firstHigh = this.combatRandom() > 0.5;
    [firstHigh, !firstHigh].forEach((high, index) => {
      this.bombs.push({
        kind: "riddler-orb",
        x: this.joker.x - 28,
        y: this.joker.feet - (high ? 72 : 25),
        yOffset: high ? 72 : 25,
        velocityX: -390,
        radius: 14,
        delay: index * 0.4,
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
    this.bombs.push({
      kind: "riddler-laser",
      x: 0,
      y: this.joker.feet - 21,
      yOffset: 21,
      width: Math.max(0, this.joker.x - 35),
      height: 11,
      telegraph: 0.62,
      active: false,
      activeTime: 0.52,
      life: 1.38,
      exploded: false,
      harmless: false,
      effectColor: "#65f58a",
    });
  }

  spawnPenguinMissiles() {
    const firstHigh = this.combatRandom() > 0.5;
    [firstHigh, !firstHigh].forEach((high, index) => {
      this.bombs.push({
        kind: "penguin-missile",
        x: this.joker.x - 24,
        y: this.joker.feet - 77,
        targetOffset: high ? 69 : 27,
        velocityX: -405,
        radius: 12,
        delay: 0.28 + index * 0.4,
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
      fuse: 2.7,
      rotation: 0,
      exploded: false,
      explosionTime: 0,
      harmless: false,
      effectColor: "#8fcfff",
    });
  }

  spawnIvyVine() {
    this.bombs.push({
      kind: "ivy-vine",
      x: this.joker.x - 44,
      y: this.joker.feet,
      width: 78,
      height: 30,
      telegraph: 0.56,
      active: false,
      life: 2.7,
      exploded: false,
      harmless: false,
      effectColor: "#65da70",
    });
  }

  spawnIvySpore() {
    const targetX = this.clamp(
      this.player.x + (this.combatRandom() - 0.5) * 150,
      125,
      380,
    );
    const surface = this.getSurface(targetX);
    this.bombs.push({
      kind: "ivy-spore",
      x: targetX,
      y: 68,
      targetY: (surface?.y ?? this.joker.feet) - 18,
      radius: 18,
      telegraph: 0.62,
      active: false,
      landed: false,
      velocityY: 0,
      cloudTime: 1.55,
      life: 3.2,
      rotation: 0,
      exploded: false,
      explosionTime: 0,
      harmless: false,
      effectColor: "#e76f9d",
    });
  }

  spawnTwoFaceBurst() {
    const low = this.combatRandom() > 0.5;
    for (let shot = 0; shot < 3; shot += 1) {
      this.bombs.push({
        kind: "twoface-bullet",
        x: this.joker.x - 30,
        y: this.joker.feet - (low ? 25 : 67),
        yOffset: low ? 25 : 67,
        velocityX: -585,
        radius: 7,
        delay: 0.18 + shot * 0.14,
        life: 2.5,
        rotation: shot * Math.PI,
        exploded: false,
        explosionTime: 0,
        harmless: false,
        effectColor: shot % 2 ? "#86c9ff" : "#ff9b55",
      });
    }
    return low;
  }

  throwTwoFaceCoin() {
    this.bombs.push({
      kind: "twoface-coin",
      x: this.joker.x - 25,
      y: this.joker.feet - 58,
      velocityX: -330,
      velocityY: -345,
      radius: 14,
      rotation: 0,
      landed: false,
      fuse: 2.1,
      life: 3.4,
      exploded: false,
      explosionTime: 0,
      harmless: false,
      effectColor: "#f0a74f",
    });
  }

  spawnScarecrowCrows() {
    const low = this.combatRandom() > 0.5;
    for (let crow = 0; crow < 5; crow += 1) {
      this.bombs.push({
        kind: "scarecrow-crow",
        x: this.joker.x - 35,
        y: this.joker.feet - (low ? 28 : 70),
        yOffset: low ? 28 : 70,
        velocityX: -420 - crow * 8,
        radius: 12,
        delay: 0.18 + crow * 0.09,
        life: 3,
        rotation: crow * 0.9,
        exploded: false,
        explosionTime: 0,
        harmless: false,
        effectColor: "#c99b55",
      });
    }
    return low;
  }

  throwScarecrowGas() {
    this.bombs.push({
      kind: "scarecrow-gas",
      x: this.joker.x - 28,
      y: this.joker.feet - 62,
      velocityX: -275,
      velocityY: -305,
      radius: 11,
      rotation: 0,
      landed: false,
      active: false,
      fuse: 0.48,
      life: 3.3,
      exploded: false,
      explosionTime: 0,
      harmless: false,
      effectColor: "#c7c85e",
    });
  }

  spawnFreezeRay() {
    this.bombs.push({
      kind: "freeze-ray",
      x: 0,
      y: this.joker.feet - 24,
      yOffset: 24,
      width: Math.max(0, this.joker.x - 40),
      height: 13,
      telegraph: 0.66,
      active: false,
      activeTime: 0.56,
      life: 1.7,
      exploded: false,
      harmless: false,
      effectColor: "#76d9ff",
    });
  }

  spawnFreezeSpikes() {
    const center = this.clamp(this.player.x + 28, 155, 335);
    [-42, 0, 42].forEach((offset, index) => {
      const x = center + offset;
      const surface = this.getSurface(x);
      this.bombs.push({
        kind: "freeze-spike",
        x,
        y: surface?.y ?? this.joker.feet,
        width: 32,
        height: 58,
        telegraph: 0.58 + index * 0.07,
        active: false,
        activeTime: 0.62,
        life: 1.75,
        exploded: false,
        harmless: false,
        effectColor: "#8ee9ff",
      });
    });
  }

  spawnJokerCards() {
    const low = this.combatRandom() > 0.5;
    for (let card = 0; card < 4; card += 1) {
      this.bombs.push({
        kind: "joker-card",
        x: this.joker.x - 30,
        y: this.joker.feet - (low ? 26 : 67),
        yOffset: low ? 26 : 67,
        velocityX: -520 - card * 9,
        radius: 9,
        delay: 0.12 + card * 0.11,
        life: 2.6,
        rotation: card * 0.7,
        exploded: false,
        explosionTime: 0,
        harmless: false,
        effectColor: card % 2 ? "#77ef7d" : "#bd6bea",
      });
    }
  }

  throwBaneBoulder() {
    this.bombs.push({
      kind: "bane-boulder",
      x: this.joker.x - 38,
      y: this.joker.feet - 82,
      velocityX: -360,
      velocityY: -390,
      radius: 20,
      rotation: 0,
      landed: false,
      fuse: 0.72,
      life: 3.2,
      exploded: false,
      explosionTime: 0,
      harmless: false,
      effectColor: "#ef7654",
    });
  }

  spawnBaneQuake() {
    for (let wave = 0; wave < 3; wave += 1) {
      this.bombs.push({
        kind: "bane-wave",
        x: this.joker.x - 45,
        y: this.joker.feet,
        width: 70 + wave * 5,
        height: 32,
        telegraph: 0.25 + wave * 0.2,
        active: false,
        life: 2.5,
        exploded: false,
        harmless: false,
        effectColor: "#ef7654",
      });
    }
  }

  spawnRiddlerMines() {
    const center = this.clamp(this.player.x + 20, 175, 320);
    [-68, 0, 68].forEach((offset, index) => {
      const x = center + offset;
      const surface = this.getSurface(x);
      this.bombs.push({
        kind: "riddler-mine",
        x,
        y: surface?.y ?? this.joker.feet,
        width: 36,
        height: 52,
        telegraph: 0.46 + index * 0.09,
        active: false,
        activeTime: 0.68,
        life: 1.55,
        exploded: false,
        harmless: false,
        effectColor: "#75ed86",
      });
    });
  }

  spawnPenguinDiscs() {
    const low = this.combatRandom() > 0.5;
    for (let disc = 0; disc < 3; disc += 1) {
      this.bombs.push({
        kind: "penguin-disc",
        x: this.joker.x - 30,
        y: this.joker.feet - (low ? 27 : 68),
        yOffset: low ? 27 : 68,
        velocityX: -475 - disc * 12,
        radius: 15,
        delay: 0.15 + disc * 0.19,
        life: 2.8,
        rotation: disc * Math.PI * 0.45,
        exploded: false,
        explosionTime: 0,
        harmless: false,
        effectColor: "#8fcfff",
      });
    }
  }

  spawnIvyThorns() {
    const low = this.combatRandom() > 0.5;
    for (let thorn = 0; thorn < 5; thorn += 1) {
      this.bombs.push({
        kind: "ivy-thorn",
        x: this.joker.x - 28,
        y: this.joker.feet - (low ? 26 : 67),
        yOffset: low ? 26 : 67,
        velocityX: -500 - thorn * 8,
        radius: 9,
        delay: 0.12 + thorn * 0.09,
        life: 2.7,
        rotation: thorn * 0.5,
        exploded: false,
        explosionTime: 0,
        harmless: false,
        effectColor: "#ed6c9e",
      });
    }
  }

  spawnTwoFaceRicochets() {
    for (let shot = 0; shot < 3; shot += 1) {
      this.bombs.push({
        kind: "twoface-ricochet",
        x: this.joker.x - 31,
        y: this.joker.feet - 46,
        velocityX: -455 - shot * 16,
        velocityY: shot % 2 ? 185 : -185,
        radius: 9,
        delay: 0.14 + shot * 0.18,
        life: 3,
        rotation: shot * Math.PI,
        exploded: false,
        explosionTime: 0,
        harmless: false,
        effectColor: shot % 2 ? "#82cbff" : "#ff9b55",
      });
    }
  }

  spawnScarecrowSickles() {
    const low = this.combatRandom() > 0.5;
    for (let sickle = 0; sickle < 3; sickle += 1) {
      this.bombs.push({
        kind: "scarecrow-sickle",
        x: this.joker.x - 34,
        y: this.joker.feet - (low ? 27 : 69),
        yOffset: low ? 27 : 69,
        velocityX: -455 - sickle * 12,
        radius: 18,
        delay: 0.15 + sickle * 0.2,
        life: 2.9,
        rotation: sickle * 0.8,
        exploded: false,
        explosionTime: 0,
        harmless: false,
        effectColor: "#d0a654",
      });
    }
  }

  spawnFreezeOrbs() {
    for (let orb = 0; orb < 2; orb += 1) {
      this.bombs.push({
        kind: "freeze-orb",
        x: this.joker.x - 36,
        y: this.joker.feet - 58,
        velocityX: -350 - orb * 25,
        radius: 17,
        delay: 0.14 + orb * 0.34,
        homingTime: 1.35,
        life: 3.1,
        rotation: orb * Math.PI,
        exploded: false,
        explosionTime: 0,
        harmless: false,
        effectColor: "#8ee9ff",
      });
    }
  }

  scheduleVillainAttack() {
    if (!this.joker) return;
    const profile = VILLAIN_PROFILES[this.joker.kind];
    const variation = this.combatRandom();
    const encounterPressure = Math.min(Math.max(0, this.jokerEncounters - 1) * 0.03, 0.25);
    const enragedPressure = this.joker.health <= this.joker.maxHealth * 0.5 ? 0.2 : 0;
    const pressure = encounterPressure + enragedPressure;
    const minimum = Math.max(0.82, profile.minDelay - pressure);
    const maximum = Math.max(minimum + 0.3, profile.maxDelay - pressure);
    this.joker.attackTimer = minimum + variation * (maximum - minimum);
  }

  performVillainAttack() {
    if (!this.joker || this.joker.state === "defeated") return;
    const attackCount = 4;
    let attack = Math.floor(this.combatRandom() * attackCount);
    if (attack === this.joker.lastAttack) {
      this.joker.attackRepeat += 1;
      if (this.joker.attackRepeat > 1) {
        const alternatives = Array.from({ length: attackCount }, (_, index) => index)
          .filter((index) => index !== attack);
        attack = alternatives[Math.floor(this.combatRandom() * alternatives.length)];
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
      } else if (attack === 1) {
        this.joker.attackLabel = "LAUGHING GAS";
        this.throwJokerGas();
      } else if (attack === 2) {
        this.joker.attackLabel = "RAZOR CARDS";
        this.spawnJokerCards();
      } else {
        this.joker.attackLabel = VILLAIN_PROFILES.joker.meleeLabel;
        this.startVillainMelee();
      }
    } else if (this.joker.kind === "bane") {
      if (attack === 0) {
        this.joker.attackLabel = "GROUND BREAKER";
        this.spawnBaneWave();
      } else if (attack === 1) {
        this.joker.attackLabel = "VENOM BOULDER";
        this.throwBaneBoulder();
      } else if (attack === 2) {
        this.joker.attackLabel = "QUAKE COMBO";
        this.spawnBaneQuake();
      } else {
        this.joker.attackLabel = VILLAIN_PROFILES.bane.meleeLabel;
        this.startBaneCharge();
      }
    } else if (this.joker.kind === "riddler") {
      if (attack === 0) {
        this.joker.attackLabel = "QUESTION VOLLEY";
        this.spawnRiddlerOrbs();
      } else if (attack === 1) {
        this.joker.attackLabel = "LOW BEAM";
        this.spawnRiddlerLaser();
      } else if (attack === 2) {
        this.joker.attackLabel = "QUESTION MINES";
        this.spawnRiddlerMines();
      } else {
        this.joker.attackLabel = VILLAIN_PROFILES.riddler.meleeLabel;
        this.startVillainMelee();
      }
    } else if (this.joker.kind === "penguin") {
      if (attack === 0) {
        this.joker.attackLabel = "UMBRELLA MISSILES";
        this.spawnPenguinMissiles();
      } else if (attack === 1) {
        this.joker.attackLabel = "PENGUIN BOT";
        this.spawnPenguinBot();
      } else if (attack === 2) {
        this.joker.attackLabel = "UMBRELLA BLADES";
        this.spawnPenguinDiscs();
      } else {
        this.joker.attackLabel = VILLAIN_PROFILES.penguin.meleeLabel;
        this.startVillainMelee();
      }
    } else if (this.joker.kind === "ivy") {
      if (attack === 0) {
        this.joker.attackLabel = "VINE SURGE";
        this.spawnIvyVine();
      } else if (attack === 1) {
        this.joker.attackLabel = "SPORE DROP";
        this.spawnIvySpore();
      } else if (attack === 2) {
        this.joker.attackLabel = "THORN VOLLEY";
        this.spawnIvyThorns();
      } else {
        this.joker.attackLabel = VILLAIN_PROFILES.ivy.meleeLabel;
        this.startVillainMelee();
      }
    } else if (this.joker.kind === "twoface") {
      if (attack === 0) {
        this.spawnTwoFaceBurst();
        this.joker.attackLabel = "DUAL BURST";
      } else if (attack === 1) {
        this.joker.attackLabel = "EXPLOSIVE COIN";
        this.throwTwoFaceCoin();
      } else if (attack === 2) {
        this.joker.attackLabel = "RICOCHET";
        this.spawnTwoFaceRicochets();
      } else {
        this.joker.attackLabel = VILLAIN_PROFILES.twoface.meleeLabel;
        this.startVillainMelee();
      }
    } else if (this.joker.kind === "scarecrow") {
      if (attack === 0) {
        this.spawnScarecrowCrows();
        this.joker.attackLabel = "CROW SWARM";
      } else if (attack === 1) {
        this.joker.attackLabel = "FEAR TOXIN";
        this.throwScarecrowGas();
      } else if (attack === 2) {
        this.joker.attackLabel = "SICKLE STORM";
        this.spawnScarecrowSickles();
      } else {
        this.joker.attackLabel = VILLAIN_PROFILES.scarecrow.meleeLabel;
        this.startVillainMelee();
      }
    } else if (attack === 0) {
      this.joker.attackLabel = "FREEZE RAY";
      this.spawnFreezeRay();
    } else if (attack === 1) {
      this.joker.attackLabel = "ICE SPIKES";
      this.spawnFreezeSpikes();
    } else if (attack === 2) {
      this.joker.attackLabel = "CRYO ORBS";
      this.spawnFreezeOrbs();
    } else {
      this.joker.attackLabel = VILLAIN_PROFILES.freeze.meleeLabel;
      this.startVillainMelee();
    }

    this.joker.attackLabelTimer = this.joker.attackMode === "melee-windup"
      ? VILLAIN_PROFILES[this.joker.kind].meleeWindup + 0.3
      : 0.68;
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
    this.updateHearts();
    this.bombs.forEach((bomb) => {
      bomb.harmless = true;
      this.explodeBomb(bomb, true);
    });
    this.scheduleNextBossEncounter(false);
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
        batarang.y >= this.joker.feet - 112 &&
        batarang.y <= this.joker.feet - 10
      ) {
        this.hitJoker();
        batarang.life = 0;
        return;
      }

      const bomb = this.bombs.find((item) => (
        !item.exploded &&
        [
          "joker-bomb",
          "joker-gas",
          "joker-card",
          "bane-boulder",
          "riddler-orb",
          "penguin-missile",
          "penguin-bot",
          "penguin-disc",
          "ivy-spore",
          "ivy-thorn",
          "twoface-bullet",
          "twoface-coin",
          "twoface-ricochet",
          "scarecrow-crow",
          "scarecrow-gas",
          "scarecrow-sickle",
          "freeze-orb",
        ].includes(item.kind) &&
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

      if (["joker-card", "penguin-disc", "ivy-thorn", "scarecrow-sickle"].includes(hazard.kind)) {
        const owners = {
          "joker-card": "joker",
          "penguin-disc": "penguin",
          "ivy-thorn": "ivy",
          "scarecrow-sickle": "scarecrow",
        };
        if (hazard.delay > 0) {
          hazard.delay -= delta;
          if (this.joker?.kind === owners[hazard.kind]) {
            hazard.x = this.joker.x - 30;
            hazard.y = this.joker.feet - hazard.yOffset;
          }
        } else {
          hazard.x += hazard.velocityX * delta;
          const surface = this.getSurface(hazard.x);
          if (surface) {
            const wobble = hazard.kind === "scarecrow-sickle" ? 5 : 2;
            hazard.y = surface.y - hazard.yOffset + Math.sin(this.elapsed * 12 + hazard.rotation) * wobble;
          }
          hazard.rotation += delta * (hazard.kind === "ivy-thorn" ? 8 : 16);
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

      if (hazard.kind === "riddler-mine") {
        const surface = this.getSurface(hazard.x);
        if (surface) hazard.y = surface.y;
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
        return;
      }

      if (hazard.kind === "ivy-vine") {
        if (!hazard.active) {
          hazard.telegraph -= delta;
          if (this.joker?.kind === "ivy") {
            hazard.x = this.joker.x - 44;
            hazard.y = this.joker.feet;
          }
          if (hazard.telegraph <= 0) hazard.active = true;
        } else {
          hazard.x -= (speed + 255) * delta;
          const surface = this.getSurface(hazard.x);
          if (surface) hazard.y = surface.y;
          hazard.life -= delta;
        }
        return;
      }

      if (hazard.kind === "ivy-spore") {
        hazard.rotation += delta * 4;
        if (!hazard.active) {
          hazard.telegraph -= delta;
          if (hazard.telegraph <= 0) hazard.active = true;
        } else if (!hazard.landed) {
          hazard.velocityY += 620 * delta;
          hazard.y += hazard.velocityY * delta;
          hazard.life -= delta;
          if (hazard.y >= hazard.targetY) {
            hazard.y = hazard.targetY;
            hazard.landed = true;
            hazard.velocityY = 0;
          }
        } else {
          hazard.cloudTime -= delta;
          hazard.life -= delta;
          if (hazard.cloudTime <= 0) this.explodeBomb(hazard, true);
        }
        return;
      }

      if (hazard.kind === "twoface-bullet") {
        if (hazard.delay > 0) {
          hazard.delay -= delta;
          if (this.joker?.kind === "twoface") {
            hazard.x = this.joker.x - 30;
            hazard.y = this.joker.feet - hazard.yOffset;
          }
        } else {
          hazard.x += hazard.velocityX * delta;
          const surface = this.getSurface(hazard.x);
          if (surface) {
            hazard.y = surface.y - hazard.yOffset + Math.sin(this.elapsed * 12 + hazard.rotation) * 2;
          }
          hazard.rotation += delta * 15;
          hazard.life -= delta;
        }
        return;
      }

      if (hazard.kind === "twoface-coin" || hazard.kind === "bane-boulder") {
        hazard.rotation += delta * (hazard.landed ? 12 : 18);
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
            hazard.velocityY = 0;
          }
        } else {
          const rollSpeed = hazard.kind === "bane-boulder" ? speed + 115 : speed + 70;
          hazard.x -= rollSpeed * delta;
          const surface = this.getSurface(hazard.x);
          if (surface) hazard.y = surface.y - hazard.radius;
          hazard.fuse -= delta;
          if (hazard.fuse <= 0) this.explodeBomb(hazard);
        }
        hazard.life -= delta;
        return;
      }

      if (hazard.kind === "twoface-ricochet") {
        if (hazard.delay > 0) {
          hazard.delay -= delta;
          if (this.joker?.kind === "twoface") {
            hazard.x = this.joker.x - 31;
            hazard.y = this.joker.feet - 46;
          }
        } else {
          hazard.x += hazard.velocityX * delta;
          hazard.y += hazard.velocityY * delta;
          const surface = this.getSurface(hazard.x);
          const lowerBound = (surface?.y ?? 410) - 21;
          const upperBound = (surface?.y ?? 410) - 83;
          if (hazard.y >= lowerBound) {
            hazard.y = lowerBound;
            hazard.velocityY = -Math.abs(hazard.velocityY);
          } else if (hazard.y <= upperBound) {
            hazard.y = upperBound;
            hazard.velocityY = Math.abs(hazard.velocityY);
          }
          hazard.rotation += delta * 20;
          hazard.life -= delta;
        }
        return;
      }

      if (hazard.kind === "scarecrow-crow") {
        if (hazard.delay > 0) {
          hazard.delay -= delta;
          if (this.joker?.kind === "scarecrow") {
            hazard.x = this.joker.x - 35;
            hazard.y = this.joker.feet - hazard.yOffset;
          }
        } else {
          hazard.x += hazard.velocityX * delta;
          const surface = this.getSurface(hazard.x);
          if (surface) {
            hazard.y = surface.y - hazard.yOffset + Math.sin(this.elapsed * 14 + hazard.rotation) * 7;
          }
          hazard.rotation += delta * 8;
          hazard.life -= delta;
        }
        return;
      }

      if (hazard.kind === "scarecrow-gas") {
        hazard.rotation += delta * (hazard.landed ? 3 : 10);
        if (!hazard.landed) {
          const previousY = hazard.y;
          hazard.x += hazard.velocityX * delta;
          hazard.velocityY += 880 * delta;
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
            hazard.velocityY = 0;
          }
        } else {
          hazard.x -= speed * delta;
          const surface = this.getSurface(hazard.x);
          if (surface) {
            const targetY = surface.y - (hazard.active ? 31 : hazard.radius);
            hazard.y += (targetY - hazard.y) * (1 - Math.exp(-18 * delta));
          }
          hazard.fuse -= delta;
          if (!hazard.active && hazard.fuse <= 0) hazard.active = true;
          if (hazard.active) {
            hazard.life -= delta;
            if (hazard.life <= 0) this.explodeBomb(hazard, true);
          }
        }
        return;
      }

      if (hazard.kind === "freeze-ray") {
        if (this.joker?.kind === "freeze") {
          hazard.width = Math.max(0, this.joker.x - 40);
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

      if (hazard.kind === "freeze-spike") {
        const surface = this.getSurface(hazard.x);
        if (surface) hazard.y = surface.y;
        if (!hazard.active) {
          hazard.telegraph -= delta;
          if (hazard.telegraph <= 0) hazard.active = true;
        } else {
          hazard.activeTime -= delta;
          if (hazard.activeTime <= 0) hazard.life = 0;
        }
        return;
      }

      if (hazard.kind === "freeze-orb") {
        if (hazard.delay > 0) {
          hazard.delay -= delta;
          if (this.joker?.kind === "freeze") {
            hazard.x = this.joker.x - 36;
            hazard.y = this.joker.feet - 58;
          }
        } else {
          hazard.x += hazard.velocityX * delta;
          if (hazard.homingTime > 0) {
            const targetY = this.player.feet - 42 + this.player.duckAmount * 15;
            hazard.y += (targetY - hazard.y) * (1 - Math.exp(-4.6 * delta));
            hazard.homingTime -= delta;
          }
          hazard.rotation += delta * 7;
          hazard.life -= delta;
        }
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
        this.releaseBossArena();
        this.phaseNode.textContent = "IN PURSUIT";
        this.updateHearts();
      }
      return;
    }

    const dropping = this.joker.state === "entering" && this.joker.entryStyle === "drop";
    const surface = this.getSurface(this.joker.x);
    if (surface && !dropping) {
      this.joker.feet += (surface.y - this.joker.feet) * (1 - Math.exp(-15 * delta));
    }

    if (this.joker.state === "entering") {
      if (this.joker.entryStyle === "drop") {
        this.joker.velocityY += 980 * delta;
        this.joker.feet += this.joker.velocityY * delta;
        if (this.joker.feet >= this.joker.landingFeet) {
          this.joker.feet = this.joker.landingFeet;
          this.joker.velocityY = 0;
          this.joker.state = "fighting";
          this.joker.attackTimer = 0.62 + this.combatRandom() * 0.26;
          this.spawnDust(this.joker.x, this.joker.feet - 2, 26, this.joker.color);
        }
      } else {
        this.joker.x += (this.joker.targetX - this.joker.x) * (1 - Math.exp(-2.7 * delta));
      }
      if (this.joker.entryStyle === "dash" && Math.abs(this.joker.x - this.joker.targetX) < 8) {
        this.joker.state = "fighting";
        this.joker.attackTimer = 0.62 + this.combatRandom() * 0.26;
      }
      return;
    }

    if (this.joker.attackMode === "melee-windup") {
      this.joker.modeTimer -= delta;
      this.joker.x = Math.max(this.joker.x - 82 * delta, this.joker.meleeTargetX + 120);
      if (this.joker.modeTimer <= 0) this.joker.attackMode = "melee-strike";
      return;
    }

    if (this.joker.attackMode === "melee-strike") {
      const meleeSpeed = VILLAIN_PROFILES[this.joker.kind].meleeSpeed;
      this.joker.x -= meleeSpeed * delta;
      this.joker.meleeTrailTimer -= delta;
      if (this.joker.meleeTrailTimer <= 0) {
        this.spawnDust(
          this.joker.x + 24,
          this.joker.feet - 7,
          this.joker.kind === "bane" ? 7 : 4,
          this.joker.color,
        );
        this.joker.meleeTrailTimer = 0.085;
      }
      if (this.joker.x <= this.joker.meleeTargetX) {
        this.joker.x = this.joker.meleeTargetX;
        this.joker.attackMode = "melee-recover";
        this.joker.modeTimer = 0.11;
      }
      return;
    }

    if (this.joker.attackMode === "melee-recover") {
      this.joker.modeTimer -= delta;
      if (this.joker.modeTimer <= 0) this.joker.attackMode = "melee-return";
      return;
    }

    if (this.joker.attackMode === "melee-return") {
      this.joker.x += (this.joker.targetX - this.joker.x) * (1 - Math.exp(-4.8 * delta));
      if (Math.abs(this.joker.x - this.joker.targetX) < 9) {
        this.joker.attackMode = null;
        this.joker.meleeConnected = false;
      }
      return;
    }

    const targetX = this.joker.targetX + Math.sin(this.elapsed * 0.9) * 38;
    this.joker.x += (targetX - this.joker.x) * (1 - Math.exp(-2.4 * delta));
    this.joker.attackTimer -= delta;
    if (this.joker.attackTimer <= 0) this.performVillainAttack();
  }

  updateCombat(delta, speed) {
    this.throwCooldown = Math.max(0, this.throwCooldown - delta);
    this.throwAnimation = Math.max(0, this.throwAnimation - delta);
    this.bossBannerTime = Math.max(0, this.bossBannerTime - delta);
    this.bossInvulnerability = Math.max(0, this.bossInvulnerability - delta);
    this.damageFlash = Math.max(0, this.damageFlash - delta);
    this.damageBannerTime = Math.max(0, this.damageBannerTime - delta);
    this.batarangEmptyFlash = Math.max(0, this.batarangEmptyFlash - delta);

    if (this.batarangCharges < this.maxBatarangCharges) {
      this.batarangRechargeTimer -= delta;
      if (this.batarangRechargeTimer <= 0) {
        this.batarangCharges += 1;
        this.batarangRechargeTimer = this.batarangCharges < this.maxBatarangCharges
          ? this.batarangRechargeInterval
          : 0;
      }
    }

    if (this.controls.throwQueued) {
      this.throwBatarang();
      this.controls.throwQueued = false;
    }

    if (
      !this.joker &&
      !this.tutorialEnabled &&
      this.player.grounded &&
      !this.player.onRamp &&
      this.elapsed >= this.nextBossTime
    ) {
      this.spawnVillain();
    }

    this.updateJoker(delta);
    this.updateBatarangs(delta);
    this.updateBombs(delta, speed);
  }

  hazardCollisionBox(hazard) {
    if (hazard.harmless || hazard.exploded) return null;

    if (
      [
        "joker-card",
        "riddler-orb",
        "penguin-missile",
        "penguin-disc",
        "ivy-thorn",
        "twoface-bullet",
        "twoface-ricochet",
        "scarecrow-crow",
        "scarecrow-sickle",
        "freeze-orb",
      ].includes(hazard.kind) &&
      hazard.delay > 0
    ) return null;

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

    if (hazard.kind === "riddler-mine") {
      return hazard.active && hazard.activeTime > 0
        ? {
          x: hazard.x - hazard.width / 2,
          y: hazard.y - hazard.height,
          width: hazard.width,
          height: hazard.height,
        }
        : null;
    }

    if (hazard.kind === "ivy-vine") {
      return hazard.active
        ? {
          x: hazard.x - hazard.width / 2,
          y: hazard.y - hazard.height,
          width: hazard.width,
          height: hazard.height,
        }
        : null;
    }

    if (hazard.kind === "ivy-spore") {
      if (!hazard.active) return null;
      return hazard.landed
        ? { x: hazard.x - 45, y: hazard.y - 46, width: 90, height: 56 }
        : {
          x: hazard.x - hazard.radius,
          y: hazard.y - hazard.radius,
          width: hazard.radius * 2,
          height: hazard.radius * 2,
        };
    }

    if (
      (hazard.kind === "twoface-bullet" || hazard.kind === "scarecrow-crow") &&
      hazard.delay > 0
    ) return null;

    if (hazard.kind === "scarecrow-gas" && hazard.active) {
      return { x: hazard.x - 44, y: hazard.y - 34, width: 88, height: 66 };
    }

    if (hazard.kind === "freeze-ray") {
      return hazard.active && hazard.activeTime > 0
        ? { x: hazard.x, y: hazard.y - hazard.height / 2, width: hazard.width, height: hazard.height }
        : null;
    }

    if (hazard.kind === "freeze-spike") {
      return hazard.active && hazard.activeTime > 0
        ? {
          x: hazard.x - hazard.width / 2,
          y: hazard.y - hazard.height,
          width: hazard.width,
          height: hazard.height,
        }
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

  meleeCollisionBox(villain) {
    const sizes = {
      joker: { width: 58, height: 86 },
      bane: { width: 82, height: 104 },
      riddler: { width: 62, height: 94 },
      penguin: { width: 68, height: 91 },
      ivy: { width: 64, height: 96 },
      twoface: { width: 64, height: 96 },
      scarecrow: { width: 70, height: 106 },
      freeze: { width: 86, height: 110 },
    };
    const size = sizes[villain.kind];
    return {
      x: villain.x - size.width / 2,
      y: villain.feet - size.height,
      width: size.width,
      height: size.height - 6,
    };
  }

  checkCombatCollisions(playerBox) {
    if (
      this.joker &&
      ["melee-strike", "melee-recover"].includes(this.joker.attackMode) &&
      !this.joker.meleeConnected
    ) {
      const meleeBox = this.meleeCollisionBox(this.joker);
      if (this.overlaps(playerBox, meleeBox)) {
        this.joker.meleeConnected = true;
        this.takeBossDamage();
        if (this.phase !== "playing") return;
      }
    }

    if (this.bossInvulnerability > 0) return;

    for (const bomb of this.bombs) {
      if (bomb.harmless) continue;
      if (bomb.exploded) {
        const playerCenterX = playerBox.x + playerBox.width / 2;
        const playerCenterY = playerBox.y + playerBox.height / 2;
        if (
          bomb.explosionTime > 0.1 &&
          Math.hypot(playerCenterX - bomb.x, playerCenterY - bomb.y) < 62
        ) {
          if (this.takeBossDamage()) bomb.harmless = true;
          return;
        }
        continue;
      }

      const bombBox = this.hazardCollisionBox(bomb);
      if (bombBox && this.overlaps(playerBox, bombBox)) {
        if (this.takeBossDamage()) {
          bomb.harmless = true;
          if (bomb.kind === "riddler-laser" || bomb.kind === "freeze-ray") {
            bomb.x = playerBox.x + playerBox.width / 2;
            bomb.width = 0;
          }
          this.explodeBomb(bomb, true);
        }
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

      if (hazard.kind === "ivy-vine") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.shadowColor = "#66e779";
        context.shadowBlur = hazard.active ? 12 : 5;
        if (!hazard.active) {
          const pulse = 30 + Math.sin(this.elapsed * 18) * 7;
          context.globalAlpha = 0.7;
          context.strokeStyle = "#8cff91";
          context.lineWidth = 3;
          context.beginPath();
          context.ellipse(0, -3, pulse, 8, 0, 0, Math.PI * 2);
          context.stroke();
        } else {
          context.strokeStyle = "#3fc85a";
          context.lineWidth = 7;
          context.lineCap = "round";
          context.beginPath();
          context.moveTo(-39, -5);
          context.bezierCurveTo(-21, -29, -5, 8, 13, -23);
          context.bezierCurveTo(24, -40, 30, -8, 39, -27);
          context.stroke();
          context.fillStyle = "#8be56d";
          [-28, -9, 10, 29].forEach((x, index) => {
            context.beginPath();
            context.ellipse(x, -14 - (index % 2) * 8, 9, 4, index % 2 ? -0.6 : 0.6, 0, Math.PI * 2);
            context.fill();
          });
          context.fillStyle = "#f26c9f";
          context.beginPath();
          context.arc(13, -25, 5, 0, Math.PI * 2);
          context.fill();
        }
        context.restore();
        return;
      }

      if (hazard.kind === "ivy-spore") {
        context.save();
        if (!hazard.active) {
          const groundY = hazard.targetY + hazard.radius;
          context.globalAlpha = 0.5 + Math.sin(this.elapsed * 16) * 0.2;
          context.strokeStyle = "#ff82b0";
          context.lineWidth = 3;
          context.setLineDash([7, 5]);
          context.beginPath();
          context.moveTo(hazard.x, hazard.y + 17);
          context.lineTo(hazard.x, groundY - 12);
          context.stroke();
          context.setLineDash([]);
          context.beginPath();
          context.ellipse(hazard.x, groundY, 38, 10, 0, 0, Math.PI * 2);
          context.stroke();
        } else if (hazard.landed) {
          context.translate(hazard.x, hazard.y);
          context.globalAlpha = 0.5;
          context.shadowColor = "#f070a2";
          context.shadowBlur = 15;
          for (let puff = 0; puff < 8; puff += 1) {
            const angle = puff * 1.41 + this.elapsed * 0.45;
            const px = Math.cos(angle) * (14 + (puff % 3) * 10);
            const py = Math.sin(angle) * 10 - 12 - (puff % 2) * 8;
            context.fillStyle = puff % 2 ? "#e75893" : "#9edb64";
            context.beginPath();
            context.arc(px, py, 14 + (puff % 3) * 3, 0, Math.PI * 2);
            context.fill();
          }
        } else {
          context.translate(hazard.x, hazard.y);
          context.rotate(hazard.rotation);
          context.shadowColor = "#ff7bac";
          context.shadowBlur = 13;
          context.fillStyle = "#e85e99";
          context.beginPath();
          context.ellipse(0, 0, 13, 18, 0, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = "#ceffd0";
          for (let dot = 0; dot < 5; dot += 1) {
            const angle = dot * Math.PI * 0.4;
            context.beginPath();
            context.arc(Math.cos(angle) * 7, Math.sin(angle) * 11, 2.5, 0, Math.PI * 2);
            context.fill();
          }
        }
        context.restore();
        return;
      }

      if (hazard.kind === "twoface-bullet") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.globalAlpha = hazard.delay > 0 ? 0.35 : 1;
        context.shadowColor = hazard.effectColor;
        context.shadowBlur = 12;
        context.strokeStyle = hazard.effectColor;
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(3, 0);
        context.lineTo(29, 0);
        context.stroke();
        context.fillStyle = hazard.effectColor;
        context.beginPath();
        context.moveTo(-9, -4);
        context.lineTo(6, -4);
        context.lineTo(10, 0);
        context.lineTo(6, 4);
        context.lineTo(-9, 4);
        context.closePath();
        context.fill();
        context.restore();
        return;
      }

      if (hazard.kind === "twoface-coin") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.rotate(hazard.rotation);
        context.shadowColor = "#ffc75f";
        context.shadowBlur = 11;
        context.fillStyle = "#f0a44e";
        context.beginPath();
        context.arc(0, 0, hazard.radius, Math.PI / 2, Math.PI * 1.5);
        context.closePath();
        context.fill();
        context.fillStyle = "#8ecdf4";
        context.beginPath();
        context.arc(0, 0, hazard.radius, -Math.PI / 2, Math.PI / 2);
        context.closePath();
        context.fill();
        context.strokeStyle = "#fff0b8";
        context.lineWidth = 2;
        context.beginPath();
        context.arc(0, 0, hazard.radius, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = "#172638";
        context.font = "700 12px 'Courier New', monospace";
        context.textAlign = "center";
        context.fillText("2", 0, 4);
        context.restore();
        return;
      }

      if (hazard.kind === "scarecrow-crow") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.globalAlpha = hazard.delay > 0 ? 0.3 : 1;
        const flap = Math.sin(this.elapsed * 25 + hazard.rotation) * 9;
        context.shadowColor = "#e0b65d";
        context.shadowBlur = 7;
        context.fillStyle = "#11151a";
        context.beginPath();
        context.moveTo(-1, 0);
        context.quadraticCurveTo(-15, -11 - flap, -25, -2);
        context.quadraticCurveTo(-11, -1, -3, 7);
        context.lineTo(3, 7);
        context.quadraticCurveTo(12, -2, 25, -2 - flap);
        context.quadraticCurveTo(15, -11, 1, 0);
        context.closePath();
        context.fill();
        context.fillStyle = "#efbd49";
        context.beginPath();
        context.moveTo(-3, 0);
        context.lineTo(-11, 4);
        context.lineTo(-3, 6);
        context.closePath();
        context.fill();
        context.restore();
        return;
      }

      if (hazard.kind === "scarecrow-gas") {
        context.save();
        context.translate(hazard.x, hazard.y);
        if (hazard.active) {
          context.globalAlpha = 0.42;
          context.shadowColor = "#d9d75f";
          context.shadowBlur = 18;
          for (let puff = 0; puff < 8; puff += 1) {
            const angle = puff * 1.27 + this.elapsed * 0.6;
            const x = Math.cos(angle) * (13 + (puff % 3) * 11);
            const y = Math.sin(angle) * 12 - (puff % 2) * 13;
            context.fillStyle = puff % 2 ? "#b7b94d" : "#ded269";
            context.beginPath();
            context.arc(x, y, 17 + (puff % 3) * 3, 0, Math.PI * 2);
            context.fill();
          }
          context.globalAlpha = 0.75;
          context.fillStyle = "#171a17";
          context.beginPath();
          context.arc(0, -7, 10, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = "#d9d75f";
          context.fillRect(-6, -10, 3, 3);
          context.fillRect(3, -10, 3, 3);
        } else {
          context.rotate(hazard.rotation);
          context.fillStyle = "#5f5d35";
          context.fillRect(-8, -13, 16, 26);
          context.strokeStyle = "#d9d75f";
          context.lineWidth = 2;
          context.strokeRect(-8, -13, 16, 26);
          context.fillStyle = "#23251d";
          context.fillRect(-4, -17, 8, 5);
          context.fillStyle = "#e6dc69";
          context.font = "700 12px 'Courier New', monospace";
          context.textAlign = "center";
          context.fillText("!", 0, 5);
        }
        context.restore();
        return;
      }

      if (hazard.kind === "freeze-ray") {
        context.save();
        const pulse = 0.42 + Math.sin(this.elapsed * 25) * 0.18;
        context.globalAlpha = hazard.active ? 0.96 : pulse;
        context.shadowColor = "#86eaff";
        context.shadowBlur = hazard.active ? 22 : 8;
        const beamHeight = hazard.active ? hazard.height : 2;
        context.fillStyle = hazard.active ? "#b9f4ff" : "#4aa9c9";
        context.fillRect(hazard.x, hazard.y - beamHeight / 2, hazard.width, beamHeight);
        if (hazard.active) {
          context.fillStyle = "rgba(92,207,244,.45)";
          context.fillRect(hazard.x, hazard.y - 12, hazard.width, 24);
        }
        context.restore();
        return;
      }

      if (hazard.kind === "freeze-spike") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.shadowColor = "#80e7ff";
        context.shadowBlur = hazard.active ? 16 : 5;
        if (!hazard.active) {
          context.globalAlpha = 0.48 + Math.sin(this.elapsed * 20) * 0.2;
          context.strokeStyle = "#9cecff";
          context.lineWidth = 3;
          context.beginPath();
          context.ellipse(0, -3, 22, 7, 0, 0, Math.PI * 2);
          context.stroke();
        } else {
          const gradient = context.createLinearGradient(0, -hazard.height, 0, 0);
          gradient.addColorStop(0, "#e9fdff");
          gradient.addColorStop(0.45, "#73daf5");
          gradient.addColorStop(1, "#276d90");
          context.fillStyle = gradient;
          context.beginPath();
          context.moveTo(-16, 0);
          context.lineTo(-7, -34);
          context.lineTo(0, -19);
          context.lineTo(8, -hazard.height);
          context.lineTo(16, 0);
          context.closePath();
          context.fill();
          context.strokeStyle = "#d9faff";
          context.lineWidth = 2;
          context.stroke();
        }
        context.restore();
        return;
      }

      if (hazard.kind === "joker-card") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.rotate(hazard.rotation);
        context.globalAlpha = hazard.delay > 0 ? 0.35 : 1;
        context.shadowColor = hazard.effectColor;
        context.shadowBlur = 9;
        context.fillStyle = "#ece9dd";
        context.fillRect(-12, -7, 24, 14);
        context.strokeStyle = hazard.effectColor;
        context.lineWidth = 2;
        context.strokeRect(-12, -7, 24, 14);
        context.fillStyle = hazard.effectColor;
        context.beginPath();
        context.moveTo(0, -5);
        context.lineTo(5, 0);
        context.lineTo(0, 5);
        context.lineTo(-5, 0);
        context.closePath();
        context.fill();
        context.restore();
        return;
      }

      if (hazard.kind === "bane-boulder") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.rotate(hazard.rotation);
        context.shadowColor = "#78f0a2";
        context.shadowBlur = 10;
        context.fillStyle = "#3d4a41";
        context.strokeStyle = "#77917b";
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(-18, -8);
        context.lineTo(-9, -20);
        context.lineTo(8, -18);
        context.lineTo(20, -5);
        context.lineTo(14, 16);
        context.lineTo(-7, 20);
        context.lineTo(-21, 7);
        context.closePath();
        context.fill();
        context.stroke();
        context.strokeStyle = "#70e698";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(-8, -13);
        context.lineTo(0, -3);
        context.lineTo(-5, 7);
        context.moveTo(0, -3);
        context.lineTo(11, 3);
        context.stroke();
        context.restore();
        return;
      }

      if (hazard.kind === "riddler-mine") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.shadowColor = "#6fff8d";
        context.shadowBlur = hazard.active ? 17 : 7;
        if (!hazard.active) {
          context.globalAlpha = 0.45 + Math.sin(this.elapsed * 22) * 0.2;
          context.strokeStyle = "#75ef8a";
          context.lineWidth = 3;
          context.beginPath();
          context.ellipse(0, -3, 22, 7, 0, 0, Math.PI * 2);
          context.stroke();
        } else {
          context.fillStyle = "rgba(75,232,111,.45)";
          context.beginPath();
          context.moveTo(-18, 0);
          context.lineTo(-10, -33);
          context.lineTo(0, -20);
          context.lineTo(10, -52);
          context.lineTo(18, 0);
          context.closePath();
          context.fill();
          context.strokeStyle = "#a3ff7b";
          context.lineWidth = 2;
          context.stroke();
          context.fillStyle = "#dfff77";
          context.beginPath();
          context.arc(0, -10, 4, 0, Math.PI * 2);
          context.fill();
        }
        context.restore();
        return;
      }

      if (hazard.kind === "penguin-disc") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.rotate(hazard.rotation);
        context.globalAlpha = hazard.delay > 0 ? 0.35 : 1;
        context.shadowColor = "#8fcfff";
        context.shadowBlur = 11;
        context.fillStyle = "#172537";
        context.strokeStyle = "#9bdcff";
        context.lineWidth = 2;
        for (let blade = 0; blade < 4; blade += 1) {
          context.rotate(Math.PI / 2);
          context.beginPath();
          context.moveTo(0, 0);
          context.quadraticCurveTo(8, -14, 18, -4);
          context.lineTo(7, 4);
          context.closePath();
          context.fill();
          context.stroke();
        }
        context.fillStyle = "#e4a84d";
        context.beginPath();
        context.arc(0, 0, 4, 0, Math.PI * 2);
        context.fill();
        context.restore();
        return;
      }

      if (hazard.kind === "ivy-thorn") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.rotate(hazard.rotation * 0.2);
        context.globalAlpha = hazard.delay > 0 ? 0.35 : 1;
        context.shadowColor = "#ef6e9f";
        context.shadowBlur = 10;
        context.fillStyle = "#e9699a";
        context.beginPath();
        context.moveTo(-14, -5);
        context.lineTo(15, 0);
        context.lineTo(-14, 5);
        context.lineTo(-7, 0);
        context.closePath();
        context.fill();
        context.fillStyle = "#71d66f";
        context.beginPath();
        context.ellipse(-9, -7, 8, 3, -0.5, 0, Math.PI * 2);
        context.fill();
        context.restore();
        return;
      }

      if (hazard.kind === "twoface-ricochet") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.rotate(hazard.rotation);
        context.globalAlpha = hazard.delay > 0 ? 0.35 : 1;
        context.shadowColor = hazard.effectColor;
        context.shadowBlur = 13;
        context.fillStyle = "#f0a44e";
        context.beginPath();
        context.arc(0, 0, 9, Math.PI / 2, Math.PI * 1.5);
        context.closePath();
        context.fill();
        context.fillStyle = "#82cbff";
        context.beginPath();
        context.arc(0, 0, 9, -Math.PI / 2, Math.PI / 2);
        context.closePath();
        context.fill();
        context.strokeStyle = "#fff2c2";
        context.lineWidth = 2;
        context.beginPath();
        context.arc(0, 0, 9, 0, Math.PI * 2);
        context.stroke();
        context.restore();
        return;
      }

      if (hazard.kind === "scarecrow-sickle") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.rotate(hazard.rotation);
        context.globalAlpha = hazard.delay > 0 ? 0.35 : 1;
        context.shadowColor = "#d0a654";
        context.shadowBlur = 9;
        context.strokeStyle = "#c9d1ce";
        context.lineWidth = 6;
        context.beginPath();
        context.arc(0, 0, 16, Math.PI * 0.25, Math.PI * 1.55);
        context.stroke();
        context.strokeStyle = "#795b32";
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(11, 11);
        context.lineTo(24, 24);
        context.stroke();
        context.restore();
        return;
      }

      if (hazard.kind === "freeze-orb") {
        context.save();
        context.translate(hazard.x, hazard.y);
        context.rotate(hazard.rotation);
        context.globalAlpha = hazard.delay > 0 ? 0.35 : 1;
        context.shadowColor = "#8ee9ff";
        context.shadowBlur = 18;
        const orb = context.createRadialGradient(0, 0, 2, 0, 0, 19);
        orb.addColorStop(0, "#f1feff");
        orb.addColorStop(0.45, "#8ee9ff");
        orb.addColorStop(1, "rgba(54,139,180,.28)");
        context.fillStyle = orb;
        context.beginPath();
        context.arc(0, 0, 19, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = "#ddfbff";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(-13, 0);
        context.lineTo(13, 0);
        context.moveTo(0, -13);
        context.lineTo(0, 13);
        context.moveTo(-9, -9);
        context.lineTo(9, 9);
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
    const charging = ["melee-strike", "melee-recover"].includes(bane.attackMode);

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
    context.shadowBlur = bane.attackMode?.startsWith("melee-") ? 13 : 6;
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
    const meleePose = riddler.attackMode?.startsWith("melee-");
    const meleeStrike = ["melee-strike", "melee-recover"].includes(riddler.attackMode);
    const casting = riddler.attackLabelTimer > 0 || meleePose;

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
    context.lineTo(-27 - (casting ? 12 : 0) - (meleeStrike ? 17 : 0), -38);
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
    if (meleePose) {
      context.moveTo(-29, -39);
      context.lineTo(-67 - (meleeStrike ? 16 : 0), -32);
      context.arc(-70 - (meleeStrike ? 16 : 0), -38, 7, 0.2, Math.PI * 1.55);
    } else {
      context.moveTo(29, -39);
      context.lineTo(34, -3);
      context.arc(29, -1, 7, 0, Math.PI * 1.45);
    }
    context.stroke();
    context.restore();
  }

  drawPenguin() {
    const context = this.context;
    const penguin = this.joker;
    const runCycle = Math.sin(this.elapsed * 12) * (penguin.state === "entering" ? 4 : 1.3);
    const meleePose = penguin.attackMode?.startsWith("melee-");
    const meleeStrike = ["melee-strike", "melee-recover"].includes(penguin.attackMode);
    const attacking = penguin.attackLabelTimer > 0 || meleePose;

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
    if (meleePose) {
      context.moveTo(-17, -48);
      context.lineTo(-63 - (meleeStrike ? 20 : 0), -40);
    } else {
      context.moveTo(22, -48);
      context.lineTo(34 + (attacking ? 11 : 0), -4);
    }
    context.stroke();
    context.fillStyle = "#263b53";
    context.beginPath();
    if (meleePose) {
      const umbrellaX = -58 - (meleeStrike ? 20 : 0);
      context.arc(umbrellaX, -40, 20, Math.PI, 0);
      context.lineTo(umbrellaX, -36);
    } else {
      context.arc(22, -49, 21, Math.PI, 0);
      context.lineTo(22, -45);
    }
    context.closePath();
    context.fill();
    context.strokeStyle = "#9bdcff";
    context.stroke();
    context.restore();
  }

  drawPoisonIvy() {
    const context = this.context;
    const ivy = this.joker;
    const runCycle = Math.sin(this.elapsed * 13) * (ivy.state === "entering" ? 5 : 1.5);
    const meleePose = ivy.attackMode?.startsWith("melee-");
    const meleeStrike = ["melee-strike", "melee-recover"].includes(ivy.attackMode);
    const casting = ivy.attackLabelTimer > 0 || meleePose;

    context.save();
    context.translate(ivy.x, ivy.feet);
    if (ivy.state === "defeated") context.rotate(ivy.rotation);
    else if (meleeStrike) context.rotate(-0.08);
    if (ivy.hitFlash > 0) {
      context.globalAlpha = 0.72 + Math.sin(this.elapsed * 80) * 0.2;
      context.shadowColor = "white";
      context.shadowBlur = 18;
    }
    context.fillStyle = "rgba(0,0,0,.28)";
    context.beginPath();
    context.ellipse(0, 2, 28, 7, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#245a38";
    context.lineWidth = 9;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-7, -18);
    context.lineTo(-11 - runCycle, -2);
    context.moveTo(7, -18);
    context.lineTo(11 + runCycle, -2);
    context.stroke();

    context.fillStyle = ivy.hitFlash > 0 ? "#effff1" : "#348c4c";
    context.beginPath();
    context.moveTo(-20, -59);
    context.quadraticCurveTo(0, -70, 20, -59);
    context.lineTo(16, -19);
    context.lineTo(7, -11);
    context.lineTo(0, -23);
    context.lineTo(-8, -11);
    context.lineTo(-18, -20);
    context.closePath();
    context.fill();
    context.fillStyle = "#87d75f";
    [-12, 0, 12].forEach((x, index) => {
      context.beginPath();
      context.ellipse(x, -41 + (index % 2) * 8, 8, 4, x * 0.04, 0, Math.PI * 2);
      context.fill();
    });

    context.strokeStyle = ivy.hitFlash > 0 ? "#effff1" : "#56ad63";
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(-15, -54);
    context.lineTo(-28 - (meleeStrike ? 17 : 0), -37);
    context.moveTo(15, -54);
    context.lineTo(29 + (casting ? 8 : 0), -39);
    context.stroke();
    if (meleePose) {
      const reach = meleeStrike ? 28 : 5;
      context.strokeStyle = "#5eea75";
      context.shadowColor = "#5eea75";
      context.shadowBlur = 10;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(-31 - reach, -40);
      context.bezierCurveTo(-54 - reach, -64, -77 - reach, -25, -95 - reach, -48);
      context.stroke();
      context.fillStyle = "#ff76a5";
      context.beginPath();
      context.arc(-95 - reach, -48, 5, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    }

    context.fillStyle = "#e4b091";
    context.beginPath();
    context.arc(0, -72, 15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#a9363c";
    context.beginPath();
    context.moveTo(-16, -75);
    context.quadraticCurveTo(-17, -95, -6, -93);
    context.lineTo(0, -101);
    context.lineTo(6, -92);
    context.quadraticCurveTo(18, -93, 17, -69);
    context.lineTo(10, -77);
    context.quadraticCurveTo(0, -88, -10, -77);
    context.lineTo(-15, -62);
    context.closePath();
    context.fill();
    context.fillStyle = "#153321";
    context.fillRect(-9, -74, 5, 3);
    context.fillRect(4, -74, 5, 3);
    context.restore();
  }

  drawTwoFace() {
    const context = this.context;
    const twoface = this.joker;
    const runCycle = Math.sin(this.elapsed * 12) * (twoface.state === "entering" ? 5 : 1.6);
    const meleePose = twoface.attackMode?.startsWith("melee-");
    const meleeStrike = ["melee-strike", "melee-recover"].includes(twoface.attackMode);
    const attacking = twoface.attackLabelTimer > 0 || meleePose;

    context.save();
    context.translate(twoface.x, twoface.feet);
    if (twoface.state === "defeated") context.rotate(twoface.rotation);
    else if (meleeStrike) context.rotate(-0.09);
    if (twoface.hitFlash > 0) {
      context.globalAlpha = 0.72 + Math.sin(this.elapsed * 80) * 0.2;
      context.shadowColor = "white";
      context.shadowBlur = 18;
    }
    context.fillStyle = "rgba(0,0,0,.3)";
    context.beginPath();
    context.ellipse(0, 2, 29, 7, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#202531";
    context.lineWidth = 9;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-7, -18);
    context.lineTo(-11 - runCycle, -2);
    context.moveTo(7, -18);
    context.lineTo(11 + runCycle, -2);
    context.stroke();

    context.fillStyle = twoface.hitFlash > 0 ? "#f5fdff" : "#d78b43";
    context.beginPath();
    context.moveTo(-21, -61);
    context.lineTo(0, -64);
    context.lineTo(0, -17);
    context.lineTo(-21, -17);
    context.closePath();
    context.fill();
    context.fillStyle = twoface.hitFlash > 0 ? "#f5fdff" : "#25364b";
    context.beginPath();
    context.moveTo(0, -64);
    context.lineTo(21, -61);
    context.lineTo(21, -17);
    context.lineTo(0, -17);
    context.closePath();
    context.fill();
    context.fillStyle = "#e7e2cf";
    context.beginPath();
    context.moveTo(-7, -59);
    context.lineTo(0, -49);
    context.lineTo(7, -59);
    context.lineTo(4, -22);
    context.lineTo(-4, -22);
    context.closePath();
    context.fill();
    context.fillStyle = "#d3a339";
    context.fillRect(-2, -50, 4, 24);

    context.strokeStyle = twoface.hitFlash > 0 ? "#f5fdff" : "#b9753c";
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(-16, -54);
    context.lineTo(-29 - (meleeStrike ? 16 : 0), -38);
    context.moveTo(16, -54);
    context.lineTo(30 + (attacking ? 11 : 0), -38);
    context.stroke();
    if (attacking && !meleePose) {
      context.fillStyle = "#172332";
      context.fillRect(29, -43, 23, 8);
      context.fillRect(32, -35, 8, 8);
      context.fillStyle = "#ffbd61";
      context.fillRect(51, -41, 6, 4);
    } else if (meleePose) {
      const reach = meleeStrike ? 23 : 4;
      context.shadowColor = "#ffc25d";
      context.shadowBlur = 10;
      context.strokeStyle = "#f3b64f";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(-37 - reach, -40, 11, 0, Math.PI * 2);
      context.stroke();
      context.shadowBlur = 0;
    }

    context.fillStyle = "#e0b49b";
    context.beginPath();
    context.arc(0, -74, 15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#965a58";
    context.beginPath();
    context.arc(3, -74, 13, -Math.PI / 2, Math.PI / 2);
    context.lineTo(3, -87);
    context.closePath();
    context.fill();
    context.strokeStyle = "#4d2430";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(4, -84);
    context.lineTo(12, -77);
    context.moveTo(4, -72);
    context.lineTo(12, -65);
    context.stroke();
    context.fillStyle = "#25242a";
    context.beginPath();
    context.moveTo(-15, -78);
    context.quadraticCurveTo(-8, -94, 3, -88);
    context.lineTo(1, -82);
    context.closePath();
    context.fill();
    context.fillStyle = "#17202a";
    context.fillRect(-9, -75, 5, 3);
    context.fillStyle = "#d9f4ff";
    context.fillRect(5, -75, 5, 3);
    context.restore();
  }

  drawScarecrow() {
    const context = this.context;
    const scarecrow = this.joker;
    const runCycle = Math.sin(this.elapsed * 11) * (scarecrow.state === "entering" ? 5 : 1.4);
    const meleePose = scarecrow.attackMode?.startsWith("melee-");
    const meleeStrike = ["melee-strike", "melee-recover"].includes(scarecrow.attackMode);
    const casting = scarecrow.attackLabelTimer > 0;

    context.save();
    context.translate(scarecrow.x, scarecrow.feet);
    if (scarecrow.state === "defeated") context.rotate(scarecrow.rotation);
    else if (meleeStrike) context.rotate(-0.12);
    if (scarecrow.hitFlash > 0) {
      context.globalAlpha = 0.72 + Math.sin(this.elapsed * 80) * 0.2;
      context.shadowColor = "white";
      context.shadowBlur = 18;
    }
    context.fillStyle = "rgba(0,0,0,.3)";
    context.beginPath();
    context.ellipse(0, 2, 30, 7, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#433621";
    context.lineWidth = 8;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-7, -20);
    context.lineTo(-12 - runCycle, -2);
    context.moveTo(7, -20);
    context.lineTo(12 + runCycle, -2);
    context.stroke();
    context.strokeStyle = "#d1ac52";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-14 - runCycle, -8);
    context.lineTo(-23 - runCycle, -1);
    context.moveTo(14 + runCycle, -8);
    context.lineTo(23 + runCycle, -1);
    context.stroke();

    context.fillStyle = scarecrow.hitFlash > 0 ? "#ffffe9" : "#5c4829";
    context.beginPath();
    context.moveTo(-22, -65);
    context.lineTo(20, -65);
    context.lineTo(27, -16);
    context.lineTo(12, -23);
    context.lineTo(3, -11);
    context.lineTo(-8, -24);
    context.lineTo(-25, -16);
    context.closePath();
    context.fill();
    context.strokeStyle = "#92723a";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-15, -51);
    context.lineTo(14, -39);
    context.moveTo(-9, -30);
    context.lineTo(17, -53);
    context.stroke();

    context.strokeStyle = scarecrow.hitFlash > 0 ? "#ffffe9" : "#69512e";
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(-17, -57);
    context.lineTo(-33 - (meleeStrike ? 18 : 0), -38);
    context.moveTo(16, -57);
    context.lineTo(32 + (casting ? 7 : 0), -40);
    context.stroke();

    const scytheReach = meleePose ? (meleeStrike ? 34 : 12) : 0;
    context.strokeStyle = "#9a7b48";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(-32 - scytheReach, -38);
    context.lineTo(-63 - scytheReach, -91);
    context.stroke();
    context.strokeStyle = "#bfc6c4";
    context.shadowColor = "#d4e9e4";
    context.shadowBlur = meleePose ? 9 : 3;
    context.lineWidth = 5;
    context.beginPath();
    context.arc(-78 - scytheReach, -88, 20, Math.PI * 1.12, Math.PI * 1.92);
    context.stroke();
    context.shadowBlur = 0;

    context.fillStyle = "#a48550";
    context.beginPath();
    context.moveTo(-15, -79);
    context.quadraticCurveTo(0, -94, 15, -79);
    context.lineTo(12, -61);
    context.lineTo(-12, -61);
    context.closePath();
    context.fill();
    context.strokeStyle = "#40311f";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-10, -74);
    context.lineTo(-3, -69);
    context.moveTo(10, -74);
    context.lineTo(3, -69);
    context.moveTo(-7, -62);
    context.lineTo(7, -62);
    context.stroke();
    context.fillStyle = "#e4df64";
    context.fillRect(-9, -73, 5, 3);
    context.fillRect(4, -73, 5, 3);
    context.fillStyle = "#342919";
    context.beginPath();
    context.moveTo(-29, -84);
    context.lineTo(29, -84);
    context.lineTo(15, -94);
    context.lineTo(8, -110);
    context.lineTo(-12, -106);
    context.lineTo(-18, -92);
    context.closePath();
    context.fill();
    context.restore();
  }

  drawFreeze() {
    const context = this.context;
    const freeze = this.joker;
    const runCycle = Math.sin(this.elapsed * 10) * (freeze.state === "entering" ? 4 : 1.2);
    const meleePose = freeze.attackMode?.startsWith("melee-");
    const meleeStrike = ["melee-strike", "melee-recover"].includes(freeze.attackMode);
    const firing = freeze.attackLabelTimer > 0 || meleePose;

    context.save();
    context.translate(freeze.x, freeze.feet);
    if (freeze.state === "defeated") context.rotate(freeze.rotation);
    else if (meleeStrike) context.rotate(-0.08);
    if (freeze.hitFlash > 0) {
      context.globalAlpha = 0.72 + Math.sin(this.elapsed * 80) * 0.2;
      context.shadowColor = "white";
      context.shadowBlur = 18;
    }
    context.fillStyle = "rgba(0,0,0,.34)";
    context.beginPath();
    context.ellipse(0, 2, 38, 8, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#243d52";
    context.lineWidth = 13;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-13, -24);
    context.lineTo(-18 - runCycle, -2);
    context.moveTo(13, -24);
    context.lineTo(18 + runCycle, -2);
    context.stroke();
    context.fillStyle = "#75dff7";
    context.fillRect(-25 - runCycle, -8, 17, 8);
    context.fillRect(8 + runCycle, -8, 17, 8);

    context.fillStyle = freeze.hitFlash > 0 ? "#edfdff" : "#284a63";
    context.beginPath();
    context.moveTo(-30, -75);
    context.lineTo(30, -75);
    context.lineTo(27, -20);
    context.lineTo(-27, -20);
    context.closePath();
    context.fill();
    context.strokeStyle = "#66d5f0";
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = "#79def4";
    context.fillRect(-18, -61, 36, 9);
    context.fillStyle = "#182a3b";
    context.fillRect(-20, -44, 40, 8);
    context.fillStyle = Math.sin(this.elapsed * 8) > 0 ? "#d7fbff" : "#6dd9f1";
    context.fillRect(-6, -42, 12, 4);

    context.strokeStyle = freeze.hitFlash > 0 ? "#edfdff" : "#315a74";
    context.lineWidth = 13;
    context.beginPath();
    context.moveTo(-25, -65);
    context.lineTo(-42 - (meleeStrike ? 18 : 0), -41);
    context.moveTo(25, -65);
    context.lineTo(42 + (firing ? 11 : 0), -41);
    context.stroke();
    if (meleePose) {
      const reach = meleeStrike ? 25 : 4;
      context.strokeStyle = "#8de8fb";
      context.shadowColor = "#8de8fb";
      context.shadowBlur = 12;
      context.lineWidth = 6;
      context.beginPath();
      context.moveTo(-45 - reach, -42);
      context.lineTo(-72 - reach, -55);
      context.stroke();
      context.fillStyle = "#bff6ff";
      context.fillRect(-91 - reach, -68, 25, 25);
      context.strokeStyle = "#4cb7d4";
      context.strokeRect(-91 - reach, -68, 25, 25);
      context.shadowBlur = 0;
    } else {
      context.fillStyle = "#203a4e";
      context.fillRect(40, -48, 28, 14);
      context.fillStyle = "#9bedff";
      context.fillRect(64, -45, 13, 8);
    }

    context.fillStyle = "rgba(158,234,250,.26)";
    context.strokeStyle = "#9defff";
    context.lineWidth = 3;
    context.shadowColor = "#76d9ff";
    context.shadowBlur = 10;
    context.beginPath();
    context.arc(0, -88, 24, Math.PI, 0);
    context.lineTo(24, -75);
    context.lineTo(-24, -75);
    context.closePath();
    context.fill();
    context.stroke();
    context.shadowBlur = 0;
    context.fillStyle = "#b5c4c7";
    context.beginPath();
    context.arc(0, -86, 14, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#5fa9bb";
    context.fillRect(-9, -89, 18, 6);
    context.fillStyle = "#dffbff";
    context.fillRect(-8, -87, 5, 3);
    context.fillRect(4, -87, 5, 3);
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
    if (this.joker.kind === "ivy") {
      this.drawPoisonIvy();
      return;
    }
    if (this.joker.kind === "twoface") {
      this.drawTwoFace();
      return;
    }
    if (this.joker.kind === "scarecrow") {
      this.drawScarecrow();
      return;
    }
    if (this.joker.kind === "freeze") {
      this.drawFreeze();
      return;
    }
    const context = this.context;
    const joker = this.joker;
    const runCycle = Math.sin(this.elapsed * 12) * (joker.state === "entering" ? 5 : 2);
    const meleePose = joker.attackMode?.startsWith("melee-");
    const meleeStrike = ["melee-strike", "melee-recover"].includes(joker.attackMode);
    const attackPose = joker.state !== "defeated" && (joker.attackLabelTimer > 0 || meleePose) ? 1 : 0;

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
    context.lineTo(-31 - attackPose * 9 - (meleeStrike ? 18 : 0), -34 - attackPose * 8);
    context.moveTo(15, -51);
    context.lineTo(27, -37);
    context.stroke();

    if (meleePose) {
      const crowbarReach = meleeStrike ? 22 : 0;
      context.strokeStyle = "#a7b3b9";
      context.shadowColor = "#d8f4f2";
      context.shadowBlur = 5;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(-38 - crowbarReach, -43);
      context.lineTo(-76 - crowbarReach, -31);
      context.quadraticCurveTo(-84 - crowbarReach, -29, -82 - crowbarReach, -20);
      context.stroke();
      context.shadowBlur = 0;
    }

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
    const enraged = healthRatio <= 0.5 && joker.state !== "defeated";

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

    const chargeColor = this.batarangEmptyFlash > 0 ? "#ff5870" : "#73ead8";
    context.fillStyle = chargeColor;
    context.font = "700 8px 'Courier New', monospace";
    context.textAlign = "left";
    context.fillText(this.batarangCharges === 0 ? "WAIT" : "BATS", 344, 131);
    for (let charge = 0; charge < this.maxBatarangCharges; charge += 1) {
      const x = 374 + charge * 13;
      context.strokeStyle = chargeColor;
      context.lineWidth = 1;
      context.strokeRect(x + 0.5, 122.5, 8, 8);
      if (charge < this.batarangCharges) {
        context.fillStyle = chargeColor;
        context.fillRect(x + 2, 124, 5, 5);
      } else if (charge === this.batarangCharges && this.batarangRechargeTimer > 0) {
        const recharge = 1 - this.clamp(
          this.batarangRechargeTimer / this.batarangRechargeInterval,
          0,
          1,
        );
        context.fillStyle = "rgba(115,234,216,.62)";
        context.fillRect(x + 2, 129 - recharge * 5, 5, recharge * 5);
      }
    }

    if (enraged && joker.state !== "defeated") {
      context.globalAlpha = 0.62 + Math.sin(this.elapsed * 7) * 0.2;
      context.fillStyle = "#ff667d";
      context.font = "700 9px 'Courier New', monospace";
      context.textAlign = "right";
      context.fillText("// ENRAGED", 616, 129);
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

  drawDamageFeedback() {
    if (this.damageBannerTime <= 0 || this.playerHearts <= 0) return;
    const context = this.context;
    context.save();
    context.globalAlpha = this.clamp(this.damageBannerTime / 0.2, 0, 1);
    context.fillStyle = "rgba(24, 5, 16, .86)";
    context.strokeStyle = "#ff5870";
    context.lineWidth = 1;
    context.fillRect(340, 187, 280, 36);
    context.strokeRect(340.5, 187.5, 279, 35);
    context.fillStyle = "#ffe9ed";
    context.font = "700 12px 'Courier New', monospace";
    context.textAlign = "center";
    context.fillText(
      `BOSS HIT  •  ${this.playerHearts} ${this.playerHearts === 1 ? "HEART" : "HEARTS"} LEFT`,
      480,
      210,
    );
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
    if (
      this.phase === "playing" &&
      this.bossInvulnerability > 0 &&
      Math.sin(this.elapsed * 42) > -0.1
    ) context.globalAlpha = 0.38;
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
    this.drawDamageFeedback();
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
