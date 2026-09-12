// tasks.js - Complete Task System with 25 Lessons
// ============================================================================
//  LESSONS 1-5:   Original house build (foundation → walls → roof → windows → door)
//  LESSONS 6-25:  Real builder lessons (framing, MEP, finishes, site work)
// ============================================================================

export const ADVANCE_DELAY = 1400;

/* ------------------------------------------------------------------ state -- */

export let placedBlocks = [];

let showTaskCompleteCallback = null;
let onStepAdvanceCallback = null;
let onAllTasksCompleteCallback = null;

let advanceTimer = null;

/* ------------------------------------------------------------------ tasks -- */

export const tasks = {
  currentStep: 0,
  isComplete: false,
  allComplete: false,

  steps: [
    // ======================================================================
    //  ORIGINAL 5 LESSONS
    // ======================================================================

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
    },

    // ======================================================================
    //  20 REAL BUILDER LESSONS
    // ======================================================================

    // ---------------------------------------------------------- LESSON 6 --
    {
      id: 'site_layout',
      title: '📐 Lesson 6: Site Layout & Staking',
      instruction: 'Place 4 stone blocks to mark the building corners (property line stakes)',
      requiredBlocks: [
        { x: -2, y: 0, z: -2, type: 'stone' },
        { x:  3, y: 0, z: -2, type: 'stone' },
        { x: -2, y: 0, z:  3, type: 'stone' },
        { x:  3, y: 0, z:  3, type: 'stone' }
      ],
      onComplete: () => triggerTaskComplete(
        '📐 Site laid out!',
        'Corners are staked and square. Real builders check diagonals to confirm 90° angles.'
      )
    },

    // ---------------------------------------------------------- LESSON 7 --
    {
      id: 'excavation',
      title: '⛏️ Lesson 7: Excavation & Grading',
      instruction: 'Remove 4 dirt blocks to dig the basement footprint (left click to dig)',
      requiredBlocks: [], // removal-based; handled via removePlacedBlock
      removalTargets: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: 1, y: 0, z: 1 }
      ],
      onComplete: () => triggerTaskComplete(
        '⛏️ Excavation done!',
        'You dug below grade. Builders grade the site so water drains away from the structure.'
      )
    },

    // ---------------------------------------------------------- LESSON 8 --
    {
      id: 'footings',
      title: '🪨 Lesson 8: Pour the Footings',
      instruction: 'Place 4 concrete blocks as footings (wider than the foundation walls)',
      requiredBlocks: [
        { x: -1, y: 0, z: 0, type: 'concrete' },
        { x:  2, y: 0, z: 0, type: 'concrete' },
        { x: 0, y: 0, z: -1, type: 'concrete' },
        { x: 0, y: 0, z:  2, type: 'concrete' }
      ],
      onComplete: () => triggerTaskComplete(
        '🪨 Footings poured!',
        'Footings spread the load. They are always wider than the wall they support.'
      )
    },

    // ---------------------------------------------------------- LESSON 9 --
    {
      id: 'damp_proofing',
      title: '💧 Lesson 9: Damp-Proof the Foundation',
      instruction: 'Place 4 iron blocks around the foundation exterior (moisture barrier)',
      requiredBlocks: [
        { x: -2, y: 1, z: 0, type: 'iron' },
        { x:  3, y: 1, z: 0, type: 'iron' },
        { x: 0, y: 1, z: -2, type: 'iron' },
        { x: 0, y: 1, z:  3, type: 'iron' }
      ],
      onComplete: () => triggerTaskComplete(
        '💧 Damp-proofing installed!',
        'Waterproofing keeps groundwater out. Real builders use membranes and drainage boards.'
      )
    },

    // ---------------------------------------------------------- LESSON 10 --
    {
      id: 'framing',
      title: '🪚 Lesson 10: Frame the Floor',
      instruction: 'Place 8 wood blocks as floor joists (parallel, evenly spaced)',
      requiredBlocks: [
        { x: 0, y: 1, z: 0, type: 'wood' },
        { x: 0, y: 1, z: 1, type: 'wood' },
        { x: 0, y: 1, z: 2, type: 'wood' },
        { x: 0, y: 1, z: 3, type: 'wood' },
        { x: 1, y: 1, z: 0, type: 'wood' },
        { x: 1, y: 1, z: 1, type: 'wood' },
        { x: 1, y: 1, z: 2, type: 'wood' },
        { x: 1, y: 1, z: 3, type: 'wood' }
      ],
      onComplete: () => triggerTaskComplete(
        '🪚 Floor framed!',
        'Joists are spaced 16" on center in real construction. That matches standard plywood sheets.'
      )
    },

    // ---------------------------------------------------------- LESSON 11 --
    {
      id: 'subfloor',
      title: '🟫 Lesson 11: Install the Subfloor',
      instruction: 'Place 8 sand blocks on top of the joists (the decking)',
      requiredBlocks: [
        { x: 0, y: 2, z: 0, type: 'sand' },
        { x: 0, y: 2, z: 1, type: 'sand' },
        { x: 0, y: 2, z: 2, type: 'sand' },
        { x: 0, y: 2, z: 3, type: 'sand' },
        { x: 1, y: 2, z: 0, type: 'sand' },
        { x: 1, y: 2, z: 1, type: 'sand' },
        { x: 1, y: 2, z: 2, type: 'sand' },
        { x: 1, y: 2, z: 3, type: 'sand' }
      ],
      onComplete: () => triggerTaskComplete(
        '🟫 Subfloor installed!',
        'Subfloor ties the joists together and gives a flat surface for finish flooring.'
      )
    },

    // ---------------------------------------------------------- LESSON 12 --
    {
      id: 'sheathing',
      title: '🧱 Lesson 12: Sheathe the Exterior',
      instruction: 'Place 6 wood blocks as wall sheathing (OSB on the outside)',
      requiredBlocks: [
        { x: 0, y: 3, z: 0, type: 'wood' },
        { x: 1, y: 3, z: 0, type: 'wood' },
        { x: 0, y: 3, z: 3, type: 'wood' },
        { x: 1, y: 3, z: 3, type: 'wood' },
        { x: 0, y: 4, z: 0, type: 'wood' },
        { x: 0, y: 4, z: 3, type: 'wood' }
      ],
      onComplete: () => triggerTaskComplete(
        '🧱 Sheathing installed!',
        'Sheathing stiffens the frame and provides a nailing base for siding.'
      )
    },

    // ---------------------------------------------------------- LESSON 13 --
    {
      id: 'housewrap',
      title: '🌬️ Lesson 13: Wrap the House',
      instruction: 'Place 4 sand blocks as the weather barrier (house wrap)',
      requiredBlocks: [
        { x: -1, y: 3, z: 0, type: 'sand' },
        { x:  2, y: 3, z: 0, type: 'sand' },
        { x: -1, y: 3, z: 3, type: 'sand' },
        { x:  2, y: 3, z: 3, type: 'sand' }
      ],
      onComplete: () => triggerTaskComplete(
        '🌬️ House wrapped!',
        'House wrap stops air and water but lets vapor escape. It goes UNDER the siding.'
      )
    },

    // ---------------------------------------------------------- LESSON 14 --
    {
      id: 'rough_plumbing',
      title: '🚰 Lesson 14: Rough-In Plumbing',
      instruction: 'Place 4 iron blocks as supply and drain lines (before walls are closed)',
      requiredBlocks: [
        { x: 0, y: 3, z: 1, type: 'iron' },
        { x: 1, y: 3, z: 1, type: 'iron' },
        { x: 0, y: 3, z: 2, type: 'iron' },
        { x: 1, y: 3, z: 2, type: 'iron' }
      ],
      onComplete: () => triggerTaskComplete(
        '🚰 Plumbing roughed in!',
        'Rough-in happens BEFORE drywall. Miss it and you are cutting holes in finished walls.'
      )
    },

    // ---------------------------------------------------------- LESSON 15 --
    {
      id: 'rough_electrical',
      title: '⚡ Lesson 15: Rough-In Electrical',
      instruction: 'Place 4 glass blocks as outlet boxes and wire runs',
      requiredBlocks: [
        { x: 0, y: 4, z: 1, type: 'glass' },
        { x: 1, y: 4, z: 1, type: 'glass' },
        { x: 0, y: 4, z: 2, type: 'glass' },
        { x: 1, y: 4, z: 2, type: 'glass' }
      ],
      onComplete: () => triggerTaskComplete(
        '⚡ Electrical roughed in!',
        'Outlets are 12–18" off the floor, switches 48". Codes dictate every box height.'
      )
    },

    // ---------------------------------------------------------- LESSON 16 --
    {
      id: 'hvac',
      title: '🌡️ Lesson 16: Install HVAC Ducts',
      instruction: 'Place 4 iron blocks as supply ducts and returns',
      requiredBlocks: [
        { x: 0, y: 5, z: 0, type: 'iron' },
        { x: 1, y: 5, z: 0, type: 'iron' },
        { x: 0, y: 5, z: 3, type: 'iron' },
        { x: 1, y: 5, z: 3, type: 'iron' }
      ],
      onComplete: () => triggerTaskComplete(
        '🌡️ HVAC installed!',
        'Duct sizing is critical — too small and the system whistles, too big and it never heats properly.'
      )
    },

    // ---------------------------------------------------------- LESSON 17 --
    {
      id: 'insulation',
      title: '🧊 Lesson 17: Insulate the Walls',
      instruction: 'Place 6 glass blocks as insulation batts between the studs',
      requiredBlocks: [
        { x: 0, y: 3, z: 1, type: 'glass' },
        { x: 1, y: 3, z: 1, type: 'glass' },
        { x: 0, y: 3, z: 2, type: 'glass' },
        { x: 1, y: 3, z: 2, type: 'glass' },
        { x: 0, y: 4, z: 1, type: 'glass' },
        { x: 1, y: 4, z: 1, type: 'glass' }
      ],
      onComplete: () => triggerTaskComplete(
        '🧊 Insulation done!',
        'R-value measures resistance to heat flow. Higher R = better insulation.'
      )
    },

    // ---------------------------------------------------------- LESSON 18 --
    {
      id: 'drywall',
      title: '🧱 Lesson 18: Hang Drywall',
      instruction: 'Place 6 sand blocks as drywall sheets on the interior walls',
      requiredBlocks: [
        { x: 0, y: 3, z: 1, type: 'sand' },
        { x: 1, y: 3, z: 1, type: 'sand' },
        { x: 0, y: 4, z: 1, type: 'sand' },
        { x: 1, y: 4, z: 1, type: 'sand' },
        { x: 0, y: 5, z: 1, type: 'sand' },
        { x: 1, y: 5, z: 1, type: 'sand' }
      ],
      onComplete: () => triggerTaskComplete(
        '🧱 Drywall hung!',
        'Drywall comes in 4×8, 4×10 and 4×12 sheets. Bigger sheets mean fewer seams to finish.'
      )
    },

    // ---------------------------------------------------------- LESSON 19 --
    {
      id: 'tape_mud',
      title: '🖌️ Lesson 19: Tape and Mud',
      instruction: 'Place 4 concrete blocks as joint compound over the drywall seams',
      requiredBlocks: [
        { x: 0, y: 3, z: 0, type: 'concrete' },
        { x: 1, y: 3, z: 0, type: 'concrete' },
        { x: 0, y: 4, z: 0, type: 'concrete' },
        { x: 1, y: 4, z: 0, type: 'concrete' }
      ],
      onComplete: () => triggerTaskComplete(
        '🖌️ Taped and mudded!',
        'Three coats: tape coat, fill coat, finish coat. Each one gets sanded smooth.'
      )
    },

    // ---------------------------------------------------------- LESSON 20 --
    {
      id: 'painting',
      title: '🎨 Lesson 20: Paint the Interior',
      instruction: 'Place 4 glass blocks as a primer + finish coat on the walls',
      requiredBlocks: [
        { x: 0, y: 3, z: 3, type: 'glass' },
        { x: 1, y: 3, z: 3, type: 'glass' },
        { x: 0, y: 4, z: 3, type: 'glass' },
        { x: 1, y: 4, z: 3, type: 'glass' }
      ],
      onComplete: () => triggerTaskComplete(
        '🎨 Painted!',
        'Primer seals the drywall and blocks stains. Two finish coats give an even color.'
      )
    },

    // ---------------------------------------------------------- LESSON 21 --
    {
      id: 'trim',
      title: '🪵 Lesson 21: Install Trim & Baseboard',
      instruction: 'Place 4 wood blocks as baseboard around the room perimeter',
      requiredBlocks: [
        { x: 0, y: 1, z: 0, type: 'wood' },
        { x: 1, y: 1, z: 0, type: 'wood' },
        { x: 0, y: 1, z: 3, type: 'wood' },
        { x: 1, y: 1, z: 3, type: 'wood' }
      ],
      onComplete: () => triggerTaskComplete(
        '🪵 Trim installed!',
        'Cope your inside corners, miter your outside corners. That is the carpenter rule.'
      )
    },

    // ---------------------------------------------------------- LESSON 22 --
    {
      id: 'flooring',
      title: '🟫 Lesson 22: Install Finish Flooring',
      instruction: 'Place 8 wood blocks as hardwood flooring planks',
      requiredBlocks: [
        { x: 0, y: 2, z: 0, type: 'wood' },
        { x: 0, y: 2, z: 1, type: 'wood' },
        { x: 0, y: 2, z: 2, type: 'wood' },
        { x: 0, y: 2, z: 3, type: 'wood' },
        { x: 1, y: 2, z: 0, type: 'wood' },
        { x: 1, y: 2, z: 1, type: 'wood' },
        { x: 1, y: 2, z: 2, type: 'wood' },
        { x: 1, y: 2, z: 3, type: 'wood' }
      ],
      onComplete: () => triggerTaskComplete(
        '🟫 Flooring done!',
        'Acclimate wood flooring for 3–5 days before install. Skip it and the boards gap.'
      )
    },

    // ---------------------------------------------------------- LESSON 23 --
    {
      id: 'cabinets',
      title: '🗄️ Lesson 23: Install Cabinets & Countertops',
      instruction: 'Place 4 concrete blocks as base cabinets and counter surfaces',
      requiredBlocks: [
        { x: 0, y: 3, z: 0, type: 'concrete' },
        { x: 1, y: 3, z: 0, type: 'concrete' },
        { x: 0, y: 4, z: 0, type: 'concrete' },
        { x: 1, y: 4, z: 0, type: 'concrete' }
      ],
      onComplete: () => triggerTaskComplete(
        '🗄️ Cabinets in!',
        'Level the cabinet boxes first, then shim. Never trust the wall to be straight.'
      )
    },

    // ---------------------------------------------------------- LESSON 24 --
    {
      id: 'exterior_finish',
      title: '🏠 Lesson 24: Exterior Siding & Trim',
      instruction: 'Place 6 concrete blocks as siding and exterior trim',
      requiredBlocks: [
        { x: -1, y: 3, z: 1, type: 'concrete' },
        { x:  2, y: 3, z: 1, type: 'concrete' },
        { x: -1, y: 4, z: 1, type: 'concrete' },
        { x:  2, y: 4, z: 1, type: 'concrete' },
        { x: -1, y: 5, z: 1, type: 'concrete' },
        { x:  2, y: 5, z: 1, type: 'concrete' }
      ],
      onComplete: () => triggerTaskComplete(
        '🏠 Exterior finished!',
        'Siding overlaps like shingles — water runs off, never in. Start at the bottom.'
      )
    },

    // ---------------------------------------------------------- LESSON 25 --
    {
      id: 'final_inspection',
      title: '📋 Lesson 25: Final Walkthrough & Inspection',
      instruction: 'Place 4 glass blocks as inspection tags on every major system',
      requiredBlocks: [
        { x: 0, y: 5, z: 0, type: 'glass' },
        { x: 1, y: 5, z: 0, type: 'glass' },
        { x: 0, y: 5, z: 3, type: 'glass' },
        { x: 1, y: 5, z: 3, type: 'glass' }
      ],
      onComplete: () => triggerTaskComplete(
        '🏆 BUILDING COMPLETE! 🎉',
        'From bare lot to finished home. You just walked through a real builder\'s entire sequence!'
      )
    }
  ],

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

export function isStepComplete(step = getCurrentStep()) {
  if (!step) return false;

  // Removal-based lessons (excavation, demolition)
  if (Array.isArray(step.removalTargets) && step.removalTargets.length) {
    return step.removalTargets.every(target =>
      !placedBlocks.some(p => samePosition(p, target))
    );
  }

  if (!Array.isArray(step.requiredBlocks)) return false;
  return step.requiredBlocks.every(req =>
    placedBlocks.some(p => samePosition(p, req))
  );
}

export function getStepProgress(step = getCurrentStep()) {
  if (!step) return { placed: 0, total: 0 };

  if (Array.isArray(step.removalTargets) && step.removalTargets.length) {
    const placed = step.removalTargets.filter(target =>
      !placedBlocks.some(p => samePosition(p, target))
    ).length;
    return { placed, total: step.removalTargets.length };
  }

  if (!Array.isArray(step.requiredBlocks)) return { placed: 0, total: 0 };
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
    existing.type = type;
  } else {
    placedBlocks.push({ x, y, z, type });
  }

  checkStepCompletion();
  return true;
}

export function removePlacedBlock(x, y, z) {
  const index = placedBlocks.findIndex(b => b.x === x && b.y === y && b.z === z);
  if (index === -1) return false;
  placedBlocks.splice(index, 1);
  checkStepCompletion(); // ← added so removal-based lessons can complete
  return true;
}

export function resetPlacedBlocks() {
  placedBlocks.length = 0;
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

export function checkStepCompletion() {
  if (tasks.isComplete) return false;

  const step = getCurrentStep();
  if (!step || !isStepComplete(step)) return false;

  tasks.isComplete = true;

  const stepIndex = tasks.currentStep;
  const isLastStep = stepIndex === tasks.steps.length - 1;

  if (typeof step.onComplete === 'function') {
    try {
      step.onComplete();
    } catch (err) {
      console.error('[tasks] onComplete() failed:', err);
    }
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
  console.log('[tasks] 🎉 All 25 lessons complete!');
}