export interface StudentDef {
    id: number;
    name: string;
    house: 'ignis' | 'axiom' | 'vesper';
    skin: string;
    gender: 'm' | 'f';
    year: number;
}

const ROSTER: StudentDef[] = [];

const NAMES = {
    ignis: ['Ivan', 'Isabella', 'Isaac', 'Ivy', 'Ian', 'Iris', 'Igor', 'Imogen', 'Ilya', 'Ingrid', 'Isaiah', 'Isla', 'Inigo', 'Irene', 'Idris', 'Indira'],
    axiom: ['Arthur', 'Alice', 'Aaron', 'Ava', 'Adam', 'Amelia', 'Alex', 'Audrey', 'Alan', 'Anna', 'Adrian', 'Aria', 'Austin', 'Abigail', 'Asher', 'Aurora'],
    vesper: ['Victor', 'Victoria', 'Vincent', 'Violet', 'Vance', 'Vanessa', 'Vlad', 'Valerie', 'Vaughn', 'Vivian', 'Vernon', 'Veronica', 'Valentin', 'Veda', 'Viggo', 'Vera']
};

let globalId = 1;

// Generate 96 Students (32 per house = 8 students * 4 years)
(['ignis', 'axiom', 'vesper'] as const).forEach(house => {
    const list = NAMES[house];
    for (let i = 0; i < 32; i++) {
        const name = `${list[i % list.length]} ${String.fromCharCode(65 + (i % 26))}.`; 
        const skin = house === 'ignis' ? "player_red" : (house === 'axiom' ? "player_blue" : "player_idle");
        const year = Math.floor(i / 8) + 1; // 0-7=Year 1, 8-15=Year 2, etc.

        ROSTER.push({
            id: globalId++,
            name: name,
            house: house,
            skin: skin,
            gender: i % 2 === 0 ? 'm' : 'f',
            year: year
        });
    }
});

export const StudentData = {
    getAll: () => ROSTER,
    getById: (id: number) => ROSTER.find(s => s.id === id),
    getByHouse: (house: string) => ROSTER.filter(s => s.house === house)
};