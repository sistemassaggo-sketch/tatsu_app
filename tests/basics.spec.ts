import { test, expect, type Page } from '@playwright/test';
import { CONTRASENA_PRUEBA, USUARIOS_PRUEBA } from './fixtures/usuarios-prueba';

// Login real por la UI (no un JWT forjado): ejercita el flujo de autenticación de verdad contra los
// usuarios creados por prisma/seed-test.ts, así que requiere haber corrido ese seed antes.
async function iniciarSesion(page: Page, username: string) {
  await page.goto('/');
  await page.getByLabel('Usuario').fill(username);
  await page.getByLabel('Contraseña').fill(CONTRASENA_PRUEBA);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL('**/dashboard**', { waitUntil: 'domcontentloaded' });
}

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Tatsu Motos/);
});

test('admin logs in and sees the full dashboard nav', async ({ page }) => {
  await iniciarSesion(page, USUARIOS_PRUEBA.admin);

  await expect(page.getByRole('link', { name: 'Cotizaciones' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Usuarios' })).toBeVisible();
});

test('access to modules only for almacen role', async ({ page }) => {
  // Links que NO deberían aparecer para el rol almacen.
  const restrictedLinks = ['Reportes', 'Usuarios', 'Clientes', 'Auditoría'];

  await iniciarSesion(page, USUARIOS_PRUEBA.almacen);

  for (const linkName of restrictedLinks) {
    await expect(page.getByRole('link', { name: linkName })).not.toBeVisible();
  }
});
