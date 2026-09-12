// tasks.js — Complete Task System with 25 Lessons (browser-ready)
// ============================================================================
//  LESSONS 1-5:   Original house build (foundation → walls → roof → windows → door)
//  LESSONS 6-25:  Real builder lessons (framing, MEP, finishes, site work)
//
//  Loaded as a plain <script> (no ES modules). Everything is exposed on
//  window.Tasks. Uses GameEvents (defined in the HTML) if present, otherwise
//  creates its own on window.GameEvents.
// ============================================================================

(function () {
  'use strict';

  /* --------------------------------------------------------- GameEvents -- */
  // Reuse the one already defined in the HTML if it exists; otherwise create.
  const GameEvents = window.GameEvents || (function () {
    const listeners = {};
    const api = {
      _listeners: listeners,
      on(event, fn) {
        (listeners[event] = listeners[event] || []).push(fn);
      },
      emit(event, data) {
        (listeners[event] || []).forEach(fn => {
          try { fn(data); } catch (e) { console.error('[GameEvents]', e); }
        });
      },
    };
    window.GameEvents = api;
    return api;
  })();

  const ADVANCE_DELAY = 1400;

  /* ----------------------------------------------------------- state ----- */

  let placedBlocks = [];

  let showTaskCompleteCallback = null;
  let onStepAdvanceCallback   = null;
  let onAllTasksCompleteCallback = null;

  let advanceTimer = null;

  /* ----------------------------------------------------------- helpers --- */

  function samePosition(a, b) {
    return a.x === b.x && a.y === b.y && a.z === b.z;
  }

  function normalizePos(x, y, z) {
    return { x: Math.round(x), y: Math.round(y), z: Math.round(z) };
  }

  /* ----------------------------------------------------------- tasks ----- */

  const tasks = {
    currentStep: 0,
    isComplete: false,
    allComplete: false,

    steps: [
      /* ================================================================== */
      /*  ORIGINAL 5 LESSONS                                                */
      /* ================================================================== */

      // --------------------------------------------------------- LESSON 1 --
      {
        id: 'foundation',
        title: '🏗️ Lesson 1: Lay the Foundation',
        instruction: 'Place 4 concrete blocks in a 2×2 square at ground level (y=1).',
        requiredBlocks: [
          { x: 0, y: 1, z: 0, type: 'concrete' },
          { x: 1, y: 1, z: 0, type: 'concrete' },
          { x: 0, y: 1, z: 1, type: 'concrete' },
          { x: 1, y: 1, z: 1, type: 'concrete' },
        ],
        learned: [
          'Foundations transfer the weight of a building into the ground',
          'Concrete is strong under compression — perfect for footings',
          'A level, square base prevents the whole structure from twisting',
        ],
        onComplete: () => triggerTaskComplete(
          '🎉 Foundation complete!',
          'The base is solid. Time to build walls!'
        ),
      },

      // --------------------------------------------------------- LESSON 2 --
      {
        id: 'walls',
        title: '🧱 Lesson 2: Build the Walls',
        instruction: 'Place 12 wood blocks — 3 high around the 2×2 footprint.',
        requiredBlocks: [
          { x: 0, y: 2, z: 0, type: 'wood' },
          { x: 0, y: 3, z: 0, type: 'wood' },
          { x: 0, y: 4, z: 0, type: 'wood' },
          { x: 1, y: 2, z: 0, type: 'wood' },
          { x: 1, y: 3, z: 0, type: 'wood' },
          { x: 1, y: 4, z: 0, type: 'wood' },
          { x: 0, y: 2, z: 1, type: 'wood' },
          { x: 0, y: 3, z: 1, type: 'wood' },
          { x: 0, y: 4, z: 1, type: 'wood' },
          { x: 1, y: 2, z: 1, type: 'wood' },
          { x: 1, y: 3, z: 1, type: 'wood' },
          { x: 1, y: 4, z: 1, type: 'wood' },
        ],
        learned: [
          'Walls transfer roof and floor loads into the foundation',
          'Each course of blocks must be level before the next goes on',
          'Walls are only as straight as the foundation under them',
        ],
        onComplete: () => triggerTaskComplete(
          '🏠 Walls complete!',
          "Now let's add a roof!"
        ),
      },

      // --------------------------------------------------------- LESSON 3 --
      {
        id: 'roof',
        title: '🔺 Lesson 3: Add the Roof',
        instruction: 'Place 6 wood blocks in a pyramid (3-2-1) on top of the walls.',
        requiredBlocks: [
          { x: 0, y: 5, z: 0, type: 'wood' },
          { x: 1, y: 5, z: 0, type: 'wood' },
          { x: 0, y: 5, z: 1, type: 'wood' },
          { x: 0, y: 6, z: 0, type: 'wood' },
          { x: 1, y: 6, z: 0, type: 'wood' },
          { x: 0, y: 7, z: 0, type: 'wood' },
        ],
        learned: [
          'Roofs shed water — the pyramid shape is the simplest pitched roof',
          'Rafters must rest on load-bearing walls, never on partitions',
        ],
        onComplete: () => triggerTaskComplete(
          '🔺 Roof complete!',
          'The house is taking shape. Time for windows!'
        ),
      },

      // --------------------------------------------------------- LESSON 4 --
      {
        id: 'windows',
        title: '🪟 Lesson 4: Install Windows',
        instruction: 'Place 2 glass blocks in the front wall at y=4.',
        requiredBlocks: [
          { x: 0, y: 4, z: -1, type: 'glass' },
          { x: 1, y: 4, z: -1, type: 'glass' },
        ],
        learned: [
          'Headers above openings carry the load around the window',
          'Windows are placed between studs at the framing stage',
        ],
        onComplete: () => triggerTaskComplete(
          '🪟 Windows installed!',
          "Now let's add a door!"
        ),
      },

      // --------------------------------------------------------- LESSON 5 --
      {
        id: 'door',
        title: '🚪 Lesson 5: Install the Door',
        instruction: 'Place 2 door blocks in the front wall at y=2 and y=3.',
        requiredBlocks: [
          { x: 0, y: 2, z: -1, type: 'door' },
          { x: 0, y: 3, z: -1, type: 'door' },
        ],
        learned: [
          'Doors are hung after the frame is plumb and square',
          'A door needs a solid rough opening — never cut into a header',
        ],
        onComplete: () => triggerTaskComplete(
          '🏠 HOUSE COMPLETE! 🎉',
          'You built a house from foundation to roof! Great job!'
        ),
      },

      /* ================================================================== */
      /*  20 REAL BUILDER LESSONS                                           */
      /* ================================================================== */

      {
        id: 'site_layout',
        title: '📐 Lesson 6: Site Layout & Staking',
        instruction: 'Place 4 stone blocks to mark the building corners.',
        requiredBlocks: [
          { x: -2, y: 1, z: -2, type: 'stone' },
          { x:  3, y: 1, z: -2, type: 'stone' },
          { x: -2, y: 1, z:  3, type: 'stone' },
          { x:  3, y: 1, z:  3, type: 'stone' },
        ],
        learned: [
          'Corners are staked and squared before any digging',
          'Builders check diagonals to confirm a true 90° angle',
        ],
        onComplete: () => triggerTaskComplete(
          '📐 Site laid out!',
          'Corners are staked and square. Real builders check diagonals.'
        ),
      },

      {
        id: 'excavation',
        title: '⛏️ Lesson 7: Excavation & Grading',
        instruction: 'Remove 4 grass blocks to dig the basement footprint (left click).',
        requiredBlocks: [],
        removalTargets: [
          { x: 0, y: 1, z: 0 },
          { x: 1, y: 1, z: 0 },
          { x: 0, y: 1, z: 1 },
          { x: 1, y: 1, z: 1 },
        ],
        learned: [
          'Excavation reaches stable, load-bearing soil',
          'Site grading directs water away from the structure',
        ],
        onComplete: () => triggerTaskComplete(
          '⛏️ Excavation done!',
          'You dug below grade. Water now drains away from the structure.'
        ),
      },

      {
        id: 'footings',
        title: '🪨 Lesson 8: Pour the Footings',
        instruction: 'Place 4 concrete blocks as footings (wider than the walls).',
        requiredBlocks: [
          { x: -1, y: 1, z: 0, type: 'concrete' },
          { x:  2, y: 1, z: 0, type: 'concrete' },
          { x: 0, y: 1, z: -1, type: 'concrete' },
          { x: 0, y: 1, z:  2, type: 'concrete' },
        ],
        learned: [
          'Footings spread the load over a wider area',
          'Footings are always wider than the wall they support',
        ],
        onComplete: () => triggerTaskComplete(
          '🪨 Footings poured!',
          'Footings spread the load. They are always wider than the wall.'
        ),
      },

      {
        id: 'damp_proofing',
        title: '💧 Lesson 9: Damp-Proof the Foundation',
        instruction: 'Place 4 iron blocks around the foundation exterior.',
        requiredBlocks: [
          { x: -2, y: 2, z: 0, type: 'iron' },
          { x:  3, y: 2, z: 0, type: 'iron' },
          { x: 0, y: 2, z: -2, type: 'iron' },
          { x: 0, y: 2, z:  3, type: 'iron' },
        ],
        learned: [
          'Waterproofing keeps groundwater out of the basement',
          'Drainage boards channel water down to a footing drain',
        ],
        onComplete: () => triggerTaskComplete(
          '💧 Damp-proofing installed!',
          'Waterproofing keeps groundwater out of the foundation.'
        ),
      },

      {
        id: 'framing',
        title: '🪚 Lesson 10: Frame the Floor',
        instruction: 'Place 8 wood blocks as floor joists (parallel and evenly spaced).',
        requiredBlocks: [
          { x: 0, y: 2, z: 0, type: 'wood' },
          { x: 0, y: 2, z: 1, type: 'wood' },
          { x: 0, y: 2, z: 2, type: 'wood' },
          { x: 0, y: 2, z: 3, type: 'wood' },
          { x: 1, y: 2, z: 0, type: 'wood' },
          { x: 1, y: 2, z: 1, type: 'wood' },
          { x: 1, y: 2, z: 2, type: 'wood' },
          { x: 1, y: 2, z: 3, type: 'wood' },
        ],
        learned: [
          'Joists are spaced 16" on center in standard construction',
          'That spacing matches 4×8 plywood sheets perfectly',
        ],
        onComplete: () => triggerTaskComplete(
          '🪚 Floor framed!',
          'Joists are spaced 16" on center in real construction.'
        ),
      },

      {
        id: 'subfloor',
        title: '🟫 Lesson 11: Install the Subfloor',
        instruction: 'Place 8 sand blocks on top of the joists (the decking).',
        requiredBlocks: [
          { x: 0, y: 3, z: 0, type: 'sand' },
          { x: 0, y: 3, z: 1, type: 'sand' },
          { x: 0, y: 3, z: 2, type: 'sand' },
          { x: 0, y: 3, z: 3, type: 'sand' },
          { x: 1, y: 3, z: 0, type: 'sand' },
          { x: 1, y: 3, z: 1, type: 'sand' },
          { x: 1, y: 3, z: 2, type: 'sand' },
          { x: 1, y: 3, z: 3, type: 'sand' },
        ],
        learned: [
          'Subfloor ties joists together and stiffens the floor',
          'It gives a flat surface for finish flooring',
        ],
        onComplete: () => triggerTaskComplete(
          '🟫 Subfloor installed!',
          'Subfloor ties the joists together and gives a flat surface.'
        ),
      },

      {
        id: 'sheathing',
        title: '🧱 Lesson 12: Sheathe the Exterior',
        instruction: 'Place 6 wood blocks as wall sheathing (OSB on the outside).',
        requiredBlocks: [
          { x: 0, y: 4, z: 0, type: 'wood' },
          { x: 1, y: 4, z: 0, type: 'wood' },
          { x: 0, y: 4, z: 3, type: 'wood' },
          { x: 1, y: 4, z: 3, type: 'wood' },
          { x: 0, y: 5, z: 0, type: 'wood' },
          { x: 0, y: 5, z: 3, type: 'wood' },
        ],
        learned: [
          'Sheathing stiffens the frame against wind and shear',
          'It provides a nailing base for siding',
        ],
        onComplete: () => triggerTaskComplete(
          '🧱 Sheathing installed!',
          'Sheathing stiffens the frame and provides a nailing base.'
        ),
      },

      {
        id: 'housewrap',
        title: '🌬️ Lesson 13: Wrap the House',
        instruction: 'Place 4 sand blocks as the weather barrier (house wrap).',
        requiredBlocks: [
          { x: -1, y: 4, z: 0, type: 'sand' },
          { x:  2, y: 4, z: 0, type: 'sand' },
          { x: -1, y: 4, z: 3, type: 'sand' },
          { x:  2, y: 4, z: 3, type: 'sand' },
        ],
        learned: [
          'House wrap stops air and water but lets vapor escape',
          'It goes UNDER the siding, never over it',
        ],
        onComplete: () => triggerTaskComplete(
          '🌬️ House wrapped!',
          'House wrap stops air and water but lets vapor escape.'
        ),
      },

      {
        id: 'rough_plumbing',
        title: '🚰 Lesson 14: Rough-In Plumbing',
        instruction: 'Place 4 iron blocks as supply and drain lines (before walls are closed).',
        requiredBlocks: [
          { x: 0, y: 4, z: 1, type: 'iron' },
          { x: 1, y: 4, z: 1, type: 'iron' },
          { x: 0, y: 4, z: 2, type: 'iron' },
          { x: 1, y: 4, z: 2, type: 'iron' },
        ],
        learned: [
          'Rough-in happens BEFORE drywall',
          'Miss it and you are cutting holes in finished walls',
        ],
        onComplete: () => triggerTaskComplete(
          '🚰 Plumbing roughed in!',
          'Rough-in happens BEFORE drywall is hung.'
        ),
      },

      {
        id: 'rough_electrical',
        title: '⚡ Lesson 15: Rough-In Electrical',
        instruction: 'Place 4 glass blocks as outlet boxes and wire runs.',
        requiredBlocks: [
          { x: 0, y: 5, z: 1, type: 'glass' },
          { x: 1, y: 5, z: 1, type: 'glass' },
          { x: 0, y: 5, z: 2, type: 'glass' },
          { x: 1, y: 5, z: 2, type: 'glass' },
        ],
        learned: [
          'Outlets are 12–18" off the floor, switches 48"',
          'Codes dictate every box height and wire gauge',
        ],
        onComplete: () => triggerTaskComplete(
          '⚡ Electrical roughed in!',
          'Outlets are 12–18" off the floor, switches 48".'
        ),
      },

      {
        id: 'hvac',
        title: '🌡️ Lesson 16: Install HVAC Ducts',
        instruction: 'Place 4 iron blocks as supply ducts and returns.',
        requiredBlocks: [
          { x: 0, y: 6, z: 0, type: 'iron' },
          { x: 1, y: 6, z: 0, type: 'iron' },
          { x: 0, y: 6, z: 3, type: 'iron' },
          { x: 1, y: 6, z: 3, type: 'iron' },
        ],
        learned: [
          'Duct sizing is critical for system performance',
          'Too small whistles, too big never heats properly',
        ],
        onComplete: () => triggerTaskComplete(
          '🌡️ HVAC installed!',
          'Duct sizing is critical — too small whistles, too big never heats.'
        ),
      },

      {
        id: 'insulation',
        title: '🧊 Lesson 17: Insulate the Walls',
        instruction: 'Place 6 glass blocks as insulation batts between the studs.',
        requiredBlocks: [
          { x: 0, y: 4, z: 1, type: 'glass' },
          { x: 1, y: 4, z: 1, type: 'glass' },
          { x: 0, y: 4, z: 2, type: 'glass' },
          { x: 1, y: 4, z: 2, type: 'glass' },
          { x: 0, y: 5, z: 1, type: 'glass' },
          { x: 1, y: 5, z: 1, type: 'glass' },
        ],
        learned: [
          'R-value measures resistance to heat flow',
          'Higher R = better insulation',
        ],
        onComplete: () => triggerTaskComplete(
          '🧊 Insulation done!',
          'R-value measures resistance to heat flow.'
        ),
      },

      {
        id: 'drywall',
        title: '🧱 Lesson 18: Hang Drywall',
        instruction: 'Place 6 sand blocks as drywall sheets on the interior walls.',
        requiredBlocks: [
          { x: 0, y: 4, z: 1, type: 'sand' },
          { x: 1, y: 4, z: 1, type: 'sand' },
          { x: 0, y: 5, z: 1, type: 'sand' },
          { x: 1, y: 5, z: 1, type: 'sand' },
          { x: 0, y: 6, z: 1, type: 'sand' },
          { x: 1, y: 6, z: 1, type: 'sand' },
        ],
        learned: [
          'Drywall comes in 4×8, 4×10 and 4×12 sheets',
          'Bigger sheets mean fewer seams to finish',
        ],
        onComplete: () => triggerTaskComplete(
          '🧱 Drywall hung!',
          'Drywall comes in 4×8, 4×10 and 4×12 sheets.'
        ),
      },

      {
        id: 'tape_mud',
        title: '🖌️ Lesson 19: Tape and Mud',
        instruction: 'Place 4 concrete blocks as joint compound over the drywall seams.',
        requiredBlocks: [
          { x: 0, y: 4, z: 0, type: 'concrete' },
          { x: 1, y: 4, z: 0, type: 'concrete' },
          { x: 0, y: 5, z: 0, type: 'concrete' },
          { x: 1, y: 5, z: 0, type: 'concrete' },
        ],
        learned: [
          'Three coats: tape, fill, finish',
          'Each coat gets sanded smooth before the next',
        ],
        onComplete: () => triggerTaskComplete(
          '🖌️ Taped and mudded!',
          'Three coats: tape coat, fill coat, finish coat.'
        ),
      },

      {
        id: 'painting',
        title: '🎨 Lesson 20: Paint the Interior',
        instruction: 'Place 4 glass blocks as a primer + finish coat on the walls.',
        requiredBlocks: [
          { x: 0, y: 4, z: 3, type: 'glass' },
          { x: 1, y: 4, z: 3, type: 'glass' },
          { x: 0, y: 5, z: 3, type: 'glass' },
          { x: 1, y: 5, z: 3, type: 'glass' },
        ],
        learned: [
          'Primer seals the drywall and blocks stains',
          'Two finish coats give an even color',
        ],
        onComplete: () => triggerTaskComplete(
          '🎨 Painted!',
          'Primer seals the drywall and blocks stains.'
        ),
      },

      {
        id: 'trim',
        title: '🪵 Lesson 21: Install Trim & Baseboard',
        instruction: 'Place 4 wood blocks as baseboard around the room perimeter.',
        requiredBlocks: [
          { x: 0, y: 2, z: 0, type: 'wood' },
          { x: 1, y: 2, z: 0, type: 'wood' },
          { x: 0, y: 2, z: 3, type: 'wood' },
          { x: 1, y: 2, z: 3, type: 'wood' },
        ],
        learned: [
          'Cope inside corners, miter outside corners',
          'That is the carpenter rule for tight joints',
        ],
        onComplete: () => triggerTaskComplete(
          '🪵 Trim installed!',
          'Cope your inside corners, miter your outside corners.'
        ),
      },

      {
        id: 'flooring',
        title: '🟫 Lesson 22: Install Finish Flooring',
        instruction: 'Place 8 wood blocks as hardwood flooring planks.',
        requiredBlocks: [
          { x: 0, y: 3, z: 0, type: 'wood' },
          { x: 0, y: 3, z: 1, type: 'wood' },
          { x: 0, y: 3, z: 2, type: 'wood' },
          { x: 0, y: 3, z: 3, type: 'wood' },
          { x: 1, y: 3, z: 0, type: 'wood' },
          { x: 1, y: 3, z: 1, type: 'wood' },
          { x: 1, y: 3, z: 2, type: 'wood' },
          { x: 1, y: 3, z: 3, type: 'wood' },
        ],
        learned: [
          'Acclimate wood flooring 3–5 days before install',
          'Skip it and the boards gap as they dry',
        ],
        onComplete: () => triggerTaskComplete(
          '🟫 Flooring done!',
          'Acclimate wood flooring for 3–5 days before install.'
        ),
      },

      {
        id: 'cabinets',
        title: '🗄️ Lesson 23: Install Cabinets & Countertops',
        instruction: 'Place 4 concrete blocks as base cabinets and counter surfaces.',
        requiredBlocks: [
          { x: 0, y: 4, z: 0, type: 'concrete' },
          { x: 1, y: 4, z: 0, type: 'concrete' },
          { x: 0, y: 5, z: 0, type: 'concrete' },
          { x: 1, y: 5, z: 0, type: 'concrete' },
        ],
        learned: [
          'Level the cabinet boxes first, then shim',
          'Never trust the wall to be straight',
        ],
        onComplete: () => triggerTaskComplete(
          '🗄️ Cabinets in!',
          'Level the cabinet boxes first, then shim.'
        ),
      },

      {
        id: 'exterior_finish',
        title: '🏠 Lesson 24: Exterior Siding & Trim',
        instruction: 'Place 6 concrete blocks as siding and exterior trim.',
        requiredBlocks: [
          { x: -1, y: 4, z: 1, type: 'concrete' },
          { x:  2, y: 4, z: 1, type: 'concrete' },
          { x: -1, y: 5, z: 1, type: 'concrete' },
          { x:  2, y: 5, z: 1, type: 'concrete' },
          { x: -1, y: 6, z: 1, type: 'concrete' },
          { x:  2, y: 6, z: 1, type: 'concrete' },
        ],
        learned: [
          'Siding overlaps like shingles — water runs off, never in',
          'Start at the bottom course and work up',
        ],
        onComplete: () => triggerTaskComplete(
          '🏠 Exterior finished!',
          'Siding overlaps like shingles — water runs off, never in.'
        ),
      },

      {
        id: 'final_inspection',
        title: '📋 Lesson 25: Final Walkthrough & Inspection',
        instruction: 'Place 4 glass blocks as inspection tags on every major system.',
        requiredBlocks: [
          { x: 0, y: 6, z: 0, type: 'glass' },
          { x: 1, y: 6, z: 0, type: 'glass' },
          { x: 0, y: 6, z: 3, type: 'glass' },
          { x: 1, y: 6, z: 3, type: 'glass' },
        ],
        learned: [
          'A final walkthrough checks every system before handover',
          'Each trade signs off on their own inspection tag',
        ],
        onComplete: () => triggerTaskComplete(
          '🏆 BUILDING COMPLETE! 🎉',
          "From bare lot to finished home. You just walked through a real builder's entire sequence!"
        ),
      },
    ],

    get placedBlocks() { return placedBlocks; },
    set placedBlocks(value) { placedBlocks = Array.isArray(value) ? value : []; },
  };

  /* ----------------------------------------------------------- queries -- */

  function getCurrentStep() {
    return tasks.steps[tasks.currentStep] || null;
  }

  function getCurrentStepIndex() {
    return tasks.currentStep;
  }

  function isStepComplete(step = getCurrentStep()) {
    if (!step) return false;

    // Removal-based lessons (excavation, demolition)
    if (Array.isArray(step.removalTargets) && step.removalTargets.length) {
      return step.removalTargets.every(target =>
        !placedBlocks.some(p => samePosition(p, target))
      );
    }

    if (!Array.isArray(step.requiredBlocks) || !step.requiredBlocks.length) return false;
    return step.requiredBlocks.every(req =>
      placedBlocks.some(p => samePosition(p, req))
    );
  }

  function getStepProgress(step = getCurrentStep()) {
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

  function isTaskComplete() {
    return tasks.isComplete;
  }

  function setTaskComplete(complete) {
    tasks.isComplete = !!complete;
  }

  /* ---------------------------------------------------- block tracking -- */

  function addPlacedBlock(x, y, z, type) {
    const pos = normalizePos(x, y, z);
    const existing = placedBlocks.find(b => samePosition(b, pos));

    if (existing) {
      existing.type = type;
    } else {
      placedBlocks.push({ x: pos.x, y: pos.y, z: pos.z, type });
    }

    checkStepCompletion();
    return true;
  }

  function removePlacedBlock(x, y, z) {
    const pos = normalizePos(x, y, z);
    const index = placedBlocks.findIndex(b => samePosition(b, pos));
    if (index === -1) return false;
    placedBlocks.splice(index, 1);
    checkStepCompletion(); // removal-based lessons can complete
    return true;
  }

  function resetPlacedBlocks() {
    placedBlocks.length = 0;
  }

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

  const checkTaskProgress = checkStepCompletion;

  /* ---------------------------------------------------- completion hooks */

  function setShowTaskCompleteCallback(callback) {
    showTaskCompleteCallback = typeof callback === 'function' ? callback : null;
  }

  function setOnStepAdvanceCallback(callback) {
    onStepAdvanceCallback = typeof callback === 'function' ? callback : null;
  }

  function setOnAllTasksComplete(callback) {
    onAllTasksCompleteCallback = typeof callback === 'function' ? callback : null;
  }

  function triggerTaskComplete(title, message) {
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

  /* ------------------------------------------------------- public API --- */

  window.Tasks = {
    ADVANCE_DELAY,
    tasks,
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

  console.log('[tasks] 25-lesson task system loaded ✅');
})();