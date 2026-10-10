/* =====================================================================
   script.js  -  ONE file used by ALL pages of the site.

   HOW TO FIND THINGS (search for the section number, e.g. "[3]"):

     [1] SETTINGS ............. the secret key
     [2] SHARED HELPERS ....... sound blips, typewriter text, music, text colors
     [3] PAGE: index.html ..... "hello" screen + key input
     [4] PAGE: room2.html ..... RGB color puzzle
     [5] PAGE: room3.html ..... room full of eyes, find the key
     [6] PAGE: room4.html ..... image that reveals itself as circles
     [7] STARTUP .............. decides which page's code to run

   Every page loads this same file, but only the code for the page you
   are on actually runs (see [7]).
   ===================================================================== */


/* =====================================================================
   [1] SETTINGS
   ===================================================================== */

// The key you type on index.html to skip straight to final.html
const secretKey = "MIS{VERY_SECRET_KEY}";


/* =====================================================================
   [2] SHARED HELPERS  (used by several pages)
   ===================================================================== */

/* ---- 2a. Sound blip (the tiny beep while text is typed) ---- */

let blipContext = null;


function getBlipContext() {
  if (!blipContext) {
    blipContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (blipContext.state === "suspended") {
    blipContext.resume();
  }
  return blipContext;
}

["click", "touchstart", "keydown"].forEach((eventType) => {
  document.addEventListener(eventType, getBlipContext);
});

// Plays one very short, quiet beep
function playBlip() {
  try {
    const ctx = getBlipContext();
    if (ctx.state !== "running") return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.03, ctx.currentTime);                              // volume
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.03);
  } catch (error) {
    /* audio may be blocked by autoplay policy */
  }
}

/* ---- 2b. Typewriter effect ---- */

// Types `text` into the element matching `selector`, one letter at a time,
// with a blip per letter. Example: typeMessage("#waitMessage", "hi")
function typeMessage(selector, text) {
  const element = document.querySelector(selector);
  if (!element) return;
  let index = 0;
  function next() {
    if (index >= text.length) return;
    element.textContent += text[index++];
    playBlip();
    window.setTimeout(next, 55); // 55 ms between letters
  }
  next();
}

/* ---- 2c. Background music (index, room2, room3, room4) ---- */

function setupBackgroundMusic() {
  const music = new Audio("music/fire-water.mp3");
  music.loop = true;
  music.volume = 0.3;
  music.play().catch(() => { });
  // If the browser blocked autoplay, start the music on the first interaction
  ["click", "touchstart", "keydown"].forEach((type) => {
    document.addEventListener(type, () => music.play().catch(() => { }), { once: true });
  });
}

/* ---- 2d. Text colors that contrast with the background (room2) ---- */

// Takes the background color (R, G, B) and sets the page's text colors
// to the opposite hue on the color wheel, so text stays readable.
// It works by changing the CSS variables --ink and --accent.
function oppositeText(red, green, blue) {
  const values = [red / 255, green / 255, blue / 255];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  if (max !== min) {
    const difference = max - min;
    saturation = lightness > 0.5 ? difference / (2 - max - min) : difference / (max + min);
    if (max === values[0]) hue = ((values[1] - values[2]) / difference) % 6;
    if (max === values[1]) hue = (values[2] - values[0]) / difference + 2;
    if (max === values[2]) hue = (values[0] - values[1]) / difference + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const opposite = (hue + 180) % 360;
  const saturationValue = saturation ? 70 : 0;
  document.documentElement.style.setProperty("--ink", `hsl(${opposite} ${saturationValue}% 82%)`);
  document.documentElement.style.setProperty("--accent", `hsl(${opposite} ${saturationValue}% 62%)`);
}


/* =====================================================================
   [3] PAGE: index.html  -  "hello" screen + key input
   ===================================================================== */

function initEntry() {
  const hello = document.querySelector("#hello");
  const actions = document.querySelector(".entry-actions");
  const welcomeMessage = "hello, you will receive the key when you finish the puzzle";

  // --- Types the welcome message with a sound for each letter ---
  let index = 0;
  function typeHello() {
    if (index >= welcomeMessage.length) {
      actions.classList.add("is-ready");
      return;
    }
    hello.textContent += welcomeMessage[index++];
    playBlip();
    window.setTimeout(typeHello, 55);
  }

  // --- "click ->" button: goes to room 2 ---
  // (this could be a plain <a href="room2.html"> in the HTML instead)
  document.querySelector("#enterButton").addEventListener("click", (event) => {
    event.stopPropagation();
    window.location.href = "room2.html";
  });

  // --- Key form: if the key is correct, skip to the final page ---
  document.querySelector("#keyForm").addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const isCorrect = document.querySelector("#keyInput").value.trim().toUpperCase() === secretKey;
    document.querySelector("#keyMessage").textContent = isCorrect ? "accepted." : "...";

    if (isCorrect) {
      window.setTimeout(() => {
        window.location.href = "final.html";
      }, 500);
    }
  });

  typeHello();
}


/* =====================================================================
   [4] PAGE: room2.html  -  RGB color puzzle

   Goal: the player must find the color rgb(139, 7, 7).
   - Each slider locks when it hits its target number.
   - When all 3 sliders are locked AND the same numbers are typed in the
     R / G / B boxes, the "->" button to room 3 appears.
   ===================================================================== */

function initRoom2() {
  // ---- The answer (change these to change the puzzle) ----
  const target = { red: 139, green: 7, blue: 7 };

  // Current slider values. They start random, but never on the answer.
  const values = {
    red: randomValue(target.red),
    green: randomValue(target.green),
    blue: randomValue(target.blue),
  };
  // Which sliders have already hit their target (and are now frozen)
  const locked = { red: false, green: false, blue: false };

  const preview = document.querySelector("#colorPreview");

  // Random number 0-255 that is not `excluded`
  function randomValue(excluded) {
    let value = Math.floor(Math.random() * 256);
    while (value === excluded) value = Math.floor(Math.random() * 256);
    return value;
  }

  // Shows the "->" button only if: all sliders locked + typed RGB is correct
  function updateDoor() {
    const entered = ["rgbRed", "rgbGreen", "rgbBlue"].map((id) => Number(document.querySelector(`#${id}`).value));
    const complete = Object.values(locked).every(Boolean);
    const correct = entered[0] === target.red && entered[1] === target.green && entered[2] === target.blue;
    document.querySelector("#nextRoomButton").classList.toggle("is-hidden", !(complete && correct));
  }

  // Paints the page background with a color and updates the color picker + text colors
  function applyColor(red, green, blue) {
    const rgb = `rgb(${red}, ${green}, ${blue})`;
    document.body.style.backgroundColor = rgb;
    preview.value = `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    oppositeText(red, green, blue);
  }

  // ---- Sliders: update the number next to them, lock when correct ----
  ["red", "green", "blue"].forEach((color) => {
    const input = document.querySelector(`#${color}Range`);
    input.value = values[color];
    input.addEventListener("input", (event) => {
      if (locked[color]) return;
      values[color] = Number(event.target.value);
      document.querySelector(`#${color}Value`).textContent = String(values[color]).padStart(3, "0");
      if (values[color] === target[color]) {
        locked[color] = true;
        input.disabled = true;
        input.closest(".slider-row").classList.add("is-locked");
        updateDoor();
      }
    });
  });

  // ---- R / G / B number boxes: change the background as you type ----
  ["rgbRed", "rgbGreen", "rgbBlue"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", () => {
    const raw = ["rgbRed", "rgbGreen", "rgbBlue"].map((name) => document.querySelector(`#${name}`).value);
    if (raw.some((value) => value === "")) return; // wait until all 3 are filled
    const rgb = raw.map((value) => Math.max(0, Math.min(255, Number(value)))); // clamp to 0-255
    applyColor(rgb[0], rgb[1], rgb[2]);
  }));

  // ---- Color picker square: also changes the background + fills the R/G/B boxes ----
  preview.addEventListener("input", (event) => {
    const hex = event.target.value.slice(1);
    const rgb = [0, 2, 4].map((start) => parseInt(hex.slice(start, start + 2), 16));
    ["rgbRed", "rgbGreen", "rgbBlue"].forEach((id, index) => { document.querySelector(`#${id}`).value = rgb[index]; });
    applyColor(rgb[0], rgb[1], rgb[2]);
  });

  // ---- Submitting the R/G/B form checks if the door should open ----
  document.querySelector("#rgbForm").addEventListener("submit", (event) => { event.preventDefault(); updateDoor(); });

  // ---- The "->" button (only visible when solved) goes to room 3 ----
  document.querySelector("#nextRoomButton").addEventListener("click", () => { window.location.href = "room3.html"; });

  // ---- Hint text appears after 1.5 seconds ----
  window.setTimeout(() => typeMessage("#waitMessage", "play with the values."), 1500);

  // Start with a black background
  applyColor(0, 0, 0);
}


/* =====================================================================
   [5] PAGE: room3.html  -  room full of eyes, find the key

   - Lots of eyes are drawn on a canvas, all following the mouse.
   - One big eye in the upper right hides a key. It becomes visible
     once the mouse goes to the right of that eye.
   - Clicking the key goes to room 4.
   ===================================================================== */

function initRoom3() {
  const canvas = document.querySelector("#eyeCanvas");
  const context = canvas.getContext("2d");

  // `mouse` is the smoothed position the eyes look at,
  // `targetMouse` is the real mouse position.
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const targetMouse = { x: mouse.x, y: mouse.y };

  let eyes = [];          // all eyes on screen
  let keyEye = null;      // the eye that hides the key
  let keyRevealed = false;

  // Seeded random generator: gives the SAME "random" eye layout every time
  let seed = 48329;
  function random() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  // ---- One eye ----
  class Eye {
    constructor(x, y, size) {
      this.x = x;
      this.y = y;
      this.size = size;
      this.angle = (random() - .5) * (Math.PI / 2.5);      // tilt of the eye
      this.top = size * (.9 + random() * .3);              // how curved the upper lid is
      this.bottom = size * (.6 + random() * .3);           // how curved the lower lid is
      this.iris = size * (.25 + random() * .15);
      this.pupil = this.iris * (.3 + random() * .2);
      this.irisColor = ["#6b1933", "#520b1e", "#801026", "#4a0818"][Math.floor(random() * 4)];
      this.irisX = 0;                                      // iris offset (follows mouse)
      this.irisY = 0;
      this.blink = 0;                                      // 0 = open, 1 = closed
      this.nextBlink = performance.now() + 5000 + random() * 10000;
    }

    // Handles blinking
    update(now) {
      if (now > this.nextBlink) this.blink = Math.min(1, this.blink + .15);
      if (this.blink === 1) {
        this.blink = 0;
        this.nextBlink = now + 5000 + random() * 10000;
      }
    }

    // Draws the eye
    draw(now) {
      context.save();
      context.translate(this.x, this.y);
      context.rotate(this.angle);

      // Eye shape (two curves = upper and lower lid), shrinks when blinking
      const top = this.top * (1 - this.blink);
      const bottom = this.bottom * (1 - this.blink);
      context.beginPath();
      context.moveTo(-this.size, 0);
      context.quadraticCurveTo(0, -top, this.size, 0);
      context.quadraticCurveTo(0, bottom, -this.size, 0);
      context.closePath();
      context.fillStyle = "#c2b3a9"; // white of the eye
      context.fill();
      context.clip();                // everything below is drawn only inside the eye

      // Draw the key if this is the key eye and it has been revealed
      if (this === keyEye && keyRevealed) drawKey(this);

      // Move the iris toward the mouse (smoothly)
      const angle = Math.atan2(mouse.y - this.y, mouse.x - this.x) - this.angle;
      const distance = Math.min(Math.hypot(mouse.x - this.x, mouse.y - this.y) * .15, this.size - this.iris - 4);
      this.irisX += (Math.cos(angle) * distance - this.irisX) * .12;
      this.irisY += (Math.sin(angle) * distance - this.irisY) * .12;

      // Iris + pupil (the pupil pulses a little)
      context.save();
      context.translate(this.irisX, this.irisY);
      const gradient = context.createRadialGradient(0, 0, this.iris * .3, 0, 0, this.iris);
      gradient.addColorStop(0, this.irisColor);
      gradient.addColorStop(.7, this.irisColor);
      gradient.addColorStop(1, "#000");
      context.beginPath();
      context.arc(0, 0, this.iris, 0, Math.PI * 2);
      context.fillStyle = gradient;
      context.fill();
      context.beginPath();
      context.arc(0, 0, this.pupil * (1 + Math.sin(now * .004) * .15), 0, Math.PI * 2);
      context.fillStyle = "#000";
      context.fill();
      context.restore();

      context.restore();
    }
  }

  // ---- Draws the little key inside an eye ----
  function drawKey(eye) {
    const keyX = -eye.size * .5;
    const keyY = eye.size * .22;
    context.save();
    context.translate(keyX, keyY);
    context.strokeStyle = "#050505";
    context.lineWidth = Math.max(2, eye.size * .035);
    context.beginPath();
    context.arc(0, 0, eye.size * .1, 0, Math.PI * 2);   // round head of the key
    context.moveTo(eye.size * .1, 0);
    context.lineTo(eye.size * .28, 0);                  // shaft
    context.lineTo(eye.size * .28, eye.size * .09);     // tooth
    context.stroke();
    context.restore();
  }

  // ---- Places eyes randomly without overlapping, and picks the key eye ----
  function generateEyes() {
    seed = 48329;
    eyes = [];
    const min = Math.min(innerWidth, innerHeight) * .05;   // smallest eye
    const max = Math.min(innerWidth, innerHeight) * .16;   // biggest eye
    let attempts = 0;
    while (attempts++ < 2500 && eyes.length < Math.max(8, innerWidth * innerHeight / 35000)) {
      const size = min + Math.pow(random(), 3) * (max - min);
      const x = random() * innerWidth;
      const y = random() * innerHeight;
      // only add the eye if it doesn't overlap any existing eye
      if (eyes.every((eye) => Math.hypot(x - eye.x, y - eye.y) >= (size + eye.size) * 1.15)) {
        eyes.push(new Eye(x, y, size));
      }
    }
    // Key eye = the biggest eye in the upper-right area (or the first eye as a fallback)
    const upperRight = eyes.filter((eye) => eye.x > innerWidth * .6 && eye.y < innerHeight * .4 && eye.size > min * 1.4);
    keyEye = upperRight.sort((a, b) => b.size - a.size)[0] || eyes[0];
  }

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    generateEyes();
  }

  // ---- Runs every frame: clears screen, moves mouse smoothly, draws eyes ----
  function animate(now) {
    context.fillStyle = "#030303";
    context.fillRect(0, 0, canvas.width, canvas.height);
    mouse.x += (targetMouse.x - mouse.x) * .08;
    mouse.y += (targetMouse.y - mouse.y) * .08;

    // Key gets revealed once the mouse is to the right of the key eye
    if (keyEye && targetMouse.x > keyEye.x) keyRevealed = true;

    eyes.forEach((eye) => { eye.update(now); eye.draw(now); });
    requestAnimationFrame(animate);
  }

  // Where the key is on the actual screen (accounting for the eye's tilt)
  function keyPoint() {
    const localX = -keyEye.size * .5;
    const localY = keyEye.size * .22;
    return {
      x: keyEye.x + localX * Math.cos(keyEye.angle) - localY * Math.sin(keyEye.angle),
      y: keyEye.y + localX * Math.sin(keyEye.angle) + localY * Math.cos(keyEye.angle),
    };
  }

  function keyVisible() {
    return keyEye && keyRevealed;
  }

  // ---- Events ----
  window.addEventListener("mousemove", (event) => { targetMouse.x = event.clientX; targetMouse.y = event.clientY; });
  window.addEventListener("resize", resize);

  // Clicking on the key goes to room 4
  canvas.addEventListener("click", (event) => {
    const point = keyPoint();
    if (keyVisible() && Math.hypot(event.clientX - point.x, event.clientY - point.y) < keyEye.size * .22) {
      window.location.href = "room4.html";
    }
  });

  // ---- Start ----
  resize();
  requestAnimationFrame(animate);
  window.setTimeout(() => typeMessage("#eyeHint", "find the key"), 300);
}


/* =====================================================================
   [6] PAGE: room4.html  -  image revealed as circles

   Starts as ONE big circle (the average color of the image). Hovering
   over a circle splits it into 4 smaller ones, each with its own average
   color, until the full image appears. After 30 seconds everything
   splits by itself. When fully split, the "the ending" button appears.

   Pure visual effect - nothing to do with the puzzle logic.
   ===================================================================== */

function initFinalRoom() {
  const canvas = document.querySelector("#revealCanvas");
  const context = canvas.getContext("2d");
  const sample = document.createElement("canvas");   // hidden canvas used to read image pixels
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  const image = new Image();
  const pointer = { x: 0, y: 0, active: false, lastMoved: 0, prevX: 0, prevY: 0 };

  const size = 256;            // image is shrunk to 256x256 to read its colors
  const minimumRadius = 0.25;  // circles stop splitting below this size
  const autoSplitRadius = 4;   // small circles split by themselves
  let root;                    // position/size of the whole picture on screen
  let nodes = [];              // every circle currently on screen
  let sums;                    // precomputed color sums (to average colors fast)
  let lastSplit = 0;
  let started = false;
  let complete = false;
  let globalAutoSplit = false;
  const roomStarted = performance.now();

  // ---- 6a. Reading colors from the image ----

  function at(x, y) { return y * (size + 1) + x; }

  // Average color of a square area of the image
  function averageColor(x, y, length) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(size, Math.ceil(x + length));
    const y1 = Math.min(size, Math.ceil(y + length));
    const area = Math.max(1, (x1 - x0) * (y1 - y0));
    const channel = (values) => (values[at(x1, y1)] - values[at(x0, y1)] - values[at(x1, y0)] + values[at(x0, y0)]) / area;
    return `rgb(${channel(sums.red) | 0}, ${channel(sums.green) | 0}, ${channel(sums.blue) | 0})`;
  }

  // Creates one circle
  function makeNode(x, y, length) {
    return { x, y, length, color: averageColor(x, y, length), progress: 0.1, createdAt: performance.now() };
  }

  // Reads all pixels of the image and builds the color sums
  function buildSums() {
    sample.width = size;
    sample.height = size;
    let pixels;
    try {
      sampleContext.clearRect(0, 0, size, size);
      sampleContext.drawImage(image, 0, 0, size, size);
      pixels = sampleContext.getImageData(0, 0, size, size).data;
    } catch (error) {
      // Reading pixels can be blocked (e.g. opening the file directly).
      // Fallback: use the image embedded in images/final_image_data.js,
      // or a plain dark red square if that doesn't work either.
      const embedded = typeof FINAL_IMAGE_DATA !== "undefined" ? FINAL_IMAGE_DATA : null;
      if (embedded && image.src !== embedded) {
        image.src = embedded;
        return;
      }
      const fallbackCanvas = document.createElement("canvas");
      fallbackCanvas.width = size;
      fallbackCanvas.height = size;
      const fallbackCtx = fallbackCanvas.getContext("2d");
      fallbackCtx.fillStyle = "#6b1933";
      fallbackCtx.fillRect(0, 0, size, size);
      pixels = fallbackCtx.getImageData(0, 0, size, size).data;
    }
    const red = new Float64Array((size + 1) ** 2);
    const green = new Float64Array(red.length);
    const blue = new Float64Array(red.length);
    for (let y = 1; y <= size; y += 1) {
      let rowRed = 0;
      let rowGreen = 0;
      let rowBlue = 0;
      for (let x = 1; x <= size; x += 1) {
        const pixel = ((y - 1) * size + x - 1) * 4;
        rowRed += pixels[pixel];
        rowGreen += pixels[pixel + 1];
        rowBlue += pixels[pixel + 2];
        red[at(x, y)] = red[at(x, y - 1)] + rowRed;
        green[at(x, y)] = green[at(x, y - 1)] + rowGreen;
        blue[at(x, y)] = blue[at(x, y - 1)] + rowBlue;
      }
    }
    sums = { red, green, blue };
  }

  // ---- 6b. Circles: creating and splitting ----

  // Start with a single big circle, centered on screen
  function setup() {
    const length = Math.min(innerWidth, innerHeight) * 0.82;
    root = { x: (innerWidth - length) / 2, y: (innerHeight - length) / 2, length };
    nodes = [makeNode(0, 0, size)];
  }

  // Replaces one circle with 4 smaller ones (top-left, top-right, bottom-left, bottom-right)
  function split(node) {
    if (node.length / 4 <= minimumRadius) return false;
    const half = node.length / 2;
    const index = nodes.indexOf(node);
    if (index < 0) return false;
    nodes.splice(index, 1,
      makeNode(node.x, node.y, half),
      makeNode(node.x + half, node.y, half),
      makeNode(node.x, node.y + half, half),
      makeNode(node.x + half, node.y + half, half));
    return true;
  }

  // How big a circle is compared to its cell (smaller circles overlap slightly
  // so the final image has no gaps)
  function getRadiusFactor(nodeLength) {
    if (nodeLength >= size) return 0.50;
    if (nodeLength >= 128) return 0.43;
    if (nodeLength >= 64) return 0.45;
    if (nodeLength >= 32) return 0.47;
    if (nodeLength >= 16) return 0.485;
    if (nodeLength >= 8) return 0.50;
    return 0.515;
  }

  // Splits the circle under the mouse (called every frame)
  function splitUnderPointer(now) {
    if (!pointer.active) return;
    // Don't keep splitting when the mouse is not moving
    if (now - pointer.lastMoved > 250) return;

    // Big circles split slowly, small ones quickly
    const minInterval = nodes.some((n) => n.length >= 128) ? 80 : (nodes.some((n) => n.length >= 64) ? 50 : 25);
    if (now - lastSplit < minInterval) return;

    // Mouse position converted to image coordinates
    const x = (pointer.x - root.x) / root.length * size;
    const y = (pointer.y - root.y) / root.length * size;
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index];
      // Skip circles that are still growing in
      if (node.progress < 0.85) continue;

      const centerX = node.x + node.length / 2;
      const centerY = node.y + node.length / 2;
      const factor = getRadiusFactor(node.length);
      const hitRadius = node.length * factor;
      if (Math.hypot(x - centerX, y - centerY) <= hitRadius) {
        lastSplit = now;
        if (!split(node)) return;
        return;
      }
    }
  }

  // Automatically splits small circles (and everything after 30 s),
  // and shows the "the ending" button when nothing can split anymore
  function splitSmallNodes(now) {
    if (complete) return;
    const center = size / 2;
    const candidates = nodes.filter((node) => {
      const radius = node.length / size * root.length / 2;
      return globalAutoSplit || (radius <= autoSplitRadius && now - node.createdAt >= 500);
    });
    // Split the ones closest to the center first
    candidates.sort((first, second) => {
      const firstDistance = Math.hypot(first.x + first.length / 2 - center, first.y + first.length / 2 - center);
      const secondDistance = Math.hypot(second.x + second.length / 2 - center, second.y + second.length / 2 - center);
      return firstDistance - secondDistance;
    });
    let splitCount = 0;
    for (const node of candidates) {
      if (splitCount >= 16) break; // max 16 per frame
      if (split(node)) {
        splitCount += 1;
      }
    }
    if (nodes.length && nodes.every((node) => node.length / 4 <= minimumRadius)) {
      complete = true;
      document.querySelector("#backButton").classList.remove("is-hidden");
    }
  }

  // ---- 6c. Drawing (runs every frame) ----

  function draw(now) {
    context.fillStyle = "#121212";
    context.fillRect(0, 0, canvas.width, canvas.height);
    nodes.forEach((node) => {
      node.progress = Math.min(1, node.progress + 0.16); // grow-in animation
      const factor = getRadiusFactor(node.length);
      const ease = 1 - Math.pow(1 - node.progress, 3);
      const radius = (node.length * factor * ease) / size * root.length;
      context.beginPath();
      context.arc(
        root.x + (node.x + node.length / 2) / size * root.length,
        root.y + (node.y + node.length / 2) / size * root.length,
        radius,
        0,
        Math.PI * 2
      );
      context.fillStyle = node.color;
      context.fill();
    });
    // After 30 seconds in the room, everything starts splitting by itself
    if (!globalAutoSplit && now - roomStarted >= 30000) globalAutoSplit = true;
    splitSmallNodes(now);
    if (!complete) splitUnderPointer(now);
    requestAnimationFrame(draw);
  }

  // ---- 6d. Loading the image and starting ----

  // Called when the image has loaded
  function ready() {
    if (!image.complete || image.naturalWidth === 0) return;
    buildSums();
    if (started) {
      nodes.forEach((node) => { node.color = averageColor(node.x, node.y, node.length); });
      return;
    }
    started = true;
    setup();
    resize();
    draw(performance.now());
  }

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const length = Math.min(innerWidth, innerHeight) * 0.82;
    if (!root) {
      if (sums) setup();
    } else {
      root.x = (innerWidth - length) / 2;
      root.y = (innerHeight - length) / 2;
      root.length = length;
    }
  }

  // Remembers where the mouse/finger is
  function move(x, y) {
    pointer.prevX = pointer.x;
    pointer.prevY = pointer.y;
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    pointer.lastMoved = performance.now();
  }

  // Image source: images/final_image.JPEG, or the copy embedded in
  // images/final_image_data.js when the page is opened as a local file
  const embedded = typeof FINAL_IMAGE_DATA !== "undefined" ? FINAL_IMAGE_DATA : null;
  const isFileProtocol = window.location.protocol === "file:";

  image.onload = ready;
  image.onerror = () => {
    if (embedded && image.src !== embedded) {
      image.src = embedded;
    } else if (!started) {
      buildSums();
      started = true;
      setup();
      resize();
      draw(performance.now());
    }
  };

  image.src = (isFileProtocol && embedded) ? embedded : "images/final_image.JPEG";

  if (image.complete && image.naturalWidth > 0) {
    ready();
  }

  // ---- 6e. Events ----

  // Clicking/tapping a circle splits it right away
  canvas.addEventListener("pointerdown", (event) => {
    move(event.clientX, event.clientY);
    const x = (pointer.x - root.x) / root.length * size;
    const y = (pointer.y - root.y) / root.length * size;
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index];
      const centerX = node.x + node.length / 2;
      const centerY = node.y + node.length / 2;
      const factor = getRadiusFactor(node.length);
      if (Math.hypot(x - centerX, y - centerY) <= node.length * factor) {
        lastSplit = performance.now();
        split(node);
        break;
      }
    }
  });

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (event) => move(event.clientX, event.clientY));
  window.addEventListener("touchmove", (event) => { if (event.touches.length) move(event.touches[0].clientX, event.touches[0].clientY); }, { passive: true });

  // "the ending" button goes back to the start
  // (this could be a plain <a href="index.html"> in the HTML instead)
  document.querySelector("#backButton").addEventListener("click", () => { window.location.href = "index.html"; });

  window.setTimeout(() => typeMessage("#revealInstruction", "hover to reveal"), 800);
}


/* =====================================================================
   [7] STARTUP  -  runs the right code for the current page

   Each page has one element that exists only on that page, so we check
   for it and run that page's function.
   ===================================================================== */

if (document.querySelector("#hello")) initEntry();           // index.html
if (document.querySelector("#redRange")) initRoom2();        // room2.html
if (document.querySelector("#eyeCanvas")) initRoom3();       // room3.html
if (document.querySelector("#revealCanvas")) initFinalRoom(); // room4.html

// Background music plays on all four of those pages (not on final.html)
if (document.querySelector("#hello") || document.querySelector("#redRange") || document.querySelector("#eyeCanvas") || document.querySelector("#revealCanvas")) setupBackgroundMusic();

function initRandomGlitch() {
  function triggerGlitch() {
    document.body.classList.add("is-glitching");
    
  
    setTimeout(() => {
      document.body.classList.remove("is-glitching");
    }, 90);

    const nextTime = Math.random() * 5000 + 3000;
    setTimeout(triggerGlitch, nextTime);
  }

  setTimeout(triggerGlitch, 2500);
}


if (
  document.querySelector("#hello") || 
  document.querySelector("#redRange") || 
  document.querySelector("#eyeCanvas")
) {
  initRandomGlitch();
}