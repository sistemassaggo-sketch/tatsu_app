import { test, expect } from '@playwright/test';
import { encode } from 'next-auth/jwt';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Tatsu Motos/);
});

test('access protected dashboard by injecting a NextAuth JWT cookie', async ({ page }) => {
  // 1. Generate a valid encrypted NextAuth JWT token
  const token = await encode({
    token: {
      name: 'admin',
      sub: '3',
      id: '3',
      username: 'admin',
      role: 'admin',
      status: true,
    },
    secret: process.env.NEXTAUTH_SECRET!, // Must match your app's secret
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // 2. Open a blank page on your domain to establish the context
  await page.goto('/');

  // 3. Inject the session token cookie into Playwright's browser context
  await page.context().addCookies([
    {
      name: 'next-auth.session-token', // Use 'authjs.session-token' if using Auth.js v5
      value: token,
      domain: 'localhost', // Adjust if running on a different host/port
      path: '/',
      httpOnly: true,
      secure: false,       // Set to true if testing over HTTPS locally
      sameSite: 'Lax',
    },
  ]);

  // 4. Go directly to a protected page — you will already be authenticated
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  // 5. Assert protected content is visible
  // Playwright will automatically poll and wait (up to 30 seconds by default) 
// until this specific element is rendered into the DOM.
await expect(page.getByRole('link', { name: 'Cotizaciones' })).toBeVisible();
});


test('access to modules only for almacen role', async ({ page }) => {


  // Links that should NOT appear for comercial users
const restrictedLinks = ['Reportes', 'Usuarios', 'Clientes', 'Auditoría'];

  // 1. Generate a valid encrypted NextAuth JWT token
  const token = await encode({
    token: {
      name: 'pw_segura',
      sub: '23',
      id: '23',
      username: 'pw_segura',
      role: 'almacen',
      status: true,
    },
    secret: process.env.NEXTAUTH_SECRET!, // Must match your app's secret
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // 2. Open a blank page on your domain to establish the context
  await page.goto('/');

  // 3. Inject the session token cookie into Playwright's browser context
  await page.context().addCookies([
    {
      name: 'next-auth.session-token', // Use 'authjs.session-token' if using Auth.js v5
      value: token,
      domain: 'localhost', // Adjust if running on a different host/port
      path: '/',
      httpOnly: true,
      secure: false,       // Set to true if testing over HTTPS locally
      sameSite: 'Lax',
    },
  ]);

  // 4. Go directly to a protected page — you will already be authenticated
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  for (const linkName of restrictedLinks) {
  await expect(page.getByRole('link', { name: linkName })).not.toBeVisible();
}
});