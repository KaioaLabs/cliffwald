import { PrismaClient } from './src/generated/client/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding Database...");

    const houses = [
        { name: 'Ignis_Master', skin: 'player_red', house: 'ignis' },
        { name: 'Axiom_Master', skin: 'player_blue', house: 'axiom' },
        { name: 'Vesper_Master', skin: 'player_green', house: 'vesper' }
    ];

    for (const h of houses) {
        // 1. Create/Update User
        const user = await prisma.user.upsert({
            where: { username: h.name },
            update: {},
            create: {
                username: h.name,
                password: await bcrypt.hash('123456', 10) // Default password
            }
        });

        // 2. Create/Update Player
        const player = await prisma.player.upsert({
            where: { userId: user.id },
            update: {
                skin: h.skin,
                house: h.house
            },
            create: {
                userId: user.id,
                skin: h.skin,
                house: h.house,
                x: 1400, // Near the center/school
                y: 1300,
                prestige: 100
            }
        });

        // 3. Give Default Cards
        const defaultDeck = ["card_1", "card_2", "card_3"]; // Rock, Paper, Scissors cards
        
        await prisma.inventoryItem.deleteMany({ where: { playerId: player.id } });
        
        for (const itemId of defaultDeck) {
            await prisma.inventoryItem.create({
                data: {
                    playerId: player.id,
                    itemId: itemId,
                    count: 1,
                    equipped: true
                }
            });
        }

        console.log(`✅ Seeded: ${h.name} (${h.house})`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
