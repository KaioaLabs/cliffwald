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

export function buildPhysics(world: RAPIER.World, mapData: TiledMapData) {
    if (!mapData || !Array.isArray(mapData.layers)) {
        console.error("MapParser: Invalid map data format.");
        return { spawnPos: { x: 0, y: 0 } };
    }

    // 1. Process Collisions Layer (Object Layer)
    const collisionLayer = mapData.layers.find((l) => l.name === "Collisions" && l.type === "objectgroup");
    
    if (collisionLayer && collisionLayer.objects) {
        collisionLayer.objects.forEach((obj) => {
            if (typeof obj.x !== 'number' || typeof obj.y !== 'number' || typeof obj.width !== 'number' || typeof obj.height !== 'number') {
                console.warn("MapParser: Invalid object skipped", obj);
                return;
            }

            // Tiled objects are usually top-left origin, Rapier expects center
            const width = obj.width;
            const height = obj.height;
            // Calculate center from top-left
            const cx = obj.x + width / 2;
            const cy = obj.y + height / 2;

            const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
                .setTranslation(cx, cy);
            const body = world.createRigidBody(rigidBodyDesc);
            
            const colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2);
            world.createCollider(colliderDesc, body);
        });
    } else {
        console.warn("MapParser: 'Collisions' layer not found or empty.");
    }

    // 2. Process Entities Layer (Spawn points, etc)
    const entitiesLayer = mapData.layers.find((l) => l.name === "Entities" && l.type === "objectgroup");
    let spawnPos = { x: 128, y: 128 }; // Default

    if (entitiesLayer && entitiesLayer.objects) {
        const spawnObj = entitiesLayer.objects.find((obj) => obj.name === "Spawn" || obj.type === "Spawn");
        if (spawnObj) {
            spawnPos = { x: spawnObj.x, y: spawnObj.y };
        }
    }
    
    return {
        spawnPos
    };
}
