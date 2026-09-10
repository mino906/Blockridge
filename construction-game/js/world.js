// ============================================================
// world.js — Terrain Generation & Block Management
// Features: flat terrain, 50 underground layers, mesh culling
// Only surface-exposed blocks get GPU meshes. Underground
// blocks are data-only until the player digs to them.
// ============================================================

const WORLD_CONFIG = {
  SIZE:         40,
  SURFACE_Y:    2,    // grass level
  UNDERGROUND: -50,   // deepest layer
};

// blockMap stores { blockId, mesh } per position
// mesh is null for hidden/culled blocks
const blockMap = new Map();
let _scene = null;

// The 6 face directions — used for neighbor checks
const _DIRS = [
  [ 1, 0, 0], [-1, 0, 0],
  [ 0, 1, 0], [ 0,-1, 0],
  [ 0, 0, 1], [ 0, 0,-1],
];

function toKey(x, y, z) {
  return Math.round(x) + "," + Math.round(y) + "," + Math.round(z);
}

// ── Mesh Creation ───────────────────────────────────────────
// Creates a Babylon mesh for one block. Only called when the
// block is confirmed to be exposed to at least one air face.
function _createMesh(x, y, z, blockId) {
  const key  = toKey(x, y, z);
  const data = blockMap.get(key);
  if (!data || data.mesh) return; // already has mesh or doesn't exist

  const mat     = getBlockMaterial(blockId);
  const isMulti = mat instanceof BABYLON.MultiMaterial;
  const options = { size: 0.99 };

  if (isMulti) {
    const uv = new BABYLON.Vector4(0, 0, 1, 1);
    options.faceUV = [uv, uv, uv, uv, uv, uv];
  }

  const mesh = BABYLON.MeshBuilder.CreateBox(
    "block_" + key, options, _scene
  );
  mesh.position.set(x, y, z);
  mesh.material   = mat;
  mesh.isPickable = true;
  mesh.metadata   = { blockId, gridX: x, gridY: y, gridZ: z };

  if (isMulti) {
    mesh.subMeshes = [];
    const vc = mesh.getTotalVertices();
    for (let i = 0; i < 6; i++) {
      new BABYLON.SubMesh(i, 0, vc, i * 6, 6, mesh);
    }
  }

  data.mesh = mesh;
}

// ── Exposure Check ──────────────────────────────────────────
// Returns true if at least one neighbor is air (no block data)
function _isExposed(x, y, z) {
  return _DIRS.some(([dx, dy, dz]) =>
    !blockMap.has(toKey(x + dx, y + dy, z + dz))
  );
}

// ── spawnBlock ──────────────────────────────────────────────
// Registers a block in blockMap. Only creates a mesh if the
// block is exposed. Called during world generation AND by
// placeBlock() for player-placed blocks.
function spawnBlock(x, y, z, blockId) {
  const key = toKey(x, y, z);
  if (blockMap.has(key)) return null;

  // Register as data first (mesh = null)
  blockMap.set(key, { blockId, mesh: null });

  // Only render if exposed to air
  if (_isExposed(x, y, z)) {
    _createMesh(x, y, z, blockId);
  }

  return blockMap.get(key);
}

// ── placeBlock ──────────────────────────────────────────────
// Called by player right-click. Places a block and hides any
// neighbor meshes that are now fully surrounded.
function placeBlock(x, y, z, blockId) {
  if (blockMap.has(toKey(x, y, z))) return false;

  spawnBlock(x, y, z, blockId);
  GameEvents.emit("blockPlaced", { x, y, z, blockId });

  // Neighbors may now be fully enclosed — remove their meshes
  _DIRS.forEach(([dx, dy, dz]) => {
    const nx = x + dx, ny = y + dy, nz = z + dz;
    const nData = blockMap.get(toKey(nx, ny, nz));
    if (nData && nData.mesh && !_isExposed(nx, ny, nz)) {
      nData.mesh.dispose();
      nData.mesh = null;
    }
  });

  return true;
}

// ── removeBlock ─────────────────────────────────────────────
// Called by player left-click. Removes block and reveals any
// neighbors that are now exposed for the first time.
function removeBlock(x, y, z) {
  const key  = toKey(x, y, z);
  const data = blockMap.get(key);
  if (!data) return false;

  // Dispose mesh if it exists
  if (data.mesh) {
    data.mesh.dispose();
    data.mesh = null;
  }
  blockMap.delete(key);

  GameEvents.emit("blockRemoved", { x, y, z });

  // Reveal neighbors that were hidden by this block
  _DIRS.forEach(([dx, dy, dz]) => {
    const nx = x + dx, ny = y + dy, nz = z + dz;
    const nData = blockMap.get(toKey(nx, ny, nz));
    if (nData && !nData.mesh) {
      // Was hidden — now exposed, give it a mesh
      _createMesh(nx, ny, nz, nData.blockId);
    }
  });

  return true;
}

// ── getBlock ────────────────────────────────────────────────
// Returns the mesh if it exists, or null.
// player.js uses this for ground detection.
function getBlock(x, y, z) {
  const data = blockMap.get(toKey(x, y, z));
  // Return mesh OR a truthy value so ground detection works
  // even for culled (mesh-less) blocks
  return data ? (data.mesh || data) : null;
}

// ── initWorld ───────────────────────────────────────────────
// Generates the flat world with 50 underground layers.
// Generation order matters — we build bottom-up so that
// neighbor checks during spawnBlock work correctly.
function initWorld(scene) {
  _scene = scene;
  const half = Math.floor(WORLD_CONFIG.SIZE / 2);

  for (let x = -half; x < half; x++) {
    for (let z = -half; z < half; z++) {

      // Underground layers first (deepest to surface)
      // These will all be culled — fully surrounded on all sides
      for (let y = WORLD_CONFIG.UNDERGROUND; y < 0; y++) {
        spawnBlock(x, y, z, "stone");
      }

      // y=0 stone layer
      spawnBlock(x, 0, z, "stone");

      // y=1 dirt layer
      spawnBlock(x, 1, z, "dirt");

      // y=2 grass surface — always exposed on top
      spawnBlock(x, 2, z, "grass");
    }
  }

  const total    = blockMap.size;
  const rendered = [...blockMap.values()].filter(d => d.mesh).length;
  console.log(
    "[world] " + total + " blocks total, " +
    rendered + " meshes rendered, " +
    (total - rendered) + " culled underground"
  );
}