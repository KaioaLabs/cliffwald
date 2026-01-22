import { ROUTES, RouteStep } from '../config/PatrolRoutes';
import { TheUser } from './TheUser';

export class TheExplorer {
    private user: TheUser;
    private currentRoute: RouteStep[] = [];
    private routeIndex = 0;
    private lastPos = { x: 0, y: 0 };
    private stuckFrames = 0;

    constructor(user: TheUser) {
        this.user = user;
    }

    startPatrol(routeName: string) {
        if (ROUTES[routeName]) {
            this.currentRoute = ROUTES[routeName];
            this.routeIndex = 0;
            return true;
        }
        return false;
    }

    async update(currentPos: {x: number, y: number}) {
        if (this.currentRoute.length === 0) return 'IDLE';

        if (this.routeIndex >= this.currentRoute.length) {
            this.routeIndex = 0; // Loop route
            return 'COMPLETED';
        }

        const step = this.currentRoute[this.routeIndex];
        const dx = step.target.x - currentPos.x;
        const dy = step.target.y - currentPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Stuck Detection
        if (Math.abs(currentPos.x - this.lastPos.x) < 2 && Math.abs(currentPos.y - this.lastPos.y) < 2) {
            this.stuckFrames++;
        } else {
            this.stuckFrames = 0;
        }
        this.lastPos = { ...currentPos };

        if (this.stuckFrames > 15) {
            this.stuckFrames = 0;
            return 'STUCK';
        }

        if (dist < 100) {
            const arrivedAt = step.name;
            this.routeIndex++;
            return `ARRIVED_${arrivedAt}`;
        } else {
            await this.user.walkTo(dx, dy);
            return 'MOVING';
        }
    }

    getCurrentStep() {
        return this.currentRoute[this.routeIndex];
    }
}
