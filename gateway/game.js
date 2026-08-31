const gate = document.querySelector("#gate");
const runner = document.querySelector("#runner");
const form = document.querySelector("#gateForm");
const code = document.querySelector("#code");
const enter = document.querySelector("#enter");
const message = document.querySelector("#message");

let game = null;
const TUTORIAL_STORAGE_KEY = "niyant-rooftop-tutorial-v2-complete";

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

      if (["arrowup", "w", " "].includes(key)) {
        if (!event.repeat) this.controls.jumpQueued = true;
        this.controls.jumpHeld = true;
      }
      if (["arrowdown", "s"].includes(key)) this.controls.down = true;
      if (["arrowleft", "a"].includes(key)) this.controls.left = true;
      if (["arrowright", "d"].includes(key)) this.controls.right = true;
    }, { passive: false });

    window.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "w", " "].includes(key)) this.controls.jumpHeld = false;
      if (["arrowdown", "s"].includes(key)) this.controls.down = false;
      if (["arrowleft", "a"].includes(key)) this.controls.left = false;
      if (["arrowright", "d"].includes(key)) this.controls.right = false;
    });

    window.addEventListener("blur", () => {
      this.controls.left = false;
      this.controls.right = false;
      this.controls.down = false;
      this.controls.jumpHeld = false;
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
        } else {
          this.controls[controlName] = true;
        }
      });

      ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
        button.addEventListener(eventName, () => {
          if (controlName === "jump") this.controls.jumpHeld = false;
          else this.controls[controlName] = false;
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

    this.controls.left = false;
    this.controls.right = false;
    this.controls.down = false;
    this.controls.jumpQueued = false;
    this.controls.jumpHeld = false;

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
        keys: ["W", "↑", "SPACE"],
        detail: "Jump over the construction barrier",
      },
      {
        title: "DUCK",
        keys: ["S", "↓"],
        detail: "Hold the key to slide under the light beam",
      },
      {
        title: "RAMP JUMP",
        keys: ["W", "↑", "SPACE"],
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
    context.lineTo(25 + runCycle * 4, -37);
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

    if (this.phase === "intro") this.drawIntro();
    else {
      this.drawBatman(
        this.player.x,
        this.player.feet,
        this.player.duckAmount,
        this.player.grounded,
      );
    }

    this.drawParticles();

    const bottomShade = context.createLinearGradient(0, 440, 0, 540);
    bottomShade.addColorStop(0, "rgba(1, 5, 12, 0)");
    bottomShade.addColorStop(1, "rgba(1, 5, 12, .72)");
    context.fillStyle = bottomShade;
    context.fillRect(0, 440, 960, 100);
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
