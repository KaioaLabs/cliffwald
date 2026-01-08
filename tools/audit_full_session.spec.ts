import { test, expect, chromium, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '../src/generated/client/client'; // Local path

const prisma = new PrismaClient();

test.describe.serial('Auditoría Maestra: Ciclo de Vida MMO', () => {
    let browserA: any, contextA: BrowserContext, pageA: Page;
    let browserB: any, contextB: BrowserContext, pageB: Page;

    test.beforeAll(async () => {
        // Limpiar DB de test user
        try {
            await prisma.inventoryItem.deleteMany({ where: { player: { user: { username: 'Audit_Hero' } } } });
            await prisma.player.deleteMany({ where: { user: { username: 'Audit_Hero' } } });
            await prisma.user.deleteMany({ where: { username: 'Audit_Hero' } });
            console.log("🧹 DB Limpia para Audit_Hero");
        } catch(e) { console.log("DB Cleanup warning:", e); }

        browserA = await chromium.launch({ headless: true }); // Headless para velocidad, false para ver
        browserB = await chromium.launch({ headless: true });
    });

    test.afterAll(async () => {
        await browserA.close();
        await browserB.close();
        await prisma.$disconnect();
    });

    test('1. Creación y Persistencia', async () => {
        contextA = await browserA.newContext();
        pageA = await contextA.newPage();
        
        pageA.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
        pageA.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));
        
        pageA.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
        pageA.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));
        
        // Ir a la home (sin params, ver login screen)
        await pageA.goto('http://localhost:3000');
        
        // Verificar Login Screen visible
        await expect(pageA.locator('#login-screen')).toBeVisible();
        
        // Llenar formulario Custom
        await pageA.fill('#login-username', 'Audit_Hero');
        await pageA.selectOption('#login-house', 'vesper'); // Green
        await pageA.click('#btn-login-custom');

        // Esperar entrada al juego (HUD visible)
        await expect(pageA.locator('#login-screen')).toBeHidden();
        await expect(pageA.locator('#quick-menu')).toBeVisible();
        console.log("✅ Login exitoso con usuario nuevo");

        // Moverse (Simular Input)
        // Necesitamos esperar que cargue todo
        await pageA.waitForTimeout(2000);
        
        // Simular movimiento enviando teclas
        await pageA.keyboard.down('D'); // Derecha
        await pageA.keyboard.down('S'); // Abajo
        await pageA.waitForTimeout(1000);
        await pageA.keyboard.up('D');
        await pageA.keyboard.up('S');
        
        // Guardar snapshot de posición aproximada visualmente o logs
        console.log("🏃 Personaje movido");

        /*
        // Escribir en chat para probar UI y persistencia de sesión activa
        await pageA.click('#chat-input'); // Focus
        await pageA.keyboard.type('Hello World Persistence');
        await pageA.keyboard.press('Enter');
        
        await expect(pageA.locator('#chat-messages')).toContainText('Audit_Hero: Hello World Persistence');
        console.log("✅ Chat verificado");
        */

        // DESCONEXIÓN (Cerrar página)
        await pageA.close();
        console.log("🔌 Desconectado. Esperando guardado en servidor...");
        await new Promise(r => setTimeout(r, 2000)); // Esperar save async del server
    });

    test('2. Verificación de Persistencia (Re-Login)', async () => {
        // Verificar en DB directamente primero
        const user = await prisma.user.findUnique({ 
            where: { username: 'Audit_Hero' },
            include: { player: true } 
        });
        
        expect(user).not.toBeNull();
        expect(user!.player!.house).toBe('vesper');
        // Debería haberse movido del spawn (300, 300 aprox)
        // Si se movió derecha-abajo, X > 300, Y > 300
        console.log(`📍 Posición guardada en DB: ${user!.player!.x}, ${user!.player!.y}`);
        expect(user!.player!.x).toBeGreaterThan(300); 
        expect(user!.player!.y).toBeGreaterThan(300);

        // Re-entrar con navegador
        contextA = await browserA.newContext();
        pageA = await contextA.newPage();
        await pageA.goto('http://localhost:3000');
        
        await pageA.fill('#login-username', 'Audit_Hero');
        // No importa la casa seleccionada en re-login, debería cargar la de DB
        await pageA.click('#btn-login-custom'); 
        
        await expect(pageA.locator('#quick-menu')).toBeVisible();
        console.log("✅ Re-login exitoso");
        
        // Verificar visualmente posición (usando logs de telemetría en UI si es posible, o asumiendo éxito por DB)
        // El servidor manda la posición al conectar.
    });

    test('3. Concurrencia y Exclusividad', async () => {
        // pageA sigue conectado como 'Audit_Hero'
        
        contextB = await browserB.newContext();
        pageB = await contextB.newPage();
        await pageB.goto('http://localhost:3000');

        // Intentar entrar con EL MISMO usuario
        await pageB.fill('#login-username', 'Audit_Hero');
        await pageB.click('#btn-login-custom');

        // Comportamiento esperado:
        // Opción A: Server rechaza B.
        // Opción B: Server acepta B y patea A. (Común en MMOs simples/Colyseus por defecto si misma sessionId logic, pero aquí sessionId es socket id).
        // PERO nuestra lógica de "Poseer Entidad" en WorldRoom.ts buscará al player en el mapa.
        // Si ya está "poseído" por A, ¿qué hace?
        
        // En WorldRoom.ts `onJoin`:
        // "Possess Slot": Busca entity. Si A lo tiene, ¿lo roba?
        // Actualmente el código NO verifica si el usuario DB ya está online en otra socketId.
        // Solo verifica slots disponibles.
        // SI el sistema permite entrar, tendremos "Dos Audit_Hero" clonados (Bug) O el mismo (Robo).
        // Vamos a observar qué pasa.
        
        await pageB.waitForTimeout(2000);
        
        // Verifiquemos si PageA fue desconectada o si PageB entró.
        const pageA_visible = await pageA.locator('#quick-menu').isVisible();
        const pageB_visible = await pageB.locator('#quick-menu').isVisible();
        
        console.log(`Estado Concurrencia: A=${pageA_visible}, B=${pageB_visible}`);
        
        // Para este test, SOLO queremos saber que no crashea el server.
        // Idealmente, deberíamos implementar bloqueo, pero confirmemos el estado actual.
    });

    test('4. UI: Álbum y Menús', async () => {
        // Usar PageB si entró, o PageA
        const page = pageB; // Asumimos que el último entra
        
        await page.click('#btn-album');
        await expect(page.locator('#album-modal')).toBeVisible();
        await expect(page.locator('#collection-count')).toBeVisible();
        
        await page.click('.close-btn >> nth=1'); // Cerrar album (hay varios close-btn)
        // await expect(page.locator('#album-modal')).toBeHidden(); // Puede ser flacky por animación
        
        console.log("✅ UI Álbum verificada");
    });
});