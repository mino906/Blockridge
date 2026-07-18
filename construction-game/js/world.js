// ============================================================
// world.js — Terrain Generation & Block Management
//
// Responsibilities:
//   1. Generate a Perlin noise heightmap
//   2. Spawn the correct block meshes for each (x, z) column
//   3. Track all placed blocks in a spatial map
//   4. Expose placeBlock() and removeBlock() for player.js to call
// ============================================================

// --- World Configuration ------------------------------------
// Changing these values reshapes the entire world.
// Keep WORLD_SIZE small during development to avoid slowdowns.
const WORLD_CONFIG = {
  SIZE: 40,            // World is SIZE x SIZE blocks wide (40x40 = 1600 blocks)
  MAX_HEIGHT: 6,       // Maximum terrain height above base level
  BASE_HEIGHT: 1,      // Minimum terrain height (flat floor level)
  NOISE_SCALE: 0.12,   // Lower = smoother hills, Higher = more jagged
  BLOCK_SIZE: 1,       // Each block is 1 Babylon unit (1 meter)
};

// --- Spatial Block Map --------------------------------------
// blockMap stores every block currently in the world.
// Key format: "x,y,z" (e.g. "3,1,-5")
// Value: the BABYLON.Mesh object for that block
//
// Why a Map with string keys?
// Because we need O(1) lookups by position — when a player
// clicks to remove a block, we need to find it instantly
// without looping through thousands of meshes.
const blockMap = new Map();

// The Babylon.js scene reference — set in initWorld()
let _scene = null;

// Simplex noise instance — set in initWorld()
let _noise = null;

/**
 * Converts x, y, z integers into the string key used in blockMap.
 * Centralizing this avoids typos like "x,y, z" vs "x,y,z".
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {string}
 */
function toKey(x, y, z) {
  return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
}

/**
 * Samples Perlin noise to decide the terrain height at (x, z).
 * Returns an integer between BASE_HEIGHT and BASE_HEIGHT + MAX_HEIGHT.
 *
 * How Perlin noise works here:
 *   - noise2D returns a float between -1 and 1
 *   - We shift it to 0–1 range, then scale it to our height range
 *
 * @param {number} x - World X coordinate
 * @param {number} z - World Z coordinate
 * @returns {number} integer height (y level of the top block)
 */
function getTerrainHeight(x, z) {
  // Scale the coordinates so the noise doesn't repeat every block
  const noiseValue = _noise.noise2D(x * WORLD_CONFIG.NOISE_SCALE, z * WORLD_CONFIG.NOISE_SCALE);

  // noiseValue is in [-1, 1]; shift to [0, 1]
  const normalized = (noiseValue + 1) / 2;

  // Scale to our height range and floor to an integer
  return Math.floor(normalized * WORLD_CONFIG.MAX_HEIGHT) + WORLD_CONFIG.BASE_HEIGHT;
}

/**
 * Creates a single block mesh at the given world position.
 * Registers it in blockMap so it can be found and removed later.
 *
 * @param {number} x - Grid X (integer)
 * @param {number} y - Grid Y (integer)
 * @param {number} z - Grid Z (integer)
 * @param {string} blockId - Block type id (e.g. "dirt", "grass")
 * @returns {BABYLON.Mesh}
 */
function spawnBlock(x, y, z, blockId) {
  const key = toKey(x, y, z);

  // Don't place a block where one already exists
  if (blockMap.has(key)) return null;

  // CreateBox centers the mesh at the given position.
  // Size 0.99 instead of 1.0 leaves a tiny gap between blocks
  // so you can see individual block edges — important for gameplay clarity.
  const mesh = BABYLON.MeshBuilder.CreateBox(
    `block_${key}`,
    { size: 0.99 },
    _scene
  );

  mesh.position.set(x, y, z);
  mesh.material = getBlockMaterial(blockId);

  // Store metadata on the mesh so we know what type it is later
  // (useful when the player looks at a block and wants to know its type)
  mesh.metadata = { blockId, gridX: x, gridY: y, gridZ: z };

  // Enable per-block picking so raycasts can find individual blocks
  mesh.isPickable = true;

  blockMap.set(key, mesh);
  return mesh;
}

/**
 * Places a block at a grid position. Called by player.js on right-click.
 * Returns false if the position is already occupied.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {string} blockId
 * @returns {boolean} true if placed, false if blocked
 */
function placeBlock(x, y, z, blockId) {
  const key = toKey(x, y, z);
  if (blockMap.has(key)) return false;

  spawnBlock(x, y, z, blockId);
  return true;
}

/**
 * Removes the block at a grid position. Called by player.js on left-click.
 * Returns false if no block exists there.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {boolean} true if removed, false if nothing was there
 */
function removeBlock(x, y, z) {
  const key = toKey(x, y, z);
  const mesh = blockMap.get(key);

  if (!mesh) return false;

  // Dispose releases GPU memory — important for a game with many blocks
  mesh.dispose();
  blockMap.delete(key);
  return true;
}

/**
 * Returns the block mesh at a position, or null if empty.
 * Used by player.js to check for collisions during placement.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {BABYLON.Mesh|null}
 */
function getBlock(x, y, z) {
  return blockMap.get(toKey(x, y, z)) || null;
}

/**
 * Generates the full terrain using Perlin noise and spawns all block meshes.
 * This is the main world-building function — called once from main.js.
 *
 * Generation strategy:
 *   - For each (x, z) column, sample the noise to get a height h
 *   - Place a grass block on top (y = h)
 *   - Fill dirt below it down to y = 0
 *   - Place a stone layer at y = 0 (bedrock-like floor)
 *
 * @param {BABYLON.Scene} scene - The active Babylon.js scene
 */
function initWorld(scene) {
  _scene = scene;

  // Create a new SimplexNoise instance with a random seed
  // so every game session has a unique world layout
  _noise = new SimplexNoise();

  const half = Math.floor(WORLD_CONFIG.SIZE / 2);

  for (let x = -half; x < half; x++) {
    for (let z = -half; z < half; z++) {
      const h = getTerrainHeight(x, z);

      // Top block — visible surface layer
      const surfaceBlock = h > WORLD_CONFIG.BASE_HEIGHT ? "grass" : "dirt";
      spawnBlock(x, h, z, surfaceBlock);

      // Fill downward with dirt layers
      for (let y = h - 1; y > 0; y--) {
        spawnBlock(x, y, z, "dirt");
      }

      // Stone bedrock at ground level
      spawnBlock(x, 0, z, "stone");
    }
  }

  console.log(`[world.js] World generated: ${blockMap.size} blocks across ${WORLD_CONFIG.SIZE}x${WORLD_CONFIG.SIZE} area`);
}