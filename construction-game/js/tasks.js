// tasks.js - Complete Task System with 5 Lessons
// ============================================================================
//  HOW IT FITS TOGETHER
//  ---------------------------------------------------------------------------
//  main.js  ──calls──►  addPlacedBlock(x, y, z, type)   // every block placed
//                            │
//                            └─► checkStepCompletion()  // runs automatically
//                                    │
//                                    ├─ lesson done → step.onComplete()
//                                    │     → triggerTaskComplete(title, msg)
//                                    │     → your modal
//                                    │       (setShowTaskCompleteCallback)
//                                    │
//                                    └─ after 1.4 s → advanceStep()
//                                         …and after lesson 5 → the big
//                                         completion screen
//                                         (setOnAllTasksComplete)
// ============================================================================

/** How long the "lesson complete" modal stays up before the next lesson. */
export const ADVANCE_DELAY = 1400;

/* ------------------------------------------------------------------ state -- */

/** Every block the player has placed so far (cumulative across all lessons). */
export let placedBlocks = [];

/** Callbacks that main.js registers. */
let showTaskCompleteCallback = null;
let onStepAdvanceCallback = null;
let onAllTasksCompleteCallback = null;

/** Internal timer used to move from one lesson to the next. */
let advanceTimer = null;

/* ------------------------------------------------------------------ tasks -- */

export const tasks = {
  currentStep: 0,
  isComplete: false,
  allComplete: false,

  steps: [
    // ---------------------------------------------------------- LESSON 1 --
    {
      id: 'foundation',
      title: '🏗️ Lesson 1: Lay the Foundation',
      instruction: 'Place 4 foundation blocks in a 2x2 square (y=0)',
      requiredBlocks: [
        { x: 0, y: 0, z: 0, type: 'foundation' },
        { x: 1, y: 0, z: 0, type: 'foundation' },
        { x: 0, y: 0, z: 1, type: 'foundation' },
        { x: 1, y: 0, z: 1, type: 'foundation' }
      ],
      onComplete: () => triggerTaskComplete(
        '🎉 Foundation complete!',
        'The base is solid. Time to build walls!'
      )
    },

    // ---------------------------------------------------------- LESSON 2 --
    {
      id: 'walls',
      title: '🧱 Lesson 2: Build the Walls',
      instruction: 'Place 12 wood blocks (3 high on 4 sides) - Click on the foundation to stack up!',
      requiredBlocks: [
        { x: 0, y: 1, z: 0, type: 'wood' },
        { x: 0, y: 2, z: 0, type: 'wood' },
        { x: 0, y: 3, z: 0, type: 'wood' },
        { x: 1, y: 1, z: 0, type: 'wood' },
        { x: 1, y: 2, z: 0, type: 'wood' },
        { x: 1, y: 3, z: 0, type: 'wood' },
        { x: 0, y: 1, z: 1, type: 'wood' },
        { x: 0, y: 2, z: 1, type: 'wood' },
        { x: 0, y: 3, z: 1, type: 'wood' },
        { x: 1, y: 1, z: 1, type: 'wood' },
        { x: 1, y: 2, z: 1, type: 'wood' },
        { x: 1, y: 3, z: 1, type: 'wood' }
      ],
      onComplete: () => triggerTaskComplete(
        '🏠 Walls complete!',
        "Now let's add a roof!"
      )
    },

    // ---------------------------------------------------------- LESSON 3 --
    {
      id: 'roof',
      title: '🔺 Lesson 3: Add the Roof',
      instruction: 'Place 6 wood blocks in a pyramid pattern (3-2-1) - Stack on top of walls!',
      requiredBlocks: [
        { x: 0, y: 4, z: 0, type: 'wood' },
        { x: 1, y: 4, z: 0, type: 'wood' },
        { x: 0, y: 4, z: 1, type: 'wood' },
        { x: 0, y: 5, z: 0, type: 'wood' },
        { x: 1, y: 5, z: 0, type: 'wood' },
        { x: 0, y: 6, z: 0, type: 'wood' }
      ],
      onComplete: () => triggerTaskComplete(
        '🔺 Roof complete!',
        'The house is taking shape. Time for windows!'
      )
    },

    // ---------------------------------------------------------- LESSON 4 --
    // NOTE: these used to be (0,2,-1) and (1,2,-1) – but (0,2,-1) is also a
    // door position in lesson 5, so the two lessons could never both be done.
    // The windows now sit on the row above the door.
    {
      id: 'windows',
      title: '🪟 Lesson 4: Install Windows',
      instruction: 'Place 2 glass blocks above the front wall (click on the wall faces)',
      requiredBlocks: [
        { x: 0, y: 3, z: -1, type: 'glass' },
        { x: 1, y: 3, z: -1, type: 'glass' }
      ],
      onComplete: () => triggerTaskComplete(
        '🪟 Windows installed!',
        "Now let's add a door!"
      )
    },

    // ---------------------------------------------------------- LESSON 5 --
    {
      id: 'door',
      title: '🚪 Lesson 5: Install the Door',
      instruction: 'Place 2 door blocks in the front wall (y=1, y=2)',
      requiredBlocks: [
        { x: 0, y: 1, z: -1, type: 'door' },
        { x: 0, y: 2, z: -1, type: 'door' }
      ],
      onComplete: () => triggerTaskComplete(
        '🏠 HOUSE COMPLETE! 🎉',
        'You built a house from foundation to roof! Great job!'
      )
    }
  ],

  // Backwards-compatible alias – tasks.placedBlocks === placedBlocks
  get placedBlocks() { return placedBlocks; },
  set placedBlocks(value) { placedBlocks = Array.isArray(value) ? value : []; }
};

/* --------------------------------------------------------------- queries -- */

export function getCurrentStep() {
  return tasks.steps[tasks.currentStep] || null;
}

export function getCurrentStepIndex() {
  return tasks.currentStep;
}

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

/**
 * True when every block required by `step` has been placed.
 * Matching is done on coordinates only, so a lesson can never soft-lock
 * because the wrong material ended up in the right cell.
 */
export function isStepComplete(step = getCurrentStep()) {
  if (!step || !Array.isArray(step.requiredBlocks)) return false;
  return step.requiredBlocks.every(req =>
    placedBlocks.some(p => samePosition(p, req))
  );
}

/** e.g. { placed: 3, total: 4 } – handy for a progress bar. */
export function getStepProgress(step = getCurrentStep()) {
  if (!step || !Array.isArray(step.requiredBlocks)) return { placed: 0, total: 0 };
  const placed = step.requiredBlocks.filter(req =>
    placedBlocks.some(p => samePosition(p, req))
  ).length;
  return { placed, total: step.requiredBlocks.length };
}

export function isTaskComplete() {
  return tasks.isComplete;
}

export function setTaskComplete(complete) {
  tasks.isComplete = !!complete;
}

/* ------------------------------------------------------- block tracking -- */

export function addPlacedBlock(x, y, z, type) {
  const existing = placedBlocks.find(b => b.x === x && b.y === y && b.z === z);

  if (existing) {
    existing.type = type;                 // the block was replaced
  } else {
    placedBlocks.push({ x, y, z, type });
  }

  checkStepCompletion();                  // ← every lesson is checked here
  return true;
}

export function removePlacedBlock(x, y, z) {
  const index = placedBlocks.findIndex(b => b.x === x && b.y === y && b.z === z);
  if (index === -1) return false;
  placedBlocks.splice(index, 1);
  return true;
}

export function resetPlacedBlocks() {
  placedBlocks.length = 0;                // keeps the same array reference
}

/* ----------------------------------------------------------- step control -- */

export function advanceStep() {
  if (tasks.currentStep >= tasks.steps.length - 1) return false;

  tasks.currentStep += 1;
  tasks.isComplete = false;

  clearTimeout(advanceTimer);
  advanceTimer = null;

  if (typeof onStepAdvanceCallback === 'function') {
    onStepAdvanceCallback(tasks.currentStep, getCurrentStep());
  }
  return true;
}

export function resetTasks() {
  clearTimeout(advanceTimer);
  advanceTimer = null;

  tasks.currentStep = 0;
  tasks.isComplete = false;
  tasks.allComplete = false;

  resetPlacedBlocks();
}

/**
 * The heart of the system.
 * Call it (or let addPlacedBlock call it) after anything changes the world.
 * Returns true only the moment a lesson is finished – it can be called
 * as often as you like, it will not fire twice for the same lesson.
 */
export function checkStepCompletion() {
  if (tasks.isComplete) return false;

  const step = getCurrentStep();
  if (!step || !isStepComplete(step)) return false;

  tasks.isComplete = true;

  const stepIndex = tasks.currentStep;
  const isLastStep = stepIndex === tasks.steps.length - 1;

  // 1. show this lesson's "well done" message
  if (typeof step.onComplete === 'function') {
    try {
      step.onComplete();
    } catch (err) {
      console.error('[tasks] onComplete() failed:', err);
    }
  }

  // 2. move on (or finish the whole game) after the modal has been read
  clearTimeout(advanceTimer);
  advanceTimer = setTimeout(() => {
    advanceTimer = null;

    if (isLastStep) {
      tasks.allComplete = true;
      finishAllTasks();
    } else if (tasks.currentStep === stepIndex) {
      // only advance if main.js did not already move us on manually
      advanceStep();
    }
  }, ADVANCE_DELAY);

  return true;
}

/** Alias – some builds call this name instead. */
export const checkTaskProgress = checkStepCompletion;

/* ------------------------------------------------------- completion hooks -- */

export function setShowTaskCompleteCallback(callback) {
  showTaskCompleteCallback = typeof callback === 'function' ? callback : null;
}

export function setOnStepAdvanceCallback(callback) {
  onStepAdvanceCallback = typeof callback === 'function' ? callback : null;
}

export function setOnAllTasksComplete(callback) {
  onAllTasksCompleteCallback = typeof callback === 'function' ? callback : null;
}

/** Shows a lesson-complete message through whatever UI main.js registered. */
export function triggerTaskComplete(title, message) {
  if (typeof showTaskCompleteCallback === 'function') {
    showTaskCompleteCallback(title, message);
    return;
  }
  if (typeof window !== 'undefined' && typeof window.showTaskComplete === 'function') {
    window.showTaskComplete(title, message);
    return;
  }
  console.log(`[tasks] ${title} — ${message}`);
}

/** All 5 lessons are done – hand over to the completion screen. */
function finishAllTasks() {
  tasks.allComplete = true;

  if (typeof onAllTasksCompleteCallback === 'function') {
    onAllTasksCompleteCallback();
    return;
  }
  if (typeof window !== 'undefined') {
    if (typeof window.showCompletionScreen === 'function') return window.showCompletionScreen();
    if (typeof window._showCompletion === 'function') return window._showCompletion();
  }
  console.log('[tasks] 🎉 All 5 lessons complete!');
}