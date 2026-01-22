import { CONFIG } from "../Config";

export interface RoutineTarget {
    targetZone: string; // "GREAT_HALL", "CLASSROOM", "DORM_IGNIS"
    activity: 'class' | 'eat' | 'sleep' | 'free' | 'duel';
}

export function getStudentScheduleTarget(currentHour: number): RoutineTarget {
    // 1. Find the current activity in the schedule (Source of Truth)
    const scheduleItem = CONFIG.ACADEMIC_SCHEDULE.find(item => {
        if (item.start < item.end) {
            return currentHour >= item.start && currentHour < item.end;
        } else {
            // Handles midnight crossing
            return currentHour >= item.start || currentHour < item.end;
        }
    }) || CONFIG.ACADEMIC_SCHEDULE[CONFIG.ACADEMIC_SCHEDULE.length - 1];

    // 2. Map Config Location Name to Map Zone Key
    // E.g. "Great Hall" -> "GREAT_HALL"
    // E.g. "Dormitories" -> Logic needed to pick specific dorm, handled by AI State using house
    let zone = scheduleItem.location.toUpperCase().replace(" ", "_");
    
    // Normalize some names if config isn't 1:1 with Map IDs
    if (zone === "DORMITORIES") zone = "DORM"; // Suffix added by AI later
    if (zone === "CLASSROOM") zone = "CLASSROOM"; // Or specific class name

    return {
        targetZone: zone,
        activity: scheduleItem.activity as any
    };
}
