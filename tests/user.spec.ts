import { test, expect } from 'playwright-test-coverage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomEmail() {
  return `user${Math.floor(Math.random() * 100000)}@jwt.com`;
}

async function setupOrderRoute(page: any) {
  await page.route('*/**/api/order', async (route: any) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { dinerId: '1', orders: [], id: '1' } });
    } else {
      await route.fulfill({ json: { order: {}, jwt: 'fakejwt' } });
    }
  });
}

async function setupFranchiseRoute(page: any) {
  await page.route(/\/api\/franchise(\?.*)?$/, async (route: any) => {
    await route.fulfill({ json: { franchises: [], more: false } });
  });
}

// Update User tests
test('updateUser - change name persists after logout and login', async ({ page }) => {
  const email = randomEmail();
  let currentUser = {
    id: '42',
    name: 'pizza diner',
    email,
    roles: [{ role: 'diner' }],
  };

  // Auth routes (register & login both use /api/auth, login is PUT, register is POST)
  await page.route('*/**/api/auth', async (route: any) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({ json: { user: { ...currentUser }, token: 'tok1' } });
    } else if (method === 'PUT') {
      await route.fulfill({ json: { user: { ...currentUser }, token: 'tok1' } });
    } else if (method === 'DELETE') {
      await route.fulfill({ json: { message: 'Logged out' } });
    }
  });

  await page.route('*/**/api/user/me', async (route: any) => {
    await route.fulfill({ json: { ...currentUser } });
  });

  // Update user endpoint
  await page.route(/\/api\/user\/(?!me)\w+/, async (route: any) => {
    const method = route.request().method();
    if (method === 'PUT') {
      const body = route.request().postDataJSON();
      currentUser = { ...currentUser, name: body.name, email: body.email };
      await route.fulfill({ json: { user: { ...currentUser }, token: 'tok1' } });
    }
  });

  await setupOrderRoute(page);

  // Register and navigate to diner dashboard
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText('pizza diner');

  // Open edit dialog and verify that it appears
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');

  // Change the name and submit
  await page.getByRole('textbox').first().fill('pizza dinerx');
  await page.getByRole('button', { name: 'Update' }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  // Logout then login again
  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText('pizza dinerx');
});

