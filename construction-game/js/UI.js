// ============================================================
// ui.js — HUD & Overlay Management
//
// Responsibilities:
//   1. Update block indicator when player switches blocks
//   2. Fade out controls hint after game starts
//   3. Show/hide pointer lock prompt
// ============================================================

// Cache DOM element references so we're not querying the DOM every frame
const _els = {
  lockPrompt:     document.getElementById("lock-prompt"),
  startBtn:       document.getElementById("start-btn"),
  controlsHint:   document.getElementById("controls-hint"),
  blockIcon:      document.getElementById("block-icon"),
  blockName:      document.getElementById("block-name"),
};

/**
 * Wires up the pointer lock prompt UI.
 * Called once from main.js after the scene is ready.
 *
 * @param {HTMLCanvasElement} canvas
 */
function initUI(canvas) {
  _els.startBtn.addEventListener("click", () => {
    // Request pointer lock — once granted, the canvas click listener in player.js
    // will also lock, but this gives an explicit "Start" button for clarity
    canvas.requestPointerLock();
    _hidePrompt();
  });

  // If the player exits pointer lock (e.g. presses Escape), show the prompt again
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== canvas) {
      _showPrompt();
    }
  });

  // Fade out the controls hint after 8 seconds so it doesn't clutter the screen
  setTimeout(() => {
    _els.controlsHint.classList.add("hidden");
  }, 8000);
}

/**
 * Updates the HUD block indicator to reflect the player's current selection.
 * Called by player.js whenever the player presses 1 or 2.
 *
 * @param {string} blockId - e.g. "dirt", "stone"
 */
function updateBlockIndicator(blockId) {
  const blockDef = BLOCK_TYPES[blockId];

  if (!blockDef) {
    console.warn(`[ui.js] Unknown block id passed to updateBlockIndicator: "${blockId}"`);
    return;
  }

  _els.blockIcon.textContent = blockDef.emoji;
  _els.blockName.textContent = blockDef.name;
}

// --- Private helpers ----------------------------------------

function _hidePrompt() {
  _els.lockPrompt.classList.add("hidden");
}

function _showPrompt() {
  _els.lockPrompt.classList.remove("hidden");
}