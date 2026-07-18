// ============================================================
// ui.js — HUD & Overlay Management
// ============================================================

const _els = {
  lockPrompt:   document.getElementById("lock-prompt"),
  startBtn:     document.getElementById("start-btn"),
  pausedOverlay:document.getElementById("paused-overlay"),
  controlsHint: document.getElementById("controls-hint"),
  blockIcon:    document.getElementById("block-icon"),
  blockName:    document.getElementById("block-name"),
};

// Track whether the game has been started at least once
let _gameStarted = false;

/**
 * Wires up start button and pointer lock state changes.
 * Key fix: we hide the prompt immediately on click WITHOUT
 * waiting for pointer lock to succeed — because requestPointerLock()
 * is async and may be delayed by the browser.
 *
 * @param {HTMLCanvasElement} canvas
 */
function initUI(canvas) {

  // --- Start Button ---
  _els.startBtn.addEventListener("click", () => {
    // Hide the start prompt right away — don't wait for pointer lock
    _hidePrompt();
    _gameStarted = true;

    // Try to request pointer lock (mouse capture for look-around)
    // Some browsers need a tiny delay after DOM changes before allowing this
    setTimeout(() => {
      canvas.requestPointerLock().catch(() => {
        // Pointer lock was denied (e.g. Firefox strict mode)
        // Game still works — mouse look just won't be captured
        console.warn("[ui.js] Pointer lock denied — mouse look disabled. Try clicking the canvas.");
      });
    }, 50);
  });

  // --- Pointer Lock State Changes ---
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) {
      // Mouse is captured — hide pause, hide prompt
      _els.pausedOverlay.classList.remove("visible");
      _hidePrompt();
    } else if (_gameStarted) {
      // Mouse was released mid-game (player pressed ESC)
      _els.pausedOverlay.classList.add("visible");
    }
  });

  // Clicking the paused overlay re-locks the mouse
  _els.pausedOverlay.addEventListener("click", () => {
    canvas.requestPointerLock().catch(() => {});
  });

  // Fade controls hint after 8 seconds
  setTimeout(() => {
    _els.controlsHint.classList.add("hidden");
  }, 8000);
}

/**
 * Updates the HUD block indicator.
 * @param {string} blockId
 */
function updateBlockIndicator(blockId) {
  const blockDef = BLOCK_TYPES[blockId];
  if (!blockDef) return;
  _els.blockIcon.textContent = blockDef.emoji;
  _els.blockName.textContent = blockDef.name;
}

function _hidePrompt() {
  _els.lockPrompt.classList.add("hidden");
}

function _showPrompt() {
  if (!_gameStarted) {
    _els.lockPrompt.classList.remove("hidden");
  }
}