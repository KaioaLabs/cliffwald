import { Client } from "colyseus.js";
import { GameState } from "../src/shared/SchemaDef";

async function verify() {
    console.log("Connecting to verify schema...");
    const client = new Client("http://localhost:2567"); // Assuming default port
    
    try {
        // Authenticate as dev first to get token
        const loginRes = await fetch("http://localhost:2568/api/dev-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "Verifier" })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;

        const room = await client.joinOrCreate<GameState>("world", { token });
        console.log("Joined successfully.");

        room.onStateChange((state) => {
            console.log("State received.");
            console.log(`Player count: ${state.players.size}`);
            let ignis = 0, axiom = 0, vesper = 0, unknown = 0;

            state.players.forEach((player, key) => {
                // Accessing the property directly
                const house = (player as any).house;
                console.log(`[${key}] House: ${house}, Skin: ${player.skin}`);
                
                if (house === 'ignis') ignis++;
                else if (house === 'axiom') axiom++;
                else if (house === 'vesper') vesper++;
                else unknown++;
            });

            console.log(`Stats - Ignis: ${ignis}, Axiom: ${axiom}, Vesper: ${vesper}, Unknown: ${unknown}`);
            process.exit(0);
        });

    } catch (e) {
        console.error("Verification failed:", e);
        process.exit(1);
    }
}

verify();
