import http from 'k6/http';
import { check, group } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

const BASE_URL = 'https://pizza-service.cs329.afoodsite.click';
const FACTORY_URL = 'https://pizza-factory.cs329.click';

function jsonHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function setup() {
  const seed = Date.now();
  const credentials = {
    name: `k6-diner-${seed}`,
    email: `k6-diner-${seed}@example.com`,
    password: 'password',
  };

  const registerRes = http.post(`${BASE_URL}/api/auth`, JSON.stringify(credentials), {
    headers: jsonHeaders(),
  });

  check(registerRes, {
    'setup register status is 200': (r) => r.status === 200,
    'setup register has token': (r) => !!r.json('token'),
  });

  return credentials;
}

export default function (credentials) {
  let authToken = '';
  group('User Login', function() {
    const loginPayload = JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    });

    const loginRes = http.put(`${BASE_URL}/api/auth`, loginPayload, {
      headers: jsonHeaders(),
    });

    check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login response has token': (r) => !!r.json('token'),
    });

    authToken = loginRes.json('token');
  });

  let menu = [];
  group('Get Menu', function() {
    const menuRes = http.get(`${BASE_URL}/api/order/menu`);
    check(menuRes, {
      'menu status is 200': (r) => r.status === 200,
      'menu has items': (r) => Array.isArray(r.json()) && r.json().length > 0,
    });
    menu = menuRes.json() || [];
  });

  let pizzaJwt = '';
  group('Create Order', function() {
    const menuItem = menu[0] || { id: 1, description: 'Veggie', price: 0.0038 };
    const orderPayload = JSON.stringify({
      franchiseId: 1,
      storeId: 1,
      items: [
        {
          menuId: menuItem.id,
          description: menuItem.description,
          price: menuItem.price,
        },
      ],
    });

    const orderRes = http.post(`${BASE_URL}/api/order`, orderPayload, {
      headers: jsonHeaders(authToken),
    });

    check(orderRes, {
      'order creation status is 200': (r) => r.status === 200,
      'order response has id': (r) => r.json('order.id') !== undefined,
      'order response has jwt': (r) => !!r.json('jwt'),
    });

    pizzaJwt = orderRes.json('jwt');
  });

  group('Validate Pizza JWT', function() {
    const validationPayload = JSON.stringify({
      jwt: pizzaJwt,
    });

    const validationRes = http.post(
      `${FACTORY_URL}/api/order/verify`,
      validationPayload,
      {
        headers: jsonHeaders(),
      }
    );

    check(validationRes, {
      'validation status is 200': (r) => r.status === 200,
      'validation response has payload': (r) => !!r.json('payload'),
    });
  });
}