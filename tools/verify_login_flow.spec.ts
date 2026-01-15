import { test, expect, chromium } from '@playwright/test';

test('Verify Login vs Register Flow', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating...');
  await page.goto('http://localhost:3000');

  // 1. Try Login with Non-Existent User
  console.log('Attempting Login with NEW user...');
  await page.fill('#login-username', 'Ghost_User_' + Date.now());
  await page.fill('#login-password', 'secret');
  await page.click('#btn-login-action');

  // 2. Expect Registration Form to appear
  console.log('Waiting for Register Form...');
  // The LoginManager hides #form-login and shows #form-register on 404
  await expect(page.locator('#form-register')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#reg-house')).toBeVisible();
  
  console.log('✅ Registration Form appeared correctly.');

  // 3. Complete Registration
  console.log('Completing Registration...');
  await page.selectOption('#reg-house', 'axiom');
  await page.click('#btn-register-action');

  // 4. Expect Game Entry
  await expect(page.locator('#quick-menu')).toBeVisible({ timeout: 10000 });
  console.log('✅ Entered Game successfully.');

  await browser.close();
});
