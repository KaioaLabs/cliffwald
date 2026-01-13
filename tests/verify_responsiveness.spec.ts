import { test, expect } from '@playwright/test';

test.describe('Responsive & Fullscreen Adaptation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Go to local preview URL
    await page.goto('http://localhost:4173');
    // Wait for canvas to be present
    await page.waitForSelector('canvas');
  });

  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
    { name: 'iPad Air', width: 820, height: 1180 },
    { name: 'Desktop 1080p', width: 1920, height: 1080 },
    { name: 'Desktop 4K', width: 3840, height: 2160 }
  ];

  for (const viewport of viewports) {
    test(`should fit canvas in ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      // 1. Resize Viewport
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // 2. Wait for potential resize debounce (Phaser sometimes debounces resize)
      await page.waitForTimeout(500);

      // 3. Get Canvas and Container dimensions
      const canvasBox = await page.locator('canvas').boundingBox();
      const appBox = await page.locator('#app').boundingBox();

      expect(canvasBox).not.toBeNull();
      expect(appBox).not.toBeNull();

      if (canvasBox && appBox) {
        // 4. Assert Canvas is contained within App
        expect(canvasBox.width).toBeLessThanOrEqual(appBox.width);
        expect(canvasBox.height).toBeLessThanOrEqual(appBox.height);

        // 5. Assert Aspect Ratio Logic (FIT mode)
        // One dimension should match strictly (or very close) to the container
        // allowing for small rounding errors or scrollbars
        const widthMatch = Math.abs(canvasBox.width - appBox.width) < 20;
        const heightMatch = Math.abs(canvasBox.height - appBox.height) < 20;
        
        expect(widthMatch || heightMatch).toBeTruthy();
        
        console.log(`[${viewport.name}] Container: ${appBox.width}x${appBox.height} | Canvas: ${canvasBox.width}x${canvasBox.height} - FIT OK`);
      }
    });
  }

  test('fullscreen button exists and is clickable', async ({ page }) => {
    // Check if button exists in DOM
    const btn = page.locator('#btn-fullscreen');
    await expect(btn).toBeVisible();
    
    // Check if it's within the viewport (clickable)
    await expect(btn).toBeInViewport();
  });

  test('meta tags for mobile pwa exist', async ({ page }) => {
    const capable = page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(capable).toHaveAttribute('content', 'yes');

    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /viewport-fit=cover/);
  });

});
