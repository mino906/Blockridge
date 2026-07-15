// ============================================================
// main.js — Game Entry Point
//
// This file is intentionally small. Its only job is to:
//   1. Create the Babylon.js engine and scene
//   2. Set up lighting and sky
//   3. Call each module's init function in the right order
//   4. Start the render loop
//
// Think of this as the "wiring" file — it connects all the
// other modules together but doesn't own any logic itself.
// ============================================================

(function () {
  "use strict";

  // --- Engine & Scene Setup ---------------------------------
  const canvas = document.getElementById("renderCanvas");

  // The Babylon.js Engine is the core renderer.
  // antialias: true — smooths jagged edges on block corners
  const engine = new BABYLON.Engine(canvas, /* antialias */ true);

  // The Scene holds all meshes, lights, cameras, and materials.
  // Every Babylon.js game has at least one scene.
  const scene = new BABYLON.Scene(engine);

  // Background color — a light daytime sky blue
  scene.clearColor = new BABYLON.Color4(0.53, 0.81, 0.98, 1.0);

  // Fog adds depth — distant blocks fade into the sky color.
  // This also hides the hard edge at the world boundary.
  scene.fogMode    = BABYLON.Scene.FOGMODE_LINEAR;
  scene.fogStart   = 25;    // Fog begins 25 units away
  scene.fogEnd     = 45;    // Fog is fully opaque at 45 units
  scene.fogColor   = new BABYLON.Color3(0.53, 0.81, 0.98);  // Match sky

  // --- Lighting --------------------------------------------
  // HemisphericLight simulates ambient sky light.
  // Direction points upward — the "sky" is the light source.
  // This is the standard choice for outdoor daytime scenes.
  const ambientLight = new BABYLON.HemisphericLight(
    "ambientLight",
    new BABYLON.Vector3(0, 1, 0),  // pointing upward
    scene
  );
  ambientLight.intensity = 0.85;

  // DirectionalLight simulates the sun casting shadows on block sides.
  // Without this, all faces of a block would be the same brightness.
  const sunLight = new BABYLON.DirectionalLight(
    "sunLight",
    new BABYLON.Vector3(-1, -2, -1).normalize(),  // angled like afternoon sun
    scene
  );
  sunLight.intensity = 0.6;

  // --- Prevent Right-Click Context Menu --------------------
  // By default, right-clicking in the browser opens a context menu.
  // We suppress it so right-click can be used for block placement.
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // --- Initialize Modules (order matters) ------------------
  //
  // 1. Block materials first — world.js and player.js both need them
  initBlockMaterials(scene);

  // 2. World — generate terrain (needs scene + block materials)
  initWorld(scene);

  // 3. Player — sets up camera and input (needs scene + world's block data)
  initPlayer(scene, canvas);

  // 4. UI — wires up HUD and pointer lock prompt (needs canvas)
  initUI(canvas);

  // Set the initial block indicator to match the default hotbar selection
  updateBlockIndicator(PHASE_1_HOTBAR[0]);

  // --- Render Loop -----------------------------------------
  // engine.runRenderLoop calls scene.render() as fast as the
  // browser allows (typically 60 fps, capped by requestAnimationFrame).
  // Everything in scene.onBeforeRenderObservable (like _update in player.js)
  // runs automatically before each frame.
  engine.runRenderLoop(() => {
    scene.render();
  });

  // --- Responsive Resize -----------------------------------
  // When the browser window resizes, update the engine's resolution
  // so the canvas doesn't stretch or pixelate.
  window.addEventListener("resize", () => {
    engine.resize();
  });

  console.log("[main.js] BuildRight Phase 1 initialized");
})();

