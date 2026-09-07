tasks.js
function _showCompletion() {
  const el = document.getElementById("task-complete");
  if (el) el.style.display = "block";
  _removeZoneMarkers();
  setTimeout(() => showCompletionScreen(), 1400); // ← is this line here?
}
// tasks.js - Complete Task System with 5 Lessons

export const tasks = {
    currentStep: 0,
    steps: [
        // LESSON 1: FOUNDATION
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
            onComplete: () => {
                showTaskComplete('🎉 Foundation complete!', 'The base is solid. Time to build walls!');
            }
        },
        // LESSON 2: WALLS
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
            onComplete: () => {
                showTaskComplete('🏠 Walls complete!', 'Now let\'s add a roof!');
            }
        },
        // LESSON 3: ROOF
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
            onComplete: () => {
                showTaskComplete('🔺 Roof complete!', 'The house is taking shape. Time for windows!');
            }
        },
        // LESSON 4: WINDOWS
        {
            id: 'windows',
            title: '🪟 Lesson 4: Install Windows',
            instruction: 'Place 2 glass blocks where the windows go (click on the wall faces)',
            requiredBlocks: [
                { x: 0, y: 2, z: -1, type: 'glass' },
                { x: 1, y: 2, z: -1, type: 'glass' }
            ],
            onComplete: () => {
                showTaskComplete('🪟 Windows installed!', 'Now let\'s add a door!');
            }
        },
        // LESSON 5: DOOR
        {
            id: 'door',
            title: '🚪 Lesson 5: Install the Door',
            instruction: 'Place 2 door blocks in the front wall (y=1, y=2)',
            requiredBlocks: [
                { x: 0, y: 1, z: -1, type: 'door' },
                { x: 0, y: 2, z: -1, type: 'door' }
            ],
            onComplete: () => {
                showTaskComplete('🏠 HOUSE COMPLETE! 🎉', 'You built a house from foundation to roof! Great job!');
            }
        }
    ],
    placedBlocks: [],
    isComplete: false
};

// Track placed blocks
export let placedBlocks = [];

export function addPlacedBlock(x, y, z, type) {
    placedBlocks.push({ x, y, z, type });
}

export function removePlacedBlock(x, y, z) {
    const index = placedBlocks.findIndex(b => b.x === x && b.y === y && b.z === z);
    if (index !== -1) {
        placedBlocks.splice(index, 1);
        return true;
    }
    return false;
}

export function resetPlacedBlocks() {
    placedBlocks = [];
}

export function getCurrentStep() {
    return tasks.steps[tasks.currentStep];
}

export function getCurrentStepIndex() {
    return tasks.currentStep;
}

export function advanceStep() {
    if (tasks.currentStep < tasks.steps.length - 1) {
        tasks.currentStep++;
        resetPlacedBlocks();
        tasks.isComplete = false;
        return true;
    }
    return false;
}

export function resetTasks() {
    tasks.currentStep = 0;
    resetPlacedBlocks();
    tasks.isComplete = false;
}

export function isTaskComplete() {
    return tasks.isComplete;
}

export function setTaskComplete(complete) {
    tasks.isComplete = complete;
}

// This will be set from main.js
export let showTaskCompleteCallback = null;

export function setShowTaskCompleteCallback(callback) {
    showTaskCompleteCallback = callback;
}

// Call this when a lesson is complete
export function triggerTaskComplete(title, message) {
    if (showTaskCompleteCallback) {
        showTaskCompleteCallback(title, message);
    }
}

// Update the onComplete callbacks to use the trigger
tasks.steps.forEach(step => {
    const originalComplete = step.onComplete;
    step.onComplete = () => {
        // The step's own message will be shown via the callback
        if (showTaskCompleteCallback) {
            // We'll pass the title and message from the step
            const stepIndex = tasks.steps.indexOf(step);
            const stepData = tasks.steps[stepIndex];
            // The callback will handle showing the modal
            showTaskCompleteCallback(stepData.title, getCompleteMessage(stepData.id));
        }
    };
});

function getCompleteMessage(id) {
    const messages = {
        'foundation': 'The base is solid. Time to build walls!',
        'walls': 'Now let\'s add a roof!',
        'roof': 'The house is taking shape. Time for windows!',
        'windows': 'Now let\'s add a door!',
        'door': 'You built a house from foundation to roof! Great job!'
    };
    return messages[id] || 'Great job!';
}