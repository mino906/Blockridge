// ============================================================
// world.js — Terrain Generation & Block Management
//
// Responsibilities:
//   1. Generate a flat terrain (no height variation)
//   2. Spawn the correct block meshes for each (x, z) column
//   3. Track all placed blocks in a spatial map
//   4. Expose placeBlock() and removeBlock() for player.js to call
// ============================================================

// --- World Configuration ------------------------------------
const WORLD_CONFIG = {
  SIZE: 40,            // World is SIZE x SIZE blocks wide (40x40 = 1600 blocks)
  MAX_HEIGHT: 6,       // (unused now, kept for future)
  BASE_HEIGHT: 1,      // (unused now, kept for future)
  NOISE_SCALE: 0.12,   // (unused now, kept for future)
  BLOCK_SIZE: 1,       // Each block is 1 Babylon unit (1 meter)
};

// --- Spatial Block Map --------------------------------------
const blockMap = new Map();
let _scene = null;

/**
 * Converts x, y, z integers into the string key used in blockMap.
 */
function toKey(x, y, z) {
  return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
}

/**
 * Returns a constant terrain height – FLAT WORLD.
 * All columns have the same height: 2 blocks above bedrock.
 */
function getTerrainHeight(x, z) {
  // Flat terrain: always return 2 (top surface at y=2)
  return 2;
}

/**
 * Creates a single block mesh at the given world position.
 * Registers it in blockMap so it can be found and removed later.
 */
function spawnBlock(x, y, z, blockId) {
  const key = toKey(x, y, z);
  if (blockMap.has(key)) return null;

  const mesh = BABYLON.MeshBuilder.CreateBox(
    `block_${key}`,
    { size: 0.99 },
    _scene
  );

  mesh.position.set(x, y, z);
  mesh.material = getBlockMaterial(blockId);
  mesh.metadata = { blockId, gridX: x, gridY: y, gridZ: z };
  mesh.isPickable = true;

  blockMap.set(key, mesh);
  return mesh;
}

/**
 * Places a block at a grid position. Called by player.js on right-click.
 */
function placeBlock(x, y, z, blockId) {
  if (blockMap.has(toKey(x, y, z))) return false;
  spawnBlock(x, y, z, blockId);
  GameEvents.emit("blockPlaced", { x, y, z, blockId }); // ADD THIS LINE
  return true;
}

/**
 * Removes the block at a grid position. Called by player.js on left-click.
 */
function removeBlock(x, y, z) {
  const key = toKey(x, y, z);
  const mesh = blockMap.get(key);
  if (!mesh) return false;
  mesh.dispose();
  blockMap.delete(key);
  GameEvents.emit("blockRemoved", { x, y, z }); // ADD THIS LINE
  return true;
}

/**
 * Returns the block mesh at a position, or null if empty.
 */
function getBlock(x, y, z) {
  return blockMap.get(toKey(x, y, z)) || null;
}

/**
 * Generates the full flat terrain.
 * - Grass at y = 2
 * - Dirt at y = 1
 * - Stone at y = 0 (bedrock)
 */
function initWorld(scene) {
  _scene = scene;

  const half = Math.floor(WORLD_CONFIG.SIZE / 2);

  for (let x = -half; x < half; x++) {
    for (let z = -half; z < half; z++) {
      const h = getTerrainHeight(x, z); // always 2

      // Top block: grass
      spawnBlock(x, h, z, "grass");

      // Middle layer: dirt (only if h > 1)
      for (let y = h - 1; y > 0; y--) {
        spawnBlock(x, y, z, "dirt");
      }

      // Bottom layer: stone at y=0
      spawnBlock(x, 0, z, "stone");
    }
  }

  console.log(`[world.js] Flat world generated: ${blockMap.size} blocks across ${WORLD_CONFIG.SIZE}x${WORLD_CONFIG.SIZE} area`);
}