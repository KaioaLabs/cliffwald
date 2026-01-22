import expectations from '../config/QA_Expectations.json';

export class TheCritic {
    check(telemetry: any, tick: number): string[] {
        const issues: string[] = [];

        // 1. Performance
        if (telemetry.fps < 30 && tick > 10) {
            issues.push(`[PERF] Low FPS: ${telemetry.fps}`);
        }
        if (telemetry.ping > 200) {
            issues.push(`[PERF] High Latency: ${telemetry.ping}ms`);
        }

        // 2. Schedule Validation (Every 5s approx)
        if (tick % 5 === 0 && telemetry.environment) {
            const hour = telemetry.environment.hour;
            const isNight = telemetry.environment.isNight;
            
            // Validate Night Cycle (22:00 - 07:00)
            const shouldBeNight = (hour >= 22 || hour < 7);
            if (isNight !== shouldBeNight) {
                issues.push(`[LOGIC] Day/Night Mismatch: Hour ${hour} should be ${shouldBeNight ? 'Night' : 'Day'}`);
            }
        }

        // 3. UI Validation
        if (telemetry.ui) {
            if (telemetry.ui.hasModal && telemetry.player.isAttendingClass) {
                // Expected behavior: Minigame is a modal
            }
        }

        return issues;
    }
}
