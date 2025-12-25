import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const orderCreateDuration = new Trend('order_create_duration');
const orderGetDuration = new Trend('order_get_duration');

export const options = {
  scenarios: {
    direct_order: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [
        { duration: '1s', target: 100 },  // 1초: 100 RPS
        { duration: '1s', target: 200 },  // 1초: 200 RPS
        { duration: '1s', target: 300 },  // 1초: 300 RPS
        { duration: '1s', target: 400 },  // 1초: 400 RPS
        { duration: '1s', target: 500 },  // 1초: 500 RPS
        { duration: '10s', target: 500 }, // 10초: 500 RPS 유지
        { duration: '1s', target: 0 },    // 1초: 쿨다운
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    order_create_duration: ['p(95)<800', 'p(99)<1500'],
    order_get_duration: ['p(95)<300', 'p(99)<600'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:8083';

export default function () {
  const userId = Math.floor(Math.random() * 1000) + 1;      // 1~1000
  const productId = Math.floor(Math.random() * 40) + 1;     // 1~40
  const quantity = Math.floor(Math.random() * 3) + 1;       // 1~3

  const headers = {
    'Content-Type': 'application/json',
  };

  // 1. 상품에서 직접 주문 생성 (POST /api/orders/from-product)
  let payload = JSON.stringify({
    userId: userId,
    productId: productId,
    quantity: quantity,
    pointAmount: null,  // 포인트 사용 안함
    couponId: null      // 쿠폰 사용 안함
  });

  let res = http.post(`${BASE_URL}/api/orders/from-product`, payload, { headers });
  orderCreateDuration.add(res.timings.duration);

  const orderSuccess = check(res, {
    '주문 생성 성공': (r) => r.status === 201 || r.status === 200,
  });

  if (!orderSuccess) {
    errorRate.add(1);
    return;
  }

  sleep(1);

  // 2. 주문 목록 조회 (30% 확률)
//  if (Math.random() < 0.3) {
//    res = http.get(`${BASE_URL}/api/orders?userId=1&page=0&size=10`);
//    orderGetDuration.add(res.timings.duration);
//    check(res, {
//      '주문 목록 조회 성공': (r) => r.status === 200,
//    }) || errorRate.add(1);
//  }
//
//  sleep(1);
}