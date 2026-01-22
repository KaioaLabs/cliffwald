// Academic Calendar & Schedule
export const AcademicConfig = {
    // Time System
    SEASON_START_DATE: 1735689600000, 
    CYCLE_DURATION_MS: 2700000, 
    DAY_PHASE_DURATION_MS: 1800000, 

    // Academic Calendar
    CYCLES_PER_DAY: 1, 
    DAYS_PER_WEEK: 7,
    WEEKS_PER_COURSE: 8, 
    COURSES_TOTAL: 4, 
    CLASS_DURATION_MS: 180000, 

    // Schedule
    ACADEMIC_SCHEDULE: [
        { start: 7, end: 8.5, name: "Breakfast", location: "Great Hall", activity: "eat" },
        { start: 8.5, end: 12.5, name: "Morning Class", location: "Classroom", activity: "class" },
        { start: 12.5, end: 14, name: "Lunch", location: "Great Hall", activity: "eat" },
        { start: 14, end: 20, name: "Free Time", location: "Courtyard", activity: "free" },
        { start: 20, end: 22, name: "Dinner", location: "Great Hall", activity: "eat" },
        { start: 22, end: 7, name: "Curfew", location: "Dormitories", activity: "sleep" }
    ]
};
