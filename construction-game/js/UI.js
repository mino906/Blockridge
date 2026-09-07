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

  // --- FIX #4: B key to toggle book ---
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyB") toggleBook();
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
// ui.js - Add these functions

let taskUIElement = null;

export function createTaskUI() {
    if (taskUIElement) return taskUIElement;
    
    taskUIElement = document.createElement('div');
    taskUIElement.id = 'taskUI';
    taskUIElement.style.position = 'absolute';
    taskUIElement.style.top = '20px';
    taskUIElement.style.left = '50%';
    taskUIElement.style.transform = 'translateX(-50%)';
    taskUIElement.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    taskUIElement.style.color = '#fff';
    taskUIElement.style.padding = '20px 30px';
    taskUIElement.style.borderRadius = '12px';
    taskUIElement.style.fontFamily = 'Arial, sans-serif';
    taskUIElement.style.textAlign = 'center';
    taskUIElement.style.minWidth = '450px';
    taskUIElement.style.border = '2px solid #4CAF50';
    taskUIElement.style.zIndex = '100';
    taskUIElement.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    document.body.appendChild(taskUIElement);
    
    return taskUIElement;
}

export function updateTaskUI(step, placedBlocks, totalLessons) {
    const ui = createTaskUI();
    
    if (!step) {
        ui.innerHTML = `
            <h2 style="margin:0;color:#FFD700;">🏠 ALL LESSONS COMPLETE!</h2>
            <p style="font-size:18px;margin:10px 0;">You're a master builder!</p>
            <button onclick="window.resetGame()" style="
                background:#FF6B6B;
                color:white;
                border:none;
                padding:12px 30px;
                font-size:16px;
                border-radius:8px;
                cursor:pointer;
                margin-top:10px;
            ">🔄 Start Over</button>
        `;
        return;
    }
    
    const progress = placedBlocks.filter(b => 
        step.requiredBlocks.some(rb => 
            rb.x === b.x && rb.y === b.y && rb.z === b.z && rb.type === b.type
        )
    ).length;
    const total = step.requiredBlocks.length;
    const percent = Math.round((progress/total)*100);
    
    const lessonNum = window.tasksCurrentStep !== undefined ? window.tasksCurrentStep + 1 : 1;
    
    ui.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-size:14px;color:#888;">Lesson ${lessonNum}/${totalLessons}</span>
            <span style="font-size:14px;color:#4CAF50;">${percent}% Complete</span>
        </div>
        <h2 style="margin:0 0 8px 0;color:#4CAF50;font-size:22px;">${step.title}</h2>
        <p style="margin:0 0 12px 0;font-size:16px;color:#ddd;">${step.instruction}</p>
        <div style="background:#333;border-radius:10px;height:22px;width:100%;overflow:hidden;border:1px solid #555;">
            <div style="background:linear-gradient(90deg,#4CAF50,#8BC34A);height:100%;width:${percent}%;transition:width 0.3s;"></div>
        </div>
        <p style="margin:8px 0 0 0;font-size:14px;color:#aaa;">${progress}/${total} blocks placed</p>
        <p style="margin:5px 0 0 0;font-size:11px;color:#555;">🖱️ Click to place | Right-click to remove | WASD to move</p>
    `;
}

export function showTaskCompleteModal(title, message, onNext, isLast) {
    // Remove any existing modal
    const existingModal = document.getElementById('taskCompleteModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'taskCompleteModal';
    modal.style.position = 'absolute';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.92)';
    modal.style.color = '#fff';
    modal.style.padding = '40px 60px';
    modal.style.borderRadius = '16px';
    modal.style.textAlign = 'center';
    modal.style.zIndex = '200';
    modal.style.border = '3px solid #FFD700';
    modal.style.boxShadow = '0 0 60px rgba(255,215,0,0.2)';
    modal.style.minWidth = '300px';
    
    modal.innerHTML = `
        <h1 style="font-size:42px;margin:0;">${title}</h1>
        <p style="font-size:18px;margin:20px 0;color:#ddd;">${message}</p>
        ${!isLast ? `
            <button id="nextLessonBtn" style="
                background:#4CAF50;
                color:white;
                border:none;
                padding:15px 40px;
                font-size:18px;
                border-radius:8px;
                cursor:pointer;
                margin-top:15px;
                transition:transform 0.2s;
            "
            onmouseover="this.style.transform='scale(1.05)'"
            onmouseout="this.style.transform='scale(1)'"
            >➡️ Next Lesson</button>
        ` : `
            <button id="resetBtn" style="
                background:#FFD700;
                color:#222;
                border:none;
                padding:15px 40px;
                font-size:18px;
                border-radius:8px;
                cursor:pointer;
                margin-top:15px;
                font-weight:bold;
                transition:transform 0.2s;
            "
            onmouseover="this.style.transform='scale(1.05)'"
            onmouseout="this.style.transform='scale(1)'"
            >🏆 Play Again</button>
        `}
    `;
    
    document.body.appendChild(modal);
    
    if (!isLast) {
        document.getElementById('nextLessonBtn').addEventListener('click', () => {
            modal.remove();
            if (onNext) onNext();
        });
    } else {
        document.getElementById('resetBtn').addEventListener('click', () => {
            modal.remove();
            if (onNext) onNext();
        });
    }
}