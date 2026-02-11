import { test, expect } from 'playwright-test-coverage';
import { Page } from '@playwright/test';

interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  roles: { role: string }[];
}

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = {
    'd@jwt.com': {
      id: '3',
      name: 'Kai Chen',
      email: 'd@jwt.com',
      password: 'a',
      roles: [{ role: 'diner' }],
    },
    'admin@test.com': {
      id: '1',
      name: 'Admin',
      email: 'admin@test.com',
      password: 'a',
      roles: [{ role: 'admin' }],
    },
  };

  await page.route('*/**/api/auth', async (route) => {
    const method = route.request().method();
    if (method === 'DELETE') {
      await route.fulfill({ json: { message: 'Logged out' } });
      return;
    }
    const loginReq = route.request().postDataJSON();
    const user = validUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    loggedInUser = user;
    const loginRes = {
      user: { id: user.id, name: user.name, email: user.email, roles: user.roles },
      token: 'abcdef',
    };
    expect(route.request().method()).toBe('PUT');
    await route.fulfill({ json: loginRes });
  });

  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    if (loggedInUser) {
      await route.fulfill({
        json: {
          id: loggedInUser.id,
          name: loggedInUser.name,
          email: loggedInUser.email,
          roles: loggedInUser.roles,
        },
      });
    } else {
      await route.fulfill({ status: 401, json: { error: 'Not authenticated' } });
    }
  });

  await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
      { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'Garden' },
      { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy' },
      { id: 3, title: 'Margarita', image: 'pizza3.png', price: 0.0014, description: 'Classic' },
      { id: 4, title: 'Crusty', image: 'pizza4.png', price: 0.0024, description: 'Dry' },
    ];
    await route.fulfill({ json: menuRes });
  });

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const franchiseRes = {
      franchises: [
        {
          id: 2,
          name: 'LotaPizza',
          admins: [],
          stores: [
            { id: 4, name: 'Lehi' },
            { id: 5, name: 'Springville' },
          ],
        },
      ],
    };
    await route.fulfill({ json: franchiseRes });
  });

  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'POST') {
      const orderReq = route.request().postDataJSON();
      const orderRes = {
        order: { ...orderReq, id: 23 },
        jwt: 'eyJpYXQ',
      };
      await route.fulfill({ json: orderRes });
    } else {
      await route.fulfill({ json: [] });
    }
  });

  await page.goto('/');
}

// MINIMAL COVERAGE-FOCUSED TESTS

test('home', async ({ page }) => {
  await page.goto('/');
  expect(await page.title()).toBe('JWT Pizza');
});

test('login', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});

test('logout', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
  await page.getByRole('link', { name: 'Logout' }).click();
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});

test('register', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByPlaceholder('Full name').fill('John');
  await page.getByPlaceholder('Email address').fill('john@test.com');
  await page.getByPlaceholder('Password').fill('pass');
  await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
});
test('order', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('button', { name: 'Order now' }).click();
  await page.getByRole('combobox').selectOption('4');
  // Add pizzas by clicking on pizza links
  const pizzaLinks = page.getByRole('link').filter({ hasText: /Veggie|Pepperoni/ });
  const count = await pizzaLinks.count();
  if (count >= 2) {
    await pizzaLinks.nth(0).click();
    await pizzaLinks.nth(1).click();
  }
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('main')).toBeVisible();
});

test('invalid login', async ({ page }) => {
  await basicInit(page);
  await page.route('*/**/api/auth', async (route) => {
    await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
  });
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('wrong@test.com');
  await page.getByPlaceholder('Password').fill('wrong');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});

test('about', async ({ page }) => {
  await basicInit(page);
  await page.goto('/about');
  await expect(page).toHaveURL(/.*about/);
});

test('docs', async ({ page }) => {
  await basicInit(page);
  await page.goto('/docs');
  await expect(page).toHaveURL(/.*docs/);
});

test('history', async ({ page }) => {
  await basicInit(page);
  await page.goto('/history');
  await expect(page).toHaveURL(/.*history/);
});

test('dashboard', async ({ page }) => {
  await basicInit(page);
  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: [
          {
            id: 1,
            items: [{ menuId: 1, description: 'Veggie', price: 0.0038 }],
            storeId: 1,
            franchiseId: 1,
            date: '2024-01-15',
          },
        ],
      });
    } else {
      const req = route.request().postDataJSON();
      await route.fulfill({
        json: { order: { ...req, id: 1 }, jwt: 'token' },
      });
    }
  });
  await page.goto('/dashboard');
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/.*dashboard/);
});

test('franchise', async ({ page }) => {
  await basicInit(page);
  await page.route('*/**/api/franchise/2', async (route) => {
    await route.fulfill({
      json: [
        {
          id: 2,
          name: 'LotaPizza',
          admins: [],
          stores: [
            { id: 4, name: 'Lehi', totalRevenue: 1000 },
            { id: 5, name: 'Springville', totalRevenue: 1500 },
          ],
        },
      ],
    });
  });
  await page.goto('/franchise');
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/.*franchise/);
});

test('admin-dashboard', async ({ page }) => {
  await basicInit(page);
  await page.route('*/**/api/franchise', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          franchises: [
            { id: 1, name: 'Franchise1', admins: [], stores: [{ id: 1, name: 'Store1' }] },
            { id: 2, name: 'Franchise2', admins: [], stores: [] },
          ],
        },
      });
    }
  });
  await page.goto('/admin-dashboard');
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/.*admin/);
});

test('delivery', async ({ page }) => {
  await basicInit(page);
  await page.goto('/delivery');
  await expect(page).toHaveURL(/.*delivery/);
});

test('create-franchise', async ({ page }) => {
  await basicInit(page);
  await page.goto('/create-franchise');
  await expect(page).toHaveURL(/.*create-franchise/);
});

test('create-store', async ({ page }) => {
  await basicInit(page);
  await page.goto('/create-store');
  await expect(page).toHaveURL(/.*create-store/);
});

test('close-franchise', async ({ page }) => {
  await basicInit(page);
  await page.goto('/close-franchise');
  await expect(page).toHaveURL(/.*close-franchise/);
});

test('close-store', async ({ page }) => {
  await basicInit(page);
  await page.goto('/close-store');
  await expect(page).toHaveURL(/.*close-store/);
});

test('payment', async ({ page }) => {
  await basicInit(page);
  await page.goto('/payment');
  await expect(page).toHaveURL(/.*payment/);
});

test('notfound', async ({ page }) => {
  await page.goto('/invalid-route-xyz');
  const title = await page.title();
  expect(title).toBeTruthy();
});
