import { Client } from "colyseus.js";
import { PrismaClient } from "@prisma/client";
import { GameState } from "../src/shared/SchemaDef";

const prisma = new PrismaClient();
const ENDPOINT = "ws://localhost:2568";
const API_URL = "http://localhost:2568/api";

async function runAudit() {
    console.log("🔍 STARTING BLIND AUDIT...");
    
    // 1. CLEANUP (Ensure test user is clean)
    const TEST_USER = "AuditBot_V1";
    console.log(`[1/5] Preparing Test User: ${TEST_USER}`);
    
    // Login to get token (Auto-register behavior in dev-login)
    const loginRes = await fetch(`${API_URL}/dev-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: TEST_USER })
    });
    
    if (!loginRes.ok) throw new Error("Login failed");
    const { token } = await loginRes.json();
    console.log("   ✅ Auth Token Received");

    // 2. CONNECT & JOIN
    console.log("[2/5] Connecting to Game Server...");
    const client = new Client(ENDPOINT);
    const room = await client.joinOrCreate<GameState>("world", { token, skin: "player_blue" });
    console.log(`   ✅ Joined Room: ${room.id}`);
    console.log(`   ✅ Session ID: ${room.sessionId}`);

    // Wait for sync
    await new Promise(r => setTimeout(r, 1000));
    
    const initialPos = { 
        x: room.state.players.get(room.sessionId)?.x, 
        y: room.state.players.get(room.sessionId)?.y 
    };
    console.log(`   📍 Initial Pos: ${initialPos.x}, ${initialPos.y}`);

    // 3. TEST SECURITY (SPEED HACK ATTEMPT)
    console.log("[3/5] Testing Security (Anti-SpeedHack)...");
    const hackVector = { x: 100, y: 100 }; // Massive vector, should be normalized to length 1
    room.send("move", { 
        left: false, right: false, up: false, down: false,
        analogDir: hackVector 
    });

    // Wait for server physics tick
    await new Promise(r => setTimeout(r, 500));
    
    const afterHackPos = { 
        x: room.state.players.get(room.sessionId)?.x || 0, 
        y: room.state.players.get(room.sessionId)?.y || 0 
    };
    
    const dist = Math.sqrt(Math.pow(afterHackPos.x - initialPos.x!, 2) + Math.pow(afterHackPos.y - initialPos.y!, 2));
    console.log(`   📏 Distance moved after hack attempt (0.5s): ${dist.toFixed(2)}px`);
    
    // Max speed is approx 120-150 px/sec. 0.5s should be ~60-75px. 
    // If hack worked (vector 100,100 => mag 141), speed would be 141 * speed. 
    // If clamped (vector 0.7,0.7 => mag 1), speed is normal.
    if (dist > 200) {
        console.error("   ❌ SECURITY FAIL: Player moved too fast!");
    } else {
        console.log("   ✅ SECURITY PASS: Movement was clamped.");
    }

    // 4. TEST PERSISTENCE
    console.log("[4/5] Testing Persistence (Disconnect & DB Check)...");
    await room.leave();
    console.log("   👋 Client Disconnected. Waiting for DB save...");
    await new Promise(r => setTimeout(r, 1000)); // Allow async save to complete

    const dbUser = await prisma.user.findUnique({ 
        where: { username: TEST_USER },
        include: { player: true }
    });

    if (!dbUser || !dbUser.player) {
        throw new Error("❌ DB FAIL: User/Player record not found!");
    }

    console.log(`   💾 DB State -> House: ${dbUser.player.house}, X: ${dbUser.player.x.toFixed(1)}, Y: ${dbUser.player.y.toFixed(1)}`);
    
    if (dbUser.player.house === 'axiom') { // We requested "player_blue" -> Axiom
        console.log("   ✅ PERSISTENCE PASS: House saved correctly (Axiom).");
    } else {
        console.error(`   ❌ PERSISTENCE FAIL: Wrong house. Expected 'axiom', got '${dbUser.player.house}'`);
    }

    if (Math.abs(dbUser.player.x - afterHackPos.x) < 5 && Math.abs(dbUser.player.y - afterHackPos.y) < 5) {
        console.log("   ✅ PERSISTENCE PASS: Position saved correctly.");
    } else {
        console.error("   ❌ PERSISTENCE FAIL: Position mismatch between Client Last Known and DB.");
    }

    // 5. TEST RECONNECTION (Restore State)
    console.log("[5/5] Testing Reconnection (State Restoration)...");
    const client2 = new Client(ENDPOINT);
    const room2 = await client2.joinOrCreate<GameState>("world", { token, skin: "player_blue" });
    
    await new Promise(r => setTimeout(r, 500));
    
    const restoredPlayer = room2.state.players.get(room2.sessionId);
    console.log(`   🔄 Restored Pos: ${restoredPlayer?.x.toFixed(1)}, ${restoredPlayer?.y.toFixed(1)}`);
    console.log(`   🔄 Restored House: ${restoredPlayer?.house}`);

    if (restoredPlayer?.house === 'axiom' && Math.abs(restoredPlayer.x - dbUser.player.x) < 5) {
         console.log("   ✅ RECONNECTION PASS: Full state restoration successful.");
    } else {
         console.error("   ❌ RECONNECTION FAIL: State not restored.");
    }

    room2.leave();
    console.log("🎉 AUDIT COMPLETE.");
    process.exit(0);
}

runAudit().catch(e => {
    console.error("🔥 AUDIT FATAL ERROR:", e);
    process.exit(1);
});
