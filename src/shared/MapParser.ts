import RAPIER from "@dimforge/rapier2d-compat";

// Defines the minimal interface for Tiled JSON that we care about
interface TiledObject {
    name?: string;
    type?: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface TiledLayer {
    name: string;
    type: string;
    objects?: TiledObject[];
}

interface TiledMapData {
    layers: TiledLayer[];
    width?: number;
    height?: number;
    tilewidth?: number;
    tileheight?: number;
}

export interface MapParsingResult {
    spawnPos: { x: number, y: number };
    navGrid: number[][]; // 0 = Walkable, 1 = Wall
    gridWidth: number;
    gridHeight: number;
    tileWidth: number;
    tileheight: number;
}

export function buildPhysics(world: RAPIER.World, mapData: TiledMapData): MapParsingResult {
    if (!mapData || !Array.isArray(mapData.layers)) {
        console.error("MapParser: Invalid map data format.");
        return { spawnPos: { x: 0, y: 0 }, navGrid: [], gridWidth: 0, gridHeight: 0, tileWidth: 0, tileheight: 0 };
    }

    const mapW = mapData.width || 0;
    const mapH = mapData.height || 0;
    const tileW = mapData.tilewidth || 32;
    const tileH = mapData.tileheight || 32;

    // Initialize navGrid with 0s
    const navGrid: number[][] = Array.from({ length: mapH }, () => Array(mapW).fill(0));

    // 1. Process Collisions Layer (Object Layer)
    const collisionLayer = mapData.layers.find((l) => l.name === "Collisions" && l.type === "objectgroup");
    
    if (collisionLayer && collisionLayer.objects) {
        collisionLayer.objects.forEach((obj) => {
            if (typeof obj.x !== 'number' || typeof obj.y !== 'number' || typeof obj.width !== 'number' || typeof obj.height !== 'number') {
                return;
            }

            // A. Rapier Physics (Fixed bodies)
            // Tiled objects in pixels -> Rapier in pixels
            const cx = obj.x + obj.width / 2;
            const cy = obj.y + obj.height / 2;
            const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy);
            const body = world.createRigidBody(rigidBodyDesc);
            const colliderDesc = RAPIER.ColliderDesc.cuboid(obj.width / 2, obj.height / 2);
            world.createCollider(colliderDesc, body);

            // B. Navigation Grid (Mark blocked cells)
            const startX = Math.floor(obj.x / tileW);
            const startY = Math.floor(obj.y / tileH);
            const endX = Math.ceil((obj.x + obj.width) / tileW);
            const endY = Math.ceil((obj.y + obj.height) / tileH);

            for (let y = Math.max(0, startY); y < Math.min(mapH, endY); y++) {
                for (let x = Math.max(0, startX); x < Math.min(mapW, endX); x++) {
                    navGrid[y][x] = 1;
                }
            }
        });
    }

    // 2. Process Entities Layer
    const entitiesLayer = mapData.layers.find((l) => l.name === "Entities" && l.type === "objectgroup");
    let spawnPos = { x: 256, y: 256 };

    if (entitiesLayer && entitiesLayer.objects) {
        const spawnObj = entitiesLayer.objects.find((obj) => obj.name === "Spawn" || obj.type === "Spawn");
        if (spawnObj) {
            spawnPos = { x: spawnObj.x, y: spawnObj.y };
        }
    }
    
    return {
        spawnPos,
        navGrid,
        gridWidth: mapW,
        gridHeight: mapH,
        tileWidth: tileW,
        tileheight: tileH
    };
}
