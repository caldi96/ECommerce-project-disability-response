import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const couponIssued = new Counter('coupon_issued');
const couponFailed = new Counter('coupon_failed');

export const options = {
  scenarios: {
    coupon_race: {
      executor: 'constant-arrival-rate',
      rate: 100,              // 초당 100개 요청
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
//    errors: ['rate<0.5'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:8083';

export default function () {
  const userId = Math.floor(Math.random() * 1000) + 1;
  const couponId = 1; // 선착순 쿠폰 ID

  const headers = {
    'Content-Type': 'application/json',
  };

  // 선착순 쿠폰 발급 시도
  const payload = JSON.stringify({
    userId: userId,
    couponId: couponId,
  });

  const res = http.post(`${BASE_URL}/api/coupons/issue`, payload, { headers });

  if (res.status === 200 || res.status === 201) {
    couponIssued.add(1);
    check(res, {
      '쿠폰 발급 성공': (r) => r.status === 200 || r.status === 201,
    });
  } else if (res.status === 400 || res.status === 409) {
    // 재고 소진 또는 중복 발급은 정상적인 비즈니스 로직
    couponFailed.add(1);
    check(res, {
      '쿠폰 발급 실패 (재고 소진 또는 중복)': (r) => r.status === 400 || r.status === 409,
    });
  } else {
    errorRate.add(1);
  }

  sleep(0.1);
}

//export function handleSummary(data) {
//  return {
//    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
//  };
//}
//
//function textSummary(data, { indent = '', enableColors = false } = {}) {
//  const issued = data.metrics.coupon_issued ? data.metrics.coupon_issued.values.count : 0;
//  const failed = data.metrics.coupon_failed ? data.metrics.coupon_failed.values.count : 0;
//
//  return `
//${indent}쿠폰 발급 테스트 결과:
//${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//${indent}✅ 발급 성공: ${issued}
//${indent}❌ 발급 실패: ${failed}
//${indent}📊 성공률: ${((issued / (issued + failed)) * 100).toFixed(2)}%
//`;
//}