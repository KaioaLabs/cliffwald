import { describe, it, expect, vi } from 'vitest';
import { CONFIG, getAcademicProgress, getGameTime } from '../shared/Config';
import { WorldRoom } from './WorldRoom';
import { Player } from '../shared/SchemaDef';

describe('Phase 1 & 2 Verification', () => {

            describe('Time System (Cyclic Week)', () => {
                let start = Date.now();
                
                it('should have correct GDD time constants', () => {                expect(CONFIG.CYCLE_DURATION_MS).toBe(2700000); // 45 mins
                expect(CONFIG.DAY_PHASE_DURATION_MS).toBe(1800000); // 30 mins
            });
    
            it('should advance 1 Calendar Day every 1 Solar Cycle', () => {
                // Day 1 (Monday)
                let progress = getAcademicProgress(start, start + 100);
                expect(progress.currentDay).toBe(1);
    
                // Day 2 (Tuesday) after 1 Cycle
                progress = getAcademicProgress(start, start + CONFIG.CYCLE_DURATION_MS + 1000);
                expect(progress.currentDay).toBe(2);
            });
            
            it('should cycle back to Monday after 7 Solar Cycles', () => {
                // 7 Cycles = 7 Days = Next Monday
                const progress = getAcademicProgress(start, start + (CONFIG.CYCLE_DURATION_MS * 7) + 1000);
                expect(progress.currentDay).toBe(1); // Back to Monday
            });
    
            it('should advance Narrative Week based on Real Time', () => {
                // Simulate 1 Real Week + 1 second
                const realWeekMs = 7 * 24 * 60 * 60 * 1000;
                const progress = getAcademicProgress(start, start + realWeekMs + 1000);
                
                expect(progress.currentWeek).toBe(2);
                expect(progress.currentMonth).toBe("October");
            });
    
            it('should correctly calculate Day/Night phase', () => {            // Day Phase (0 - 30 mins)
            let time = getGameTime(1000); // 1s
            expect(time.isNight).toBe(false);

            time = getGameTime(CONFIG.DAY_PHASE_DURATION_MS - 1000); // Just before night
            expect(time.isNight).toBe(false);

            // Night Phase (30 - 40 mins)
            time = getGameTime(CONFIG.DAY_PHASE_DURATION_MS + 1000); // Just after night start
            expect(time.isNight).toBe(true);
        });
    });

});