// tasks.js — Two-Lesson Task System (Foundation + Walls)
// ============================================================================
//  LESSON 1:  Foundation  (book → zone → dig → concrete → rebar)
//  LESSON 2:  Walls       (place 8 blocks on the ghost markers)
//
//  Loaded as a plain <script>. Exposes window.Tasks.
//  Uses GameEvents (from world.js) or creates a local one.
// ============================================================================

(function () {
  'use strict';

  /* --------------------------------------------------------- GameEvents -- */
  const GameEvents = window.GameEvents || (function () {
    const listeners = {};
    const api = {
      _listeners: listeners,
      on(event, fn) { (listeners[event] = listeners[event] || []).push(fn); },
      emit(event, data) {
        (listeners[event] || []).forEach(fn => {
          try { fn(data); } catch (e) { console.error('[GameEvents]', e); }
        });
      },
    };
    window.GameEvents = api;
    return api;
  })();

  /* ----------------------------------------------------------- state ----- */
  let placedBlocks = [];
  let showTaskCompleteCallback = null;
  let onStepAdvanceCallback   = null;
  let onAllTasksCompleteCallback = null;
  let advanceTimer = null;

  const ADVANCE_DELAY = 900;

  function samePosition(a, b) {
    return a.x === b.x && a.y === b.y && a.z === b.z;
  }
  function normalizePos(x, y, z) {
    return { x: Math.round(x), y: Math.round(y), z: Math.round(z) };
  }

  /* ----------------------------------------------------------- tasks ----- */
  //  Lesson 1 step positions — matches the hardcoded HTML task panel.
  //  BUILD_ZONE is a 2×2 at (0..1, z=5..6). The HTML says "5 blocks north",
  //  so the player starts at z = 0 and walks to z ≈ 5.
  const FOUNDATION = {
    zone: [
      { x: 0, y: 1, z: 5 },
      { x: 1, y: 1, z: 5 },
      { x: 0, y: 1, z: 6 },
      { x: 1, y: 1, z: 6 },
    ],
  };

  const tasks = {
    currentStep: 0,
    isComplete: false,
    allComplete: false,

    steps: [
      /* ============================== LESSON 1 ============================== */
      {
        id: 'foundation',
        title: '🏗️ Lesson 1: Lay the Foundation',
        instruction: 'Place 4 concrete blocks in a 2×2 square, then 4 iron blocks on top.',
        requiredBlocks: [
          { x: 0, y: 1, z: 5, type: 'concrete' },
          { x: 1, y: 1, z: 5, type: 'concrete' },
          { x: 0, y: 1, z: 6, type: 'concrete' },
          { x: 1, y: 1, z: 6, type: 'concrete' },
          { x: 0, y: 2, z: 5, type: 'iron' },
          { x: 1, y: 2, z: 5, type: 'iron' },
          { x: 0, y: 2, z: 6, type: 'iron' },
          { x: 1, y: 2, z: 6, type: 'iron' },
        ],
        learned: [
          'Foundations transfer the weight of a building into the ground',
          'Concrete is strong under compression — perfect for footings',
          'Rebar handles tension so concrete doesn\'t crack',
        ],
        onComplete: () => triggerTaskComplete(
          '🎉 Foundation complete!',
          'The base is solid. Time to build walls!'
        ),
      },

      /* ============================== LESSON 2 ============================== */
      {
        id: 'walls',
        title: '🧱 Lesson 2: Build the Walls',
        instruction: 'Place 8 wood blocks in a 2×2 × 2-high wall on top of the foundation.',
        requiredBlocks: [
          { x: 0, y: 3, z: 5, type: 'wood' },
          { x: 1, y: 3, z: 5, type: 'wood' },
          { x: 0, y: 3, z: 6, type: 'wood' },
          { x: 1, y: 3, z: 6, type: 'wood' },
          { x: 0, y: 4, z: 5, type: 'wood' },
          { x: 1, y: 4, z: 5, type: 'wood' },
          { x: 0, y: 4, z: 6, type: 'wood' },
          { x: 1, y: 4, z: 6, type: 'wood' },
        ],
        learned: [
          'Walls transfer roof and floor loads into the foundation',
          'Each course of blocks must be level before the next goes on',
          'Walls are only as straight as the foundation under them',
        ],
        onComplete: () => triggerTaskComplete(
          '🏠 Walls complete!',
          'The walls are up. The house is taking shape!'
        ),
      },
    ],

    get placedBlocks() { return placedBlocks; },
    set placedBlocks(v) { placedBlocks = Array.isArray(v) ? v : []; },
  };

  /* ----------------------------------------------------------- queries -- */

  function getCurrentStep()       { return tasks.steps[tasks.currentStep] || null; }
  function getCurrentStepIndex()  { return tasks.currentStep; }

  function isStepComplete(step = getCurrentStep()) {
    if (!step) return false;
    if (Array.isArray(step.removalTargets) && step.removalTargets.length) {
      return step.removalTargets.every(t => !placedBlocks.some(p => samePosition(p, t)));
    }
    if (!Array.isArray(step.requiredBlocks) || !step.requiredBlocks.length) return false;
    return step.requiredBlocks.every(req =>
      placedBlocks.some(p => samePosition(p, req))
    );
  }

  function getStepProgress(step = getCurrentStep()) {
    if (!step) return { placed: 0, total: 0 };
    if (Array.isArray(step.removalTargets) && step.removalTargets.length) {
      const placed = step.removalTargets.filter(t =>
        !placedBlocks.some(p => samePosition(p, t))
      ).length;
      return { placed, total: step.removalTargets.length };
    }
    if (!Array.isArray(step.requiredBlocks)) return { placed: 0, total: 0 };
    const placed = step.requiredBlocks.filter(req =>
      placedBlocks.some(p => samePosition(p, req))
    ).length;
    return { placed, total: step.requiredBlocks.length };
  }

  function isTaskComplete()         { return tasks.isComplete; }
  function setTaskComplete(c)       { tasks.isComplete = !!c; }

  /* ---------------------------------------------------- block tracking -- */

  function addPlacedBlock(x, y, z, type) {
    const pos = normalizePos(x, y, z);
    const existing = placedBlocks.find(b => samePosition(b, pos));
    if (existing) existing.type = type;
    else placedBlocks.push({ x: pos.x, y: pos.y, z: pos.z, type });
    checkStepCompletion();
    return true;
  }

  function removePlacedBlock(x, y, z) {
    const pos = normalizePos(x, y, z);
    const i = placedBlocks.findIndex(b => samePosition(b, pos));
    if (i === -1) return false;
    placedBlocks.splice(i, 1);
    checkStepCompletion();
    return true;
  }

  function resetPlacedBlocks() { placedBlocks.length = 0; }

  /* ----------------------------------------------------- step control --- */

  function advanceStep() {
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

  function resetTasks() {
    clearTimeout(advanceTimer);
    advanceTimer = null;
    tasks.currentStep = 0;
    tasks.isComplete = false;
    tasks.allComplete = false;
    resetPlacedBlocks();
  }

  function checkStepCompletion() {
    if (tasks.isComplete) return false;
    const step = getCurrentStep();
    if (!step || !isStepComplete(step)) return false;

    tasks.isComplete = true;
    const stepIndex = tasks.currentStep;
    const isLastStep = stepIndex === tasks.steps.length - 1;

    if (typeof step.onComplete === 'function') {
      try { step.onComplete(); }
      catch (err) { console.error('[tasks] onComplete() failed:', err); }
    }

    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      advanceTimer = null;
      if (isLastStep) {
        tasks.allComplete = true;
        finishAllTasks();
      } else if (tasks.currentStep === stepIndex) {
        advanceStep();
      }
    }, ADVANCE_DELAY);

    return true;
  }

  const checkTaskProgress = checkStepCompletion;

  /* ---------------------------------------------------- completion hooks */

  function setShowTaskCompleteCallback(cb)  { showTaskCompleteCallback = typeof cb === 'function' ? cb : null; }
  function setOnStepAdvanceCallback(cb)     { onStepAdvanceCallback   = typeof cb === 'function' ? cb : null; }
  function setOnAllTasksComplete(cb)        { onAllTasksCompleteCallback = typeof cb === 'function' ? cb : null; }

  function triggerTaskComplete(title, message) {
    if (typeof showTaskCompleteCallback === 'function') return showTaskCompleteCallback(title, message);
    if (typeof window.showTaskComplete === 'function') return window.showTaskComplete(title, message);
    console.log(`[tasks] ${title} — ${message}`);
  }

  function finishAllTasks() {
    tasks.allComplete = true;
    if (typeof onAllTasksCompleteCallback === 'function') return onAllTasksCompleteCallback();
    console.log('[tasks] 🎉 All lessons complete!');
  }

  /* ------------------------------------------------------- public API --- */

  window.Tasks = {
    ADVANCE_DELAY,
    tasks,
    FOUNDATION,
    getCurrentStep,
    getCurrentStepIndex,
    isStepComplete,
    getStepProgress,
    isTaskComplete,
    setTaskComplete,
    addPlacedBlock,
    removePlacedBlock,
    resetPlacedBlocks,
    advanceStep,
    resetTasks,
    checkStepCompletion,
    checkTaskProgress,
    setShowTaskCompleteCallback,
    setOnStepAdvanceCallback,
    setOnAllTasksComplete,
    triggerTaskComplete,
  };

  console.log('[tasks] Two-lesson system loaded ✅');
})();