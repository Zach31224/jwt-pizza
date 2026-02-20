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

test('updateUser - open and close dialog without changes', async ({ page }) => {
  const email = randomEmail();
  const currentUser = {
    id: '55',
    name: 'pizza diner',
    email,
    roles: [{ role: 'diner' }],
  };

  await page.route('*/**/api/auth', async (route: any) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({ json: { user: { ...currentUser }, token: 'tok2' } });
    } else {
      await route.fulfill({ json: { message: 'ok' } });
    }
  });

  await page.route('*/**/api/user/me', async (route: any) => {
    await route.fulfill({ json: { ...currentUser } });
  });

  await page.route(/\/api\/user\/(?!me)\w+/, async (route: any) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ json: { user: { ...currentUser }, token: 'tok2' } });
    }
  });

  await setupOrderRoute(page);

  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'pd' }).click();

  // Open dialog
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');

  // Close via Update (no changes)
  await page.getByRole('button', { name: 'Update' }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });
  await expect(page.getByRole('main')).toContainText('pizza diner');
});

test('updateUser - change email', async ({ page }) => {
  const originalEmail = randomEmail();
  const newEmail = randomEmail();
  let currentUser = {
    id: '77',
    name: 'email changer',
    email: originalEmail,
    roles: [{ role: 'diner' }],
  };

  await page.route('*/**/api/auth', async (route: any) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({ json: { user: { ...currentUser }, token: 'tok3' } });
    } else {
      await route.fulfill({ json: { message: 'ok' } });
    }
  });

  await page.route('*/**/api/user/me', async (route: any) => {
    await route.fulfill({ json: { ...currentUser } });
  });

  await page.route(/\/api\/user\/(?!me)\w+/, async (route: any) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      currentUser = { ...currentUser, name: body.name, email: body.email };
      await route.fulfill({ json: { user: { ...currentUser }, token: 'tok3' } });
    }
  });

  await setupOrderRoute(page);

  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('email changer');
  await page.getByRole('textbox', { name: 'Email address' }).fill(originalEmail);
  await page.getByRole('textbox', { name: 'Password' }).fill('pass');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'ec' }).click();
  await expect(page.getByRole('main')).toContainText(originalEmail);

  await page.getByRole('button', { name: 'Edit' }).click();
  // Change the email field (second textbox)
  await page.getByRole('textbox').nth(1).fill(newEmail);
  await page.getByRole('button', { name: 'Update' }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText(newEmail);
});

// Admin List/Delete Users tests

async function loginAsAdmin(page: any) {
  const adminUser = { id: '1', name: 'Admin', email: 'admin@test.com', roles: [{ role: 'admin' }] };

  await page.route('*/**/api/auth', async (route: any) => {
    const method = route.request().method();
    if (method === 'PUT') {
      await route.fulfill({ json: { user: adminUser, token: 'admintoken' } });
    } else if (method === 'DELETE') {
      await route.fulfill({ json: { message: 'Logged out' } });
    }
  });

  await page.route('*/**/api/user/me', async (route: any) => {
    await route.fulfill({ json: adminUser });
  });

  await setupFranchiseRoute(page);
  await setupOrderRoute(page);

  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('admin@test.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
}

test('admin - list users', async ({ page }) => {
  const users = [
    { id: '3', name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] },
    { id: '5', name: 'Buddy', email: 'b@jwt.com', roles: [{ role: 'admin' }] },
  ];

  await loginAsAdmin(page);

  await page.route(/\/api\/user\?/, async (route: any) => {
    await route.fulfill({ json: { users, more: false } });
  });

  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('main')).toContainText('Users');
  await expect(page.getByRole('main')).toContainText('Kai Chen');
  await expect(page.getByRole('main')).toContainText('d@jwt.com');
  await expect(page.getByRole('main')).toContainText('Buddy');
  await expect(page.getByRole('main')).toContainText('b@jwt.com');
});

test('admin - filter users by name', async ({ page }) => {
  const allUsers = [
    { id: '3', name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] },
    { id: '5', name: 'Buddy', email: 'b@jwt.com', roles: [{ role: 'admin' }] },
  ];

  await loginAsAdmin(page);

  await page.route(/\/api\/user\?/, async (route: any) => {
    const url = route.request().url();
    const nameParam = new URL(url).searchParams.get('name') ?? '*';
    const filter = nameParam.replace(/\*/g, '').toLowerCase();
    const filtered = filter ? allUsers.filter((u) => u.name.toLowerCase().includes(filter)) : allUsers;
    await route.fulfill({ json: { users: filtered, more: false } });
  });

  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('main')).toContainText('Kai Chen');
  await expect(page.getByRole('main')).toContainText('Buddy');

  // Filter by 'Kai'
  await page.getByPlaceholder('Filter users').fill('Kai');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('main')).toContainText('Kai Chen');
  await expect(page.getByRole('main')).not.toContainText('Buddy');
});

test('admin - delete user', async ({ page }) => {
  let users = [
    { id: '3', name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] },
    { id: '5', name: 'Buddy', email: 'b@jwt.com', roles: [{ role: 'admin' }] },
  ];

  await loginAsAdmin(page);

  await page.route(/\/api\/user\?/, async (route: any) => {
    await route.fulfill({ json: { users, more: false } });
  });

  await page.route(/\/api\/user\/(?!me)\w+/, async (route: any) => {
    const method = route.request().method();
    if (method === 'DELETE') {
      const url = route.request().url();
      const userId = url.split('/').pop()?.split('?')[0];
      users = users.filter((u) => u.id !== userId);
      await route.fulfill({ json: { message: 'User deleted' } });
    } else if (method === 'PUT') {
      const body = route.request().postDataJSON();
      await route.fulfill({ json: { user: body, token: 'admintoken' } });
    }
  });

  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('main')).toContainText('Kai Chen');
  const rows = page.locator('table').last().locator('tbody tr');
  await rows.first().getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('main')).not.toContainText('Kai Chen');
  await expect(page.getByRole('main')).toContainText('Buddy');
});

test('admin - paginate users', async ({ page }) => {
  const page1Users = [{ id: '1', name: 'Alice', email: 'a@jwt.com', roles: [{ role: 'diner' }] }];
  const page2Users = [{ id: '2', name: 'Bob', email: 'bob@jwt.com', roles: [{ role: 'diner' }] }];

  await loginAsAdmin(page);

  let callCount = 0;
  await page.route(/\/api\/user\?/, async (route: any) => {
    callCount++;
    if (callCount === 1) {
      await route.fulfill({ json: { users: page1Users, more: true } });
    } else {
      await route.fulfill({ json: { users: page2Users, more: false } });
    }
  });

  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('main')).toContainText('Alice');

  // Next page
  await page.getByRole('button', { name: '»' }).last().click();
  await expect(page.getByRole('main')).toContainText('Bob');
});
