// K6 Load Test Script Examples for E-Commerce API
// For running: k6 run K6_TEST_SCRIPT_EXAMPLES.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';

//const BASE_URL = 'http://localhost:8083';
const BASE_URL = 'http://host.docker.internal:8083';

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Ramp up to 10 VUs over 10s
    { duration: '30s', target: 30 },   // Ramp up to 30 VUs over 30s
    { duration: '1m', target: 30 },    // Hold 30 VUs for 1 minute
    { duration: '10s', target: 0 },    // Ramp down to 0 VUs over 10s
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests must be below 500ms
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
  },
};

// ============================================
// EXAMPLE 1: Product Browsing (Read-Heavy)
// ============================================
export function productBrowsing() {
  group('Product Browsing', () => {
    // 1. Get product list
    let res = http.get(`${BASE_URL}/api/products`, {
      params: {
        page: 0,
        size: 20,
        sortType: 'LATEST'
      }
    });
    
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has content': (r) => JSON.parse(r.body).content.length > 0,
    });

    sleep(1);

    // 2. Get single product (extract ID from previous response)
    const products = JSON.parse(res.body).content;
    if (products.length > 0) {
      const productId = products[0].id;
      res = http.get(`${BASE_URL}/api/products/${productId}`);
      
      check(res, {
        'product detail status is 200': (r) => r.status === 200,
        'has product name': (r) => JSON.parse(r.body).name !== undefined,
      });
    }

    sleep(1);

    // 3. Get top ranked products
    res = http.get(`${BASE_URL}/api/products/top-rank`, {
      params: {
        type: 'daily',
        limit: 10
      }
    });
    
    check(res, {
      'top products status is 200': (r) => r.status === 200,
    });
  });
}

// ============================================
// EXAMPLE 2: Shopping Cart Operations
// ============================================
export function shoppingCart() {
  const userId = __VU + 1000;  // Unique user per VU
  const productId = 1;  // Assume product 1 exists
  
  group('Shopping Cart', () => {
    // 1. Add item to cart
    let res = http.post(`${BASE_URL}/api/carts`, JSON.stringify({
      userId: userId,
      productId: productId,
      quantity: 2
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    check(res, {
      'add to cart status is 200': (r) => r.status === 200,
      'cart item created': (r) => JSON.parse(r.body).id !== undefined,
    });

    const cartId = JSON.parse(res.body).id;
    sleep(1);

    // 2. Get user's cart
    res = http.get(`${BASE_URL}/api/carts/${userId}`);
    
    check(res, {
      'get cart status is 200': (r) => r.status === 200,
      'cart has items': (r) => JSON.parse(r.body).length > 0,
    });

    sleep(1);

    // 3. Update cart quantity
    res = http.patch(`${BASE_URL}/api/carts/${cartId}/quantity`, 
      JSON.stringify({
        userId: userId,
        quantity: 5
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    
    check(res, {
      'update quantity status is 200': (r) => r.status === 200,
      'quantity updated': (r) => JSON.parse(r.body).quantity === 5,
    });

    sleep(1);

    // 4. Delete cart item
    res = http.del(`${BASE_URL}/api/carts/${cartId}?userId=${userId}`);
    
    check(res, {
      'delete cart status is 204': (r) => r.status === 204,
    });
  });
}

// ============================================
// EXAMPLE 3: Order Creation Flow
// ============================================
export function orderCreation() {
  const userId = __VU + 2000;  // Unique user per VU
  const productId = 1;  // Assume product 1 exists
  
  group('Order Creation', () => {
    // 1. Create order from product (direct purchase)
    let res = http.post(`${BASE_URL}/api/orders/from-product`,
      JSON.stringify({
        userId: userId,
        productId: productId,
        quantity: 1,
        pointAmount: null,
        couponId: null
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    
    check(res, {
      'create order status is 201': (r) => r.status === 201,
      'order has orderId': (r) => JSON.parse(r.body).orderId !== undefined,
      'order status is PENDING': (r) => JSON.parse(r.body).orderStatus === 'PENDING',
    });

    const orderId = JSON.parse(res.body).orderId;
    sleep(2);  // Wait for async processing

    // 2. Get order list
    res = http.get(`${BASE_URL}/api/orders`, {
      params: {
        userId: userId,
        page: 0,
        size: 10
      }
    });
    
    check(res, {
      'get orders status is 200': (r) => r.status === 200,
      'orders list has items': (r) => JSON.parse(r.body).orders.length > 0,
    });

    sleep(1);

    // 3. Get order detail
    if (orderId) {
      res = http.get(`${BASE_URL}/api/orders/${orderId}?userId=${userId}`);
      
      check(res, {
        'get order detail status is 200': (r) => r.status === 200,
        'order detail has orderId': (r) => JSON.parse(r.body).orderId === orderId,
      });
    }
  });
}

// ============================================
// EXAMPLE 4: Payment Processing
// ============================================
export function paymentProcessing() {
  const userId = __VU + 3000;  // Unique user per VU
  const productId = 1;  // Assume product 1 exists
  
  group('Payment Processing', () => {
    // 1. Create order first
    let res = http.post(`${BASE_URL}/api/orders/from-product`,
      JSON.stringify({
        userId: userId,
        productId: productId,
        quantity: 1,
        pointAmount: null,
        couponId: null
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    
    const orderId = JSON.parse(res.body).orderId;
    sleep(1);

    // 2. Create payment
    res = http.post(`${BASE_URL}/api/payments`,
      JSON.stringify({
        orderId: orderId,
        paymentMethod: 'CREDIT_CARD'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    
    check(res, {
      'create payment status is 201': (r) => r.status === 201,
      'payment has id': (r) => JSON.parse(r.body).id !== undefined,
      'payment status is COMPLETED': (r) => JSON.parse(r.body).status === 'COMPLETED',
    });
  });
}

// ============================================
// EXAMPLE 5: Coupon First-Come-First-Served
// ============================================
export function couponRace() {
  const userId = __VU + 4000;  // Unique user per VU
  
  group('Coupon First-Come-First-Served', () => {
    // Assume coupon 1 exists
    const couponId = 1;
    
    let res = http.post(`${BASE_URL}/api/coupons/issue`,
      JSON.stringify({
        userId: userId,
        couponId: couponId
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    
    check(res, {
      'issue coupon status is 200': (r) => r.status === 200 || r.status === 409,
      // 409 means coupon sold out (race condition - expected in load test)
    });
  });
}

// ============================================
// EXAMPLE 6: Loyalty Points
// ============================================
export function loyaltyPoints() {
  const userId = __VU + 5000;  // Unique user per VU
  
  group('Loyalty Points', () => {
    // 1. Charge points
    let res = http.post(`${BASE_URL}/api/points/charge`,
      JSON.stringify({
        userId: userId,
        amount: 100.00,
        description: 'Charge for test'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    
    check(res, {
      'charge points status is 200': (r) => r.status === 200,
      'has balance after': (r) => JSON.parse(r.body).balanceAfter !== undefined,
    });

    sleep(1);

    // 2. Get point balance
    res = http.get(`${BASE_URL}/api/points/balance`, {
      params: { userId: userId }
    });
    
    check(res, {
      'get balance status is 200': (r) => r.status === 200,
      'has balance': (r) => JSON.parse(r.body).balance !== undefined,
    });

    sleep(1);

    // 3. Get point history
    res = http.get(`${BASE_URL}/api/points/history`, {
      params: {
        userId: userId,
        page: 0,
        size: 20
      }
    });
    
    check(res, {
      'get history status is 200': (r) => r.status === 200,
      'has transactions': (r) => JSON.parse(r.body).content.length > 0,
    });
  });
}

// ============================================
// EXAMPLE 7: Complete User Journey
// ============================================
export function completeJourney() {
  const userId = __VU + 6000;  // Unique user per VU
  const productId = 1;  // Assume product 1 exists
  
  group('Complete User Journey', () => {
    // 1. Browse products
    let res = http.get(`${BASE_URL}/api/products`, {
      params: { page: 0, size: 20, sortType: 'LATEST' }
    });
    check(res, { 'browse products OK': (r) => r.status === 200 });
    sleep(1);

    // 2. Charge points
    res = http.post(`${BASE_URL}/api/points/charge`,
      JSON.stringify({
        userId: userId,
        amount: 100.00,
        description: 'Customer charge'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    check(res, { 'charge points OK': (r) => r.status === 200 });
    sleep(1);

    // 3. Add to cart
    res = http.post(`${BASE_URL}/api/carts`,
      JSON.stringify({
        userId: userId,
        productId: productId,
        quantity: 2
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    check(res, { 'add to cart OK': (r) => r.status === 200 });
    const cartId = JSON.parse(res.body).id;
    sleep(1);

    // 4. Create order from cart
    res = http.post(`${BASE_URL}/api/orders/from-cart`,
      JSON.stringify({
        userId: userId,
        cartIds: [cartId],
        pointAmount: 50.00,
        couponId: null
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    check(res, { 'create order OK': (r) => r.status === 201 });
    const orderId = JSON.parse(res.body).orderId;
    sleep(2);  // Wait for async processing

    // 5. Process payment
    res = http.post(`${BASE_URL}/api/payments`,
      JSON.stringify({
        orderId: orderId,
        paymentMethod: 'CREDIT_CARD'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    check(res, { 'process payment OK': (r) => r.status === 201 });
  });
}

// ============================================
// EXAMPLE 8: Setup/Teardown for Load Tests
// ============================================
export function setup() {
  // Create test data before load test
  let res;

  console.log('=== SETUP PHASE ===');

  // Create category
  res = http.post(`${BASE_URL}/api/categories`,
    JSON.stringify({
      name: 'Test Category',
      displayOrder: 1
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  console.log(`Created category: ${res.status}`);

  // Create product
  res = http.post(`${BASE_URL}/api/products`,
    JSON.stringify({
      name: 'Test Product',
      categoryId: 1,
      description: 'Test product for load testing',
      price: 99.99,
      stock: 1000,
      minOrderQuantity: 1,
      maxOrderQuantity: 10
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  console.log(`Created product: ${res.status}`);

  // Create coupon
  res = http.post(`${BASE_URL}/api/coupons`,
    JSON.stringify({
      name: 'Test Coupon',
      code: 'TEST2025',
      discountType: 'FIXED_AMOUNT',
      discountValue: 10.00,
      minOrderAmount: 50.00,
      totalQuantity: 500,
      perUserLimit: 1,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  console.log(`Created coupon: ${res.status}`);

  return { setupTime: new Date() };
}

export function teardown(data) {
  console.log(`=== TEARDOWN PHASE ===`);
  console.log(`Test setup time: ${data.setupTime}`);
  // Delete test data or perform cleanup
}

// ============================================
// STRESS TEST CONFIGURATION
// ============================================
export const stressTestOptions = {
  stages: [
    { duration: '10s', target: 50 },   // Ramp up to 50 VUs
    { duration: '30s', target: 100 },  // Ramp up to 100 VUs
    { duration: '30s', target: 200 },  // Ramp up to 200 VUs
    { duration: '1m', target: 200 },   // Hold at 200 VUs
    { duration: '30s', target: 100 },  // Ramp down to 100 VUs
    { duration: '10s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(99)<1000'],  // 99% of requests < 1s
    http_req_failed: ['rate<0.05'],     // Error rate < 5%
  },
};

// ============================================
// SMOKE TEST (Quick validation)
// ============================================
export const smokeTestOptions = {
  vus: 1,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<500'],
  }
};

