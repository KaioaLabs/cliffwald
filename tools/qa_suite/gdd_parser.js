const fs = require('fs');
const path = require('path');

const gddPath = path.join(__dirname, '../../docs/design/GDD_MASTER.md');
const gddContent = fs.readFileSync(gddPath, 'utf8');

// Estructura de Expectativas extraídas del GDD
const expectations = {
    schedule: [],
    zones: [],
    spells: [],
    economy: {}
};

// 1. Extraer Horarios (Busca la tabla en sección 2.2)
// | Hora | Actividad | Ubicación |
const scheduleRegex = /\| (\d{2}:\d{2} - \d{2}:\d{2}) \| (.*?) \| (.*?) \|/g;
let match;
while ((match = scheduleRegex.exec(gddContent)) !== null) {
    if (match[1].includes('Hora')) continue; // Skip header
    expectations.schedule.push({
        timeRange: match[1],
        activity: match[2].trim(),
        location: match[3].trim()
    });
}

// 2. Extraer Reglas de Zona (Sección 4.2)
// | Tipo de Zona | Ejemplo | PvP State |
const zoneRegex = /\| (.*?) \| (.*?) \| (.*?) \| (.*?) \|/g;
// Reset regex index logic not needed for new regex, but good practice
while ((match = zoneRegex.exec(gddContent)) !== null) {
    if (match[1].includes('Tipo')) continue;
    expectations.zones.push({
        type: match[1].trim(),
        examples: match[2].trim(),
        pvpRule: match[3].trim()
    });
}

// 3. Extraer Hechizos (Sección 7.6)
const spellRegex = /\| (.*?) \| (.*?) \| (.*?) \| (.*?) \| (.*?) \|/g;
while ((match = spellRegex.exec(gddContent)) !== null) {
    if (match[1].includes('Gesto') || match[1].includes('---')) continue;
    expectations.spells.push({
        gesture: match[1].trim().replace(/\*\*/g, ''),
        name: match[2].trim(),
        color: match[3].trim(),
        speed: match[4].trim(),
        rps: match[5].trim()
    });
}

const outPath = path.join(__dirname, 'config/QA_Expectations.json');
fs.writeFileSync(outPath, JSON.stringify(expectations, null, 2));

console.log("✅ GDD Parsed into QA Expectations:");
console.log(JSON.stringify(expectations, null, 2));
