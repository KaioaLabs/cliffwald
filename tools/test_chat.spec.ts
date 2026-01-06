import { test, expect, chromium } from '@playwright/test';

test('Chat System: Alice & Bob Communication', async () => {
  const browser = await chromium.launch({ headless: true });
  
  const contextA = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const pageA = await contextA.newPage();
  
  const contextB = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const pageB = await contextB.newPage();
  
  pageA.on('console', msg => console.log('Alice Console:', msg.text()));
  pageB.on('console', msg => console.log('Bob Console:', msg.text()));

  console.log('1. Connecting Players...');
  const pA = pageA.goto('http://localhost:3000/?dev_user=Alice&skin=player_idle');
  const pB = pageB.goto('http://localhost:3000/?dev_user=Bob&skin=player_blue');
  await Promise.all([pA, pB]);

  // Wait for connection
  await pageA.waitForTimeout(3000);

  // --- ALICE SENDS MESSAGE ---
  console.log('2. Alice typing...');
  // Focus chat input
  await pageA.click('#chat-input');
  await pageA.keyboard.type('Hello Bob!');
  await pageA.keyboard.press('Enter');

  // Wait for propagation
  await pageB.waitForTimeout(1000);

  // Check Bob's screen
  console.log('3. Checking Bob\'s screen...');
  const chatContentB = await pageB.locator('#chat-messages').innerText();
  console.log(`   Bob sees: "${chatContentB.replace(/\n/g, ' | ')}"`);
  
  if (!chatContentB.includes('Alice: Hello Bob!')) {
      throw new Error('Bob did not receive Alice\'s message!');
  }

  // --- BOB REPLIES ---
  console.log('4. Bob replying...');
  await pageB.click('#chat-input');
  await pageB.keyboard.type('Hi Alice!');
  await pageB.keyboard.press('Enter');

  await pageA.waitForTimeout(1000);

  // Check Alice's screen
  console.log('5. Checking Alice\'s screen...');
  const chatContentA = await pageA.locator('#chat-messages').innerText();
  console.log(`   Alice sees: "${chatContentA.replace(/\n/g, ' | ')}"`);

  if (!chatContentA.includes('Bob: Hi Alice!')) {
      throw new Error('Alice did not receive Bob\'s reply!');
  }

  // Visual Proof
  await pageA.screenshot({ path: 'screenshots/chat_test_alice.png' });
  await pageB.screenshot({ path: 'screenshots/chat_test_bob.png' });

  console.log('SUCCESS: Chat is bidirectional.');
  await browser.close();
});
