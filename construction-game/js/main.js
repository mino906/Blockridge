// ============================================================
// main.js — Game Entry Point
// ============================================================

// Wait for the full page to load before touching the DOM or canvas.
// This prevents "cannot read properties of null" errors that happen
// when scripts run before the HTML elements exist.
window.addEventListener("DOMContentLoaded", () => {
  try {
    _startGame();
  } catch (err) {
    // Show errors visibly on screen so you don't have to hunt in the console
    document.body.innerHTML = `
      <div style="
        position:fixed; inset:0; background:#1a0a00; color:#ff6b35;
        display:flex; flex-direction:column; align-items:center;
        justify-content:center; font-family:monospace; padding:40px;
        font-size:14px; line-height:1.8; text-align:center;
      ">
        <div style="font-size:2rem; margin-bottom:20px;">⚠️ BuildRight — Startup Error</div>
        <div style="
          background:#2a1000; border:1px solid #ff6b35;
          border-radius:8px; padding:20px 30px; max-width:700px;
          text-align:left; word-break:break-word;
        ">${err.message}<br/><br/>${err.stack || ''}</div>
        <div style="margin-top:20px; color:#aaa;">
          Open the browser Console (F12) for more details.
        </div>
      </div>`;
    console.error("[main.js] Fatal startup error:", err);
  }
});

function _startGame() {
  const canvas = document.getElementById("renderCanvas");

  if (!canvas) throw new Error("Could not find #renderCanvas in the HTML.");
  if (typeof BABYLON === "undefined") throw new Error("Babylon.js failed to load from CDN. Check your internet connection.");
  if (typeof SimplexNoise === "undefined") throw new Error("SimplexNoise failed to load from CDN. Check your internet connection.");

  // --- Engine ---
  const engine = new BABYLON.Engine(canvas, true /* antialias */);

  // --- Scene ---
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.53, 0.81, 0.98, 1.0); // Sky blue

  // Fog — hides the world edge and adds depth
  scene.fogMode  = BABYLON.Scene.FOGMODE_LINEAR;
  scene.fogStart = 28;
  scene.fogEnd   = 48;
  scene.fogColor = new BABYLON.Color3(0.53, 0.81, 0.98);

  // --- Lighting ---
  const ambientLight = new BABYLON.HemisphericLight(
    "ambientLight",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  ambientLight.intensity = 0.85;

  const sunLight = new BABYLON.DirectionalLight(
    "sunLight",
    new BABYLON.Vector3(-1, -2, -1).normalize(),
    scene
  );
  sunLight.intensity = 0.6;

  // --- Initialize Modules (order matters!) ---
  initBlockMaterials(scene);   // 1. Materials first
  initWorld(scene);            // 2. World needs materials
  initPlayer(scene, canvas);   // 3. Player needs world + scene
  initUI(canvas);              // 4. UI needs canvas

  // Set initial HUD block indicator
  updateBlockIndicator(PHASE_1_HOTBAR[0]);

  // --- Render Loop ---
  engine.runRenderLoop(() => scene.render());

  // --- Resize Handler ---
  window.addEventListener("resize", () => engine.resize());

  console.log("[main.js] ✅ BuildRight Phase 1 running");
}