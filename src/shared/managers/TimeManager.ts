import { CONFIG } from "../Config";

export class TimeManager {
    private offset: number = 0;
    
    // Returns the virtualized current timestamp
    public getNow(): number {
        return Date.now() + this.offset;
    }

    public getOffset(): number {
        return this.offset;
    }

    public setOffset(ms: number) {
        this.offset = ms;
    }

    public addTime(minutes: number) {
        this.offset += minutes * 60 * 1000;
    }

    public reset() {
        this.offset = 0;
    }

    /**
     * Calculates and sets the offset required to jump to a specific game hour.
     * This handles the non-linear day/night cycle of Cliffwald.
     */
    public setGameHour(targetHour: number) {
        if (targetHour < 0 || targetHour >= 24) return;

        // Current real cycle position
        const now = Date.now();
        const currentCyclePos = now % CONFIG.CYCLE_DURATION_MS;
        
        // Calculate target cycle position
        let targetCyclePos = 0;

        // Logic must match Config.ts getGameTime() reverse:
        // Day: 06:00 to 22:00 (16h) -> 45 mins (2700000ms)
        // Night: 22:00 to 06:00 (8h) -> 15 mins (900000ms)

        // Normalize hour to start at 06:00 for easier calculation
        // 06:00 is minute 0 of the cycle.
        
        // Map 0-24h to linear minutes from 06:00
        // If hour >= 6: (hour - 6) * 60
        // If hour < 6: (18 + hour) * 60 (because 22->24 is 2h, 0->6 is 6h. Total 8h night)
        
        if (targetHour >= 6 && targetHour < 22) {
            // DAY PHASE
            const hoursSince6AM = targetHour - 6;
            // Fraction of day passed (0..1)
            const fraction = hoursSince6AM / 16.0; 
            targetCyclePos = fraction * CONFIG.DAY_PHASE_DURATION_MS;
        } else {
            // NIGHT PHASE
            let hoursSince10PM = 0;
            if (targetHour >= 22) {
                hoursSince10PM = targetHour - 22;
            } else {
                hoursSince10PM = 2 + targetHour; // 2 hours till midnight + hours after midnight
            }
            
            // Fraction of night passed (0..1)
            const fraction = hoursSince10PM / 8.0;
            targetCyclePos = CONFIG.DAY_PHASE_DURATION_MS + (fraction * (CONFIG.CYCLE_DURATION_MS - CONFIG.DAY_PHASE_DURATION_MS));
        }

        // We want (Date.now() + offset) % CYCLE = targetCyclePos
        // (currentCyclePos + offset) % CYCLE = targetCyclePos
        // offset = targetCyclePos - currentCyclePos
        
        let newOffset = targetCyclePos - currentCyclePos;
        
        // Ensure positive forward jump if possible, or nearest
        // Actually, simple subtraction is fine, getGameTime uses modulo.
        // But let's keep it clean so it doesn't jump backwards a whole cycle
        while (newOffset < 0) newOffset += CONFIG.CYCLE_DURATION_MS;

        this.offset = newOffset;
        
        console.log(`[TimeManager] Jumped to ${targetHour}:00. Offset: ${this.offset}ms`);
    }
}

export const timeManager = new TimeManager();
