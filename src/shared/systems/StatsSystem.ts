import { ECSWorld } from "../ecs/world";
import { CONFIG } from "../Config";

export const StatsSystem = (world: ECSWorld) => {
    // Iterate over all entities that have stats
    const entities = world.with("stats", "player");
    
    for (const entity of entities) {
        const { stats } = entity;
        
        // Ensure stats are within valid ranges
        if (stats.hp > stats.maxHp) stats.hp = stats.maxHp;
        if (stats.mp > stats.maxMp) stats.mp = stats.maxMp;
        
        // Level up logic
        if (stats.exp >= stats.expToNext && stats.level < 100) {
            stats.level++;
            stats.exp -= stats.expToNext;
            stats.expToNext = Math.floor(stats.expToNext * 1.5); // Increase required exp
            
            // Increase stats on level up
            stats.maxHp += 10;
            stats.hp = stats.maxHp;
            stats.maxMp += 5;
            stats.mp = stats.maxMp;
            stats.speed += 0.5;
            
            console.log(`[LEVELUP] ${entity.player.sessionId} reached level ${stats.level}!`);
        }
    }
};