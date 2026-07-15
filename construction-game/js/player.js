// ============================================================
// player.js — First-Person Player Controller
//
// Responsibilities:
//   1. Create and manage the first-person camera
//   2. Handle WASD movement and mouse look
//   3. Handle jumping with gravity
//   4. Raycast for block interaction (place + remove)
//   5. Track which block type the player has selected
// ============================================================

// --- Player Configuration -----------------------------------
// Tuning these values changes the game's feel.
// This is called "game feel" or "juice" in game development.
const PLAYER_CONFIG = {
  MOVE_SPEED: 0.12,        // Units per frame when walking
  SPRINT_SPEED: 0.22,      // Units per frame when holding Shift
  JUMP_FORCE: 0.18,        // Upward velocity on jump
  GRAVITY: 0.012,          // Downward pull per frame
  EYE_HEIGHT: 1.7,         // Camera Y offset above block grid (meters)
  REACH: 6,                // Max block interaction distance (in units)
  FLOOR_OFFSET: 0.5,       // How far above a block top the player stands
};

// --- Internal State -----------------------------------------
let _scene     = null;
let _canvas    = null;
let _camera    = null;

// Keyboard state: tracks which keys are currently held down
// Using a Set is cleaner than boolean flags for multiple keys
const _keys = new Set();

// Vertical velocity for gravity and jumping
let _verticalVelocity = 0;
let _isOnGround       = false;

// Currently selected block type from the hotbar
let _selectedBlockId  = PHASE_1_HOTBAR[0]; // Default: first hotbar item

// Cooldown timer prevents accidental rapid-fire block placement/removal
// (300ms between block actions feels natural)
let _lastActionTime = 0;
const ACTION_COOLDOWN_MS = 220;

/**
 * Sets up the first-person camera using Babylon.js's
 * UniversalCamera — the best camera for FPS-style games.
 *
 * Why UniversalCamera over ArcRotateCamera?
 *   ArcRotateCamera orbits around a target point (good for 3D viewers).
 *   UniversalCamera moves freely in 3D space (good for first-person games).
 *
 * @param {BABYLON.Scene} scene
 * @param {HTMLCanvasElement} canvas
 */
function initPlayer(scene, canvas) {
  _scene  = scene;
  _canvas = canvas;

  // --- Camera Setup ---
  _camera = new BABYLON.UniversalCamera(
    "playerCamera",
    new BABYLON.Vector3(0, PLAYER_CONFIG.EYE_HEIGHT + 4, 0), // Start above terrain center
    scene
  );

  // The camera looks slightly downward at start so the player sees the ground
  _camera.setTarget(new BABYLON.Vector3(1, PLAYER_CONFIG.EYE_HEIGHT + 3.5, 1));

  // Attach camera to the canvas for mouse look
  // We do NOT use Babylon's built-in inputs because we want full manual control
  // to avoid the jitter and lock issues that come with the default FPS controller
  _camera.detachControl();

  // Clamp how far up/down the player can look (prevents camera flipping)
  _camera.minZ = 0.1;   // Near clip plane — stops blocks from clipping into view

  // --- Keyboard Events ---
  // We track keydown/keyup ourselves instead of using Babylon's input system.
  // This gives us precise control over sprint, jump timing, and diagonal movement.
  window.addEventListener("keydown", (e) => _keys.add(e.code));
  window.addEventListener("keyup",   (e) => _keys.delete(e.code));

  // --- Mouse Look (Pointer Lock) ---
  // Pointer lock hides the OS cursor and gives us raw mouse movement data.
  // This is what makes first-person mouse look smooth — no cursor edge limits.
  canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) {
      // Mouse is now captured — attach mouse move for looking
      document.addEventListener("mousemove", _onMouseMove);
    } else {
      document.removeEventListener("mousemove", _onMouseMove);
    }
  });

  // --- Block Interaction ---
  canvas.addEventListener("mousedown", _onMouseDown);

  // --- Hotbar ---
  window.addEventListener("keydown", (e) => {
    if (e.code === "Digit1") _selectBlock(PHASE_1_HOTBAR[0]);
    if (e.code === "Digit2") _selectBlock(PHASE_1_HOTBAR[1]);
  });

  // Register the per-frame update in Babylon's render loop
  scene.onBeforeRenderObservable.add(_update);

  console.log("[player.js] Player initialized at", _camera.position);
}

// --- Internal angle trackers for mouse look -----------------
// We track pitch (up/down) and yaw (left/right) ourselves to prevent
// the 90-degree flip (gimbal lock) that happens with Euler rotation.
let _yaw   = 0;   // Horizontal rotation (left/right), in radians
let _pitch = 0;   // Vertical rotation (up/down), in radians

const PITCH_LIMIT = Math.PI / 2.1; // ~85 degrees — prevents looking fully upside-down
const MOUSE_SENSITIVITY = 0.002;

/**
 * Handles raw mouse movement for camera rotation.
 * movementX and movementY are pixel deltas — only available inside pointer lock.
 *
 * @param {MouseEvent} e
 */
function _onMouseMove(e) {
  _yaw   += e.movementX * MOUSE_SENSITIVITY;
  _pitch -= e.movementY * MOUSE_SENSITIVITY;  // Negative: moving mouse up = looking up

  // Clamp pitch so the camera can't flip over
  _pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, _pitch));

  // Build a direction vector from yaw and pitch angles
  // This is the standard spherical coordinates → cartesian formula
  const cosP = Math.cos(_pitch);
  _camera.setTarget(new BABYLON.Vector3(
    _camera.position.x + Math.sin(_yaw) * cosP,
    _camera.position.y + Math.sin(_pitch),
    _camera.position.z + Math.cos(_yaw) * cosP
  ));
}

/**
 * Handles left-click (remove block) and right-click (place block).
 * Uses Babylon's scene.pick() — a raycast from the camera through the screen center.
 *
 * @param {MouseEvent} e
 */
function _onMouseDown(e) {
  // Throttle: ignore if action happened too recently
  const now = Date.now();
  if (now - _lastActionTime < ACTION_COOLDOWN_MS) return;
  _lastActionTime = now;

  // Cast a ray from the camera forward
  // predicate: only hit pickable meshes (i.e., blocks — not the camera itself)
  const ray = _scene.createPickingRay(
    _canvas.width / 2,
    _canvas.height / 2,
    BABYLON.Matrix.Identity(),
    _camera
  );

  const hit = _scene.pickWithRay(ray, (mesh) => mesh.isPickable && mesh !== _camera);

  if (!hit.hit || hit.distance > PLAYER_CONFIG.REACH) return;

  const hitMesh = hit.pickedMesh;
  const { gridX, gridY, gridZ } = hitMesh.metadata;

  if (e.button === 0) {
    // Left click — remove the hit block
    removeBlock(gridX, gridY, gridZ);

  } else if (e.button === 2) {
    // Right click — place a block on the face that was hit
    // hit.getNormal() gives us the face direction so we know which
    // adjacent grid cell to place the new block in
    const normal = hit.getNormal(true);

    if (!normal) return;

    // Round the normal components — they should be -1, 0, or 1 on each axis
    const nx = Math.round(normal.x);
    const ny = Math.round(normal.y);
    const nz = Math.round(normal.z);

    const placeX = gridX + nx;
    const placeY = gridY + ny;
    const placeZ = gridZ + nz;

    // Don't place a block inside the player's body
    const playerGridY = Math.round(_camera.position.y - PLAYER_CONFIG.EYE_HEIGHT);
    if (placeX === Math.round(_camera.position.x) &&
        placeZ === Math.round(_camera.position.z) &&
        (placeY === playerGridY || placeY === playerGridY + 1)) {
      return;
    }

    placeBlock(placeX, placeY, placeZ, _selectedBlockId);
  }
}

/**
 * Selects a block type from the hotbar.
 * Updates the HUD via ui.js.
 *
 * @param {string} blockId
 */
function _selectBlock(blockId) {
  _selectedBlockId = blockId;
  updateBlockIndicator(blockId);   // Defined in ui.js
}

/**
 * Per-frame update function — called every render frame by Babylon's loop.
 * Handles movement, gravity, and jumping.
 *
 * Why manual physics instead of Babylon's physics engine?
 *   For a voxel game, a full physics engine (Havok, Cannon.js) adds complexity.
 *   Simple manual movement with ground-check collision is more predictable
 *   and easier to tune for block-based gameplay.
 */
function _update() {
  if (!_camera) return;

  const pos     = _camera.position;
  const isSprint = _keys.has("ShiftLeft") || _keys.has("ShiftRight");
  const speed    = isSprint ? PLAYER_CONFIG.SPRINT_SPEED : PLAYER_CONFIG.MOVE_SPEED;

  // --- Horizontal Movement ---
  // Build a forward vector projected onto the XZ plane (ignore Y tilt).
  // This prevents the player from flying when looking up and pressing W.
  const forwardFlat = new BABYLON.Vector3(
    Math.sin(_yaw),
    0,
    Math.cos(_yaw)
  ).normalize();

  // Right vector is perpendicular to forward on the XZ plane
  const rightFlat = new BABYLON.Vector3(
    Math.cos(_yaw),
    0,
    -Math.sin(_yaw)
  ).normalize();

  const move = BABYLON.Vector3.Zero();

  if (_keys.has("KeyW"))      move.addInPlace(forwardFlat);
  if (_keys.has("KeyS"))      move.subtractInPlace(forwardFlat);
  if (_keys.has("KeyA"))      move.subtractInPlace(rightFlat);
  if (_keys.has("KeyD"))      move.addInPlace(rightFlat);

  // Normalize diagonal movement (prevents faster diagonal speed)
  if (move.length() > 0) {
    move.normalize().scaleInPlace(speed);
    pos.addInPlace(move);
  }

  // --- Gravity & Jumping ---
  _verticalVelocity -= PLAYER_CONFIG.GRAVITY;
  pos.y += _verticalVelocity;

  // --- Ground Detection ---
  // Find the highest block directly below the player's feet.
  // We check a small radius to prevent falling through corners.
  const footX = Math.round(pos.x);
  const footZ = Math.round(pos.z);

  // Sample the top of the terrain column below the player
  let groundY = _findGroundBelow(footX, pos.y, footZ);

  const standingY = groundY + 1 + PLAYER_CONFIG.EYE_HEIGHT + PLAYER_CONFIG.FLOOR_OFFSET;

  if (pos.y <= standingY) {
    pos.y = standingY;
    _verticalVelocity = 0;
    _isOnGround = true;
  } else {
    _isOnGround = false;
  }

  // --- Jumping ---
  if (_keys.has("Space") && _isOnGround) {
    _verticalVelocity = PLAYER_CONFIG.JUMP_FORCE;
    _isOnGround = false;
  }

  // --- World Bounds ---
  // Prevent the player from walking off the edge of the world
  const half = Math.floor(WORLD_CONFIG.SIZE / 2);
  pos.x = Math.max(-half, Math.min(half, pos.x));
  pos.z = Math.max(-half, Math.min(half, pos.z));
}

/**
 * Scans downward from the player's Y position to find the top block in their column.
 * Returns the Y coordinate of that block (or -1 if nothing found — fallback).
 *
 * @param {number} x - Grid X
 * @param {number} fromY - Start scanning from this Y downward
 * @param {number} z - Grid Z
 * @returns {number} Y of the highest block below the player
 */
function _findGroundBelow(x, fromY, z) {
  // Scan from current Y downward to find the first occupied block
  for (let y = Math.floor(fromY); y >= -1; y--) {
    if (getBlock(x, y, z)) return y;
  }
  return -1; // Fallback: treat Y = 0 as floor if nothing found
}