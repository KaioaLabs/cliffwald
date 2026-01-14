import { CONFIG } from "../Config";
import { LevelRegistry } from "../../server/managers/LevelRegistry";

export interface RoutineTarget {
    pos: { x: number, y: number };
    facing: { x: number, y: number };
    activity: 'class' | 'eat' | 'sleep' | 'free' | 'duel';
}

export function getStudentScheduleTarget(numericId: number, currentHour: number, routineSpots: any, archetype: 'ACHIEVER' | 'SOCIALIZER' | 'EXPLORER' | 'KILLER' = 'SOCIALIZER'): RoutineTarget {
    // 1. Find the current activity in the schedule
    const scheduleItem = CONFIG.ACADEMIC_SCHEDULE.find(item => {
        if (item.start < item.end) {
            return currentHour >= item.start && currentHour < item.end;
        } else {
            // Handles midnight crossing (e.g., 22:00 to 07:00)
            return currentHour >= item.start || currentHour < item.end;
        }
    }) || CONFIG.ACADEMIC_SCHEDULE[CONFIG.ACADEMIC_SCHEDULE.length - 1];

    const activity = scheduleItem.activity as RoutineTarget['activity'];

    // 2. Determine Base Target based on activity type
    if (activity === 'eat') {
        const studentIndex = (numericId - 1) % 8;
        const tableRow = Math.floor(studentIndex / 4); 
        const facingY = tableRow === 0 ? 1 : -1;
        return { pos: routineSpots.eat, facing: { x: 0, y: facingY }, activity: 'eat' };
    } 
    
    if (activity === 'class') {
        return { pos: routineSpots.class, facing: { x: 0, y: -1 }, activity: 'class' };
    }
    
    if (activity === 'sleep') {
        return { pos: routineSpots.sleep, facing: { x: 0, y: -1 }, activity: 'sleep' };
    }

    // 3. Free Time Dispersion Logic
    const getSpread = (center: {x: number, y: number}, radius: number) => {
        const angle = numericId * 2.399; // Golden Angle
        const r = Math.sqrt(numericId + 1) * (radius / 5); 
        const finalR = Math.min(r, radius);
        return { x: center.x + Math.cos(angle) * finalR, y: center.y + Math.sin(angle) * finalR };
    };

    let desiredPos = routineSpots.sleep;
    const registry = LevelRegistry.getInstance();
    
    // Switch between free locations based on the specific schedule item name
    if (scheduleItem.name === "Free Time") {
        if (archetype === 'KILLER') {
            const loc = registry.hasData() ? registry.getLocation("TRAINING_GROUNDS") : {x: 2640, y: 1520};
            desiredPos = getSpread(loc, 200);
            return { pos: desiredPos, facing: { x: 0, y: 1 }, activity: 'duel' };
        } 
        else if (archetype === 'SOCIALIZER') {
            const loc = registry.hasData() ? registry.getLocation("COURTYARD") : {x: 1056, y: 1280};
            desiredPos = getSpread(loc, 150);
            return { pos: desiredPos, facing: { x: 0, y: 1 }, activity: 'free' };
        }
        else if (archetype === 'EXPLORER') {
            const loc = registry.hasData() ? registry.getLocation("FOREST") : {x: 1600, y: 2880};
            desiredPos = getSpread(loc, 300);
            return { pos: desiredPos, facing: { x: 0, y: 1 }, activity: 'free' };
        }
        else { // ACHIEVER
            // Achievers study in class or library even in free time
            desiredPos = routineSpots.class;
            return { pos: desiredPos, facing: { x: 0, y: -1 }, activity: 'free' };
        }
    } else if (scheduleItem.name === "Field Study") {
        const loc = registry.hasData() ? registry.getLocation("FOREST") : {x: 1600, y: 2880};
        desiredPos = getSpread(loc, 400);
    } else {
        const loc = registry.hasData() ? registry.getLocation("COURTYARD") : {x: 1056, y: 1280};
        desiredPos = getSpread(loc, 150);
    }

    return { pos: desiredPos, facing: { x: 0, y: 1 }, activity: 'free' };
}
