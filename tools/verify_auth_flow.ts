
import { AuthService } from "../src/server/services/AuthService";
import { db } from "../src/server/db";
import { initDatabase } from "../src/server/init_db";

async function main() {
    console.log("--- VERIFYING AUTH FLOW ---");
    
    await initDatabase();

    const TEST_USER = `test_auth_${Date.now()}`;
    const TEST_PASS = "password123";

    // 1. Attempt Login (Should Fail)
    console.log(`\n1. Attempting Login for non-existent user: ${TEST_USER}`);
    try {
        await AuthService.login(TEST_USER, TEST_PASS);
        console.error("❌ ERROR: Login succeeded but should have failed!");
        process.exit(1);
    } catch (e: any) {
        if (e.message === "User not found") {
            console.log("✅ Correctly received 'User not found' error.");
        } else {
            console.error(`❌ Unexpected error: ${e.message}`);
            process.exit(1);
        }
    }

    // 2. Register (Should Success)
    console.log(`\n2. Registering user: ${TEST_USER}`);
    try {
        const token = await AuthService.register(TEST_USER, TEST_PASS, "player_idle", "ignis");
        if (token) {
            console.log("✅ Registration successful. Token received.");
        } else {
            console.error("❌ Registration returned no token.");
        }
    } catch (e: any) {
        console.error(`❌ Registration failed: ${e.message}`);
        process.exit(1);
    }

    // 3. Verify Persistence in DB
    console.log(`\n3. Verifying DB persistence...`);
    const dbUser = await db.user.findUnique({ where: { username: TEST_USER } });
    if (dbUser) {
        console.log(`✅ User found in DB ID: ${dbUser.id}`);
    } else {
        console.error("❌ User NOT found in DB after registration!");
        process.exit(1);
    }

    // 4. Attempt Login Again (Should Success)
    console.log(`\n4. Attempting Login with created account...`);
    try {
        const result = await AuthService.login(TEST_USER, TEST_PASS);
        if (result.token) {
            console.log("✅ Login successful with new account.");
        }
    } catch (e: any) {
        console.error(`❌ Login failed after registration: ${e.message}`);
        process.exit(1);
    }

    console.log("\n✅ AUTH FLOW VERIFIED: Seamless transition from Login 404 -> Register works.");
    process.exit(0);
}

main();
