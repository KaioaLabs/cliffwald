import { test, expect, chromium } from '@playwright/test';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });
import { PrismaClient } from '../src/generated/client/client';

const prisma = new PrismaClient();

test('Verify Echo Persistence (Name Retention)', async () => {
  // Limpiar usuarios de test anteriores
  try {
      await prisma.inventoryItem.deleteMany({ where: { player: { user: { username: { in: ['DonQuijote', 'Sancho'] } } } } });
      await prisma.player.deleteMany({ where: { user: { username: { in: ['DonQuijote', 'Sancho'] } } } });
      await prisma.user.deleteMany({ where: { username: { in: ['DonQuijote', 'Sancho'] } } });
  } catch(e) {}

  const id = Date.now();
  const qName = `DonQuijote_${id}`;
  const sName = `Sancho_${id}`;

  const browser = await chromium.launch({ headless: true });
  
  // 1. Don Quijote entra
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await pageA.goto('http://localhost:3000');
  
  console.log(`Login ${qName}...`);
  await pageA.fill('#login-username', qName);
  await pageA.fill('#login-password', '1234');
  await pageA.click('#btn-login-action');
  
  // Debug Status
  await pageA.waitForTimeout(1000);
  const status = await pageA.locator('#login-status').innerText();
  console.log(`Login Status A: ${status}`);

  await expect(pageA.locator('#form-register')).toBeVisible();
  await pageA.selectOption('#reg-house', 'ignis');
  await pageA.click('#btn-register-action');
  await expect(pageA.locator('#quick-menu')).toBeVisible();
  console.log(`${qName} in-game.`);
  await pageA.waitForTimeout(5000); // Ensure connection stabilizes

  // 2. Don Quijote sale
  await pageA.close();
  console.log("DonQuijote disconnects. Echo should spawn.");
  await new Promise(r => setTimeout(r, 5000)); // Wait for server to process leave

  // 3. Sancho entra para verificar
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await pageB.goto('http://localhost:3000');
  
  console.log(`Login ${sName}...`);
  await pageB.fill('#login-username', sName);
  await pageB.fill('#login-password', '1234');
  await pageB.click('#btn-login-action');
  
  await expect(pageB.locator('#form-register')).toBeVisible();
  await pageB.selectOption('#reg-house', 'axiom');
  await pageB.click('#btn-register-action');
  await expect(pageB.locator('#quick-menu')).toBeVisible();
  
  // Wait for gameClient exposure AND players
  await pageB.waitForFunction(() => 
      (window as any).gameClient && 
      (window as any).gameClient.playerController &&
      (window as any).gameClient.playerController.players.size > 0
  , null, { timeout: 10000 });

  // 4. Buscar a DonQuijote (Echo)
  console.log(`Searching for ${qName} Echo...`);
  
  const found = await pageB.evaluate((targetName) => {
      const entities = (window as any).gameClient.playerController.players;
      const names = [];
      let foundName = false;
      entities.forEach((ent: any) => {
          if (ent.nameTag) {
              names.push(ent.nameTag.text);
              if (ent.nameTag.text === targetName) {
                  foundName = true;
              }
          }
      });
      console.log("Visible Names:", names); // Will show in browser console, verify via page.on('console')
      return { found: foundName, names: names };
  }, qName);

  console.log("Sancho sees:", found.names);
  expect(found.found).toBe(true);
  console.log(`✅ ${qName} Echo found!`);

  await browser.close();
  await prisma.$disconnect();
});
