// main.js - Import and initialize everything

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { 
    tasks, 
    placedBlocks, 
    addPlacedBlock, 
    removePlacedBlock,
    getCurrentStep,
    getCurrentStepIndex,
    advanceStep,
    resetTasks,
    isTaskComplete,
    setTaskComplete,
    setShowTaskCompleteCallback,
    triggerTaskComplete
} from './tasks.js';
import { 
    createTaskUI, 
    updateTaskUI, 
    showTaskCompleteModal 
} from './ui.js';

// ... (your existing setup code)

// --- Task System Setup ---
let currentStepIndex = 0;

function updateTaskDisplay() {
    const step = getCurrentStep();
    const totalLessons = tasks.steps.length;
    // Store current step for UI
    window.tasksCurrentStep = getCurrentStepIndex();
    updateTaskUI(step, placedBlocks, totalLessons);
}

// Show task complete modal
function handleTaskComplete(title, message) {
    const isLast = getCurrentStepIndex() >= tasks.steps.length - 1;
    
    showTaskCompleteModal(
        title, 
        message,
        () => {
            // On Next/Reset
            if (!isLast) {
                advanceStep();
                setTaskComplete(false);
                updateTaskDisplay();
            } else {
                // Reset the game
                resetGame();
            }
        },
        isLast
    );
}

// Set the callback for task completion
setShowTaskCompleteCallback(handleTaskComplete);

// Reset function
window.resetGame = function() {
    // Remove all blocks from world
    // (you'll need to adapt this to your world.js)
    const keys = Array.from(world.blocks.keys());
    for (const key of keys) {
        const data = world.blocks.get(key);
        scene.remove(data.mesh);
        world.blocks.delete(key);
    }
    resetTasks();
    updateTaskDisplay();
};

// --- Player Interaction ---
renderer.domElement.addEventListener('click', (event) => {
    if (!controls.isLocked) return;
    
    const pos = getBlockPlacePosition();
    if (!pos) return;
    
    const step = getCurrentStep();
    if (!step) return;
    
    // Determine block type based on lesson
    let blockType = 'wood';
    if (step.id === 'foundation') blockType = 'foundation';
    else if (step.id === 'walls' || step.id === 'roof') blockType = 'wood';
    else if (step.id === 'windows') blockType = 'glass';
    else if (step.id === 'door') blockType = 'door';
    
    if (placeBlock(pos, blockType)) {
        addPlacedBlock(Math.round(pos.x), Math.round(pos.y), Math.round(pos.z), blockType);
        updateTaskDisplay();
        checkTaskProgress();
    }
});

function checkTaskProgress() {
    const step = getCurrentStep();
    if (!step || isTaskComplete()) return;
    
    const allPlaced = step.requiredBlocks.every(reqBlock => {
        return placedBlocks.some(placed => 
            placed.x === reqBlock.x && 
            placed.y === reqBlock.y && 
            placed.z === reqBlock.z && 
            placed.type === reqBlock.type
        );
    });
    
    if (allPlaced && !isTaskComplete()) {
        setTaskComplete(true);
        // This will trigger the onComplete callback which calls handleTaskComplete
        if (step.onComplete) {
            step.onComplete();
        }
    }
}

// --- Start ---
createTaskUI();
updateTaskDisplay();

// ... (rest of your game loop)