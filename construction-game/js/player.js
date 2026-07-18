// ============================================================
// player.js — First-Person Player Controller
// ============================================================

const PLAYER_CONFIG = {
  MOVE_SPEED:   0.12,
  SPRINT_SPEED: 0.22,
  JUMP_FORCE:   0.18,
  GRAVITY:      0.012,
  EYE_HEIGHT:   1.7,
  REACH:        6,
  FLOOR_OFFSET: 0.5,
};

let _scene    = null;
let _canvas   = null;
let _camera   = null;

const _keys = new Set();

let _verticalVelocity = 0;
let _isOnGround       = false;
let _selectedBlockId  = PHASE_1_HOTBAR[0];
let _lastActionTime   = 0;
const ACTION_COOLDOWN_MS = 220;

// Mouse look angles
let _yaw   = 0;
let _pitch = 0;
const PITCH_LIMIT        = Math.PI / 2.1;
const MOUSE_SENSITIVITY  = 0.002;

/**
 * Initialize the player camera and all input listeners.
 */
function initPlayer(scene, canvas) {
  _scene  = scene;
  _canvas = canvas;

  // UniversalCamera for free first-person movement
  _camera = new BABYLON.UniversalCamera(
    "playerCamera",
    new BABYLON.Vector3(0, PLAYER_CONFIG.EYE_HEIGHT + 5, -5),
    scene
  );
  _camera.minZ = 0.1;

  // IMPORTANT: detach Babylon's built-in controls entirely.
  // We handle all input ourselves for full control + no glitches.
  _camera.inputs.clear();

  // Look toward center of world on start
  _camera.setTarget(new BABYLON.Vector3(0, PLAYER_CONFIG.EYE_HEIGHT + 4, 0));

  // Keyboard
  window.addEventListener("keydown", (e) => {
    _keys.add(e.code);
    // Block hotbar switching
    if (e.code === "Digit1") _selectBlock(PHASE_1_HOTBAR[0]);
    if (e.code === "Digit2") _selectBlock(PHASE_1_HOTBAR[1]);
  });
  window.addEventListener("keyup", (e) => _keys.delete(e.code));

  // Mouse look — fires when pointer is locked OR when game is just started
  document.addEventListener("mousemove", _onMouseMove);

  // Block placement/removal
  canvas.addEventListener("mousedown", _onMouseDown);

  // Prevent right-click context menu in game canvas
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // Register per-frame update
  scene.onBeforeRenderObservable.add(_update);

  console.log("[player.js] Player initialized ✅");
}

/**
 * Mouse move — only active when pointer is locked.
 */
function _onMouseMove(e) {
  // Only rotate camera if pointer is captured (inside game)
  if (document.pointerLockElement !== _canvas) return;

  _yaw   += e.movementX * MOUSE_SENSITIVITY;
  _pitch -= e.movementY * MOUSE_SENSITIVITY;
  _pitch  = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, _pitch));

  const cosP = Math.cos(_pitch);
  _camera.setTarget(new BABYLON.Vector3(
    _camera.position.x + Math.sin(_yaw) * cosP,
    _camera.position.y + Math.sin(_pitch),
    _camera.position.z + Math.cos(_yaw) * cosP
  ));
}

/**
 * Mouse click — place or remove blocks via raycast.
 */
function _onMouseDown(e) {
  // Only act when pointer is locked (player is in-game)
  if (document.pointerLockElement !== _canvas) return;

  const now = Date.now();
  if (now - _lastActionTime < ACTION_COOLDOWN_MS) return;
  _lastActionTime = now;

  // Raycast from the center of the screen
  const ray = _scene.createPickingRay(
    _canvas.width  / 2,
    _canvas.height / 2,
    BABYLON.Matrix.Identity(),
    _camera
  );

  const hit = _scene.pickWithRay(
    ray,
    (mesh) => mesh.isPickable && mesh.metadata && mesh.metadata.blockId
  );

  if (!hit || !hit.hit || hit.distance > PLAYER_CONFIG.REACH) return;

  const { gridX, gridY, gridZ } = hit.pickedMesh.metadata;

  if (e.button === 0) {
    // Left click — remove block
    removeBlock(gridX, gridY, gridZ);

  } else if (e.button === 2) {
    // Right click — place block on the clicked face
    const normal = hit.getNormal(true);
    if (!normal) return;

    const nx = Math.round(normal.x);
    const ny = Math.round(normal.y);
    const nz = Math.round(normal.z);

    const placeX = gridX + nx;
    const placeY = gridY + ny;
    const placeZ = gridZ + nz;

    // Don't place inside the player
    const pX = Math.round(_camera.position.x);
    const pZ = Math.round(_camera.position.z);
    const pY = Math.round(_camera.position.y - PLAYER_CONFIG.EYE_HEIGHT);
    if (placeX === pX && placeZ === pZ && (placeY === pY || placeY === pY + 1)) return;

    placeBlock(placeX, placeY, placeZ, _selectedBlockId);
  }
}

function _selectBlock(blockId) {
  _selectedBlockId = blockId;
  updateBlockIndicator(blockId);
}

/**
 * Per-frame update: movement, gravity, jumping, ground detection.
 */
function _update() {
  if (!_camera) return;

  const pos      = _camera.position;
  const isSprint = _keys.has("ShiftLeft") || _keys.has("ShiftRight");
  const speed    = isSprint ? PLAYER_CONFIG.SPRINT_SPEED : PLAYER_CONFIG.MOVE_SPEED;

  // Flat forward and right vectors (ignore camera Y tilt for movement)
  const forwardFlat = new BABYLON.Vector3(Math.sin(_yaw), 0, Math.cos(_yaw));
  const rightFlat   = new BABYLON.Vector3(Math.cos(_yaw), 0, -Math.sin(_yaw));

  const move = BABYLON.Vector3.Zero();
  if (_keys.has("KeyW")) move.addInPlace(forwardFlat);
  if (_keys.has("KeyS")) move.subtractInPlace(forwardFlat);
  if (_keys.has("KeyA")) move.subtractInPlace(rightFlat);
  if (_keys.has("KeyD")) move.addInPlace(rightFlat);

  if (move.length() > 0) {
    move.normalize().scaleInPlace(speed);
    pos.addInPlace(move);
  }

  // Gravity
  _verticalVelocity -= PLAYER_CONFIG.GRAVITY;
  pos.y += _verticalVelocity;

  // Ground detection
  const groundY   = _findGroundBelow(Math.round(pos.x), pos.y, Math.round(pos.z));
  const standingY = groundY + 1 + PLAYER_CONFIG.EYE_HEIGHT + PLAYER_CONFIG.FLOOR_OFFSET;

  if (pos.y <= standingY) {
    pos.y              = standingY;
    _verticalVelocity  = 0;
    _isOnGround        = true;
  } else {
    _isOnGround = false;
  }

  // Jump
  if (_keys.has("Space") && _isOnGround) {
    _verticalVelocity = PLAYER_CONFIG.JUMP_FORCE;
    _isOnGround       = false;
  }

  // Clamp to world bounds
  const half = Math.floor(WORLD_CONFIG.SIZE / 2);
  pos.x = Math.max(-half + 1, Math.min(half - 1, pos.x));
  pos.z = Math.max(-half + 1, Math.min(half - 1, pos.z));
}

function _findGroundBelow(x, fromY, z) {
  for (let y = Math.floor(fromY); y >= -2; y--) {
    if (getBlock(x, y, z)) return y;
  }
  return -2;
}