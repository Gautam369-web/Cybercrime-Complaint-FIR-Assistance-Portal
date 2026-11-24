import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

async function testGoogleAuth() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Visit #account
  await page.goto('http://127.0.0.1:5174/#account', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Check that "Sign in with Google" is present
  const googleBtn = page.getByRole('button', { name: 'Sign in with Google' });
  await googleBtn.waitFor();
  assert.ok(await googleBtn.isVisible(), 'Google Sign-in button is visible on login');

  // Check divider and email form
  assert.ok(await page.getByText('or with email').isVisible(), 'Divider is visible');
  assert.ok(await page.getByRole('button', { name: 'Sign in', exact: true }).isVisible(), 'Email Sign in button is visible');

  // Screenshot login with Google button
  await page.screenshot({ path: 'screenshots/pages/auth_login_with_google.png', fullPage: true });
  console.log('Saved auth_login_with_google.png');

  // 2. Switch to register
  await page.getByRole('button', { name: 'New here? Create an account' }).click();
  const googleSignUpBtn = page.getByRole('button', { name: 'Sign up with Google' });
  await googleSignUpBtn.waitFor();
  assert.ok(await googleSignUpBtn.isVisible(), 'Google Sign-up button is visible on register');
  assert.ok(await page.getByRole('button', { name: 'Create account', exact: true }).isVisible(), 'Create account button is visible');
  await page.screenshot({ path: 'screenshots/pages/auth_register_with_google.png', fullPage: true });
  console.log('Saved auth_register_with_google.png');

  // 3. Click Google Sign-up / Sign-in to open interactive modal
  await googleSignUpBtn.click();
  await page.waitForTimeout(500);
  assert.ok(await page.getByRole('heading', { name: 'Continue with Google' }).isVisible(), 'Google modal is open');
  await page.screenshot({ path: 'screenshots/pages/auth_google_modal.png', fullPage: true });
  console.log('Saved auth_google_modal.png');

  // 4. Test signing in via Google Demo Account
  await page.getByRole('button', { name: 'Use demo Google account' }).click();
  await page.waitForTimeout(1500);

  // Verify dashboard is reached and user is authenticated
  await page.getByRole('button', { name: 'Sign out' }).waitFor();
  assert.ok(await page.getByRole('heading', { name: 'Your complaints' }).isVisible(), 'Dashboard loaded after Google sign-in');
  await page.screenshot({ path: 'screenshots/pages/auth_google_logged_in.png', fullPage: true });
  console.log('Saved auth_google_logged_in.png');

  // 5. Test sign out
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();

  // 6. Test Email / Password login still works
  await page.getByLabel('Email', { exact: true }).fill('demo.tracking@example.com');
  await page.getByLabel('Password', { exact: true }).fill('VillageDemo!2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Sign out' }).waitFor();
  console.log('Email/password login verified successfully');

  await browser.close();
  console.log('ALL GOOGLE & EMAIL AUTH CHECKS PASSED!');
}

testGoogleAuth().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
