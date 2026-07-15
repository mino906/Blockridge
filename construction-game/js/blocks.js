// ============================================================
// blocks.js — Block Type Definitions
//
// This file is the single source of truth for every block type
// in the game. Adding a new block means adding one entry here.
// No other file needs to change to register a new block type.
// ============================================================

// Each block has:
//   id       — unique string key used throughout the codebase
//   name     — display name shown in the HUD
//   emoji    — icon shown in the block indicator
//   color    — hex color used to create the Babylon.js material
//   hardness — how many clicks to remove (future use, Phase 2+)

const BLOCK_TYPES = {
  dirt: {
    id: "dirt",
    name: "Dirt",
    emoji: "🟫",
    color: "#7a5230",
    hardness: 1,
  },
  grass: {
    id: "grass",
    name: "Grass",
    emoji: "🟩",
    color: "#4a7c3f",
    hardness: 1,
  },
  stone: {
    id: "stone",
    name: "Stone",
    emoji: "⬜",
    color: "#888888",
    hardness: 2,
  },
  concrete: {
    id: "concrete",
    name: "Concrete",
    emoji: "🔲",
    color: "#b0a898",
    hardness: 3,
  },
  wood: {
    id: "wood",
    name: "Wood Plank",
    emoji: "🪵",
    color: "#c8852a",
    hardness: 1,
  },
};

// The two block types available in Phase 1 (hotbar slots 1 and 2)
// More will be unlocked in Phase 2 when the full hotbar is built
const PHASE_1_HOTBAR = ["dirt", "stone"];

// Stores Babylon.js StandardMaterial instances, keyed by block id.
// Materials are created once and reused — this avoids creating a new
// material object for every single block placed in the world.
const blockMaterials = {};

/**
 * Creates and caches Babylon.js materials for all block types.
 * Must be called once after the Babylon.js scene is ready.
 *
 * @param {BABYLON.Scene} scene - The active Babylon.js scene
 */
function initBlockMaterials(scene) {
  Object.values(BLOCK_TYPES).forEach((blockDef) => {
    const mat = new BABYLON.StandardMaterial(`mat_${blockDef.id}`, scene);

    // Convert hex color string to a Babylon.js Color3 object
    mat.diffuseColor = BABYLON.Color3.FromHexString(blockDef.color);

    // Slight ambient light so blocks aren't pitch black on unlit sides
    mat.ambientColor = new BABYLON.Color3(0.2, 0.2, 0.2);

    // Cache it so world.js and player.js can look it up by id
    blockMaterials[blockDef.id] = mat;
  });
}

/**
 * Returns the cached material for a given block id.
 * Throws a clear error if the block type doesn't exist —
 * easier to debug than a silent undefined reference.
 *
 * @param {string} blockId - e.g. "dirt", "stone"
 * @returns {BABYLON.StandardMaterial}
 */
function getBlockMaterial(blockId) {
  const mat = blockMaterials[blockId];
  if (!mat) {
    throw new Error(`[blocks.js] No material found for block id: "${blockId}". Did you call initBlockMaterials() first?`);
  }
  return mat;
}