import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// 커스텀 메트릭
const errorRate = new Rate('errors');

// 테스트 옵션
export const options = {
  stages: [
    { duration: '5s', target: 200 },   // 30초 동안 20명까지 증가
    { duration: '10s', target: 500 },    // 1분 동안 50명까지 증가
    { duration: '20s', target: 500 },    // 2분 동안 50명 유지
    { duration: '5s', target: 0 },    // 30초 동안 0명으로 감소
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95%의 요청이 500ms 이하
    //http_req_failed: ['rate<0.01'],      // 실패율 1% 이하
  },
};

const BASE_URL = 'http://host.docker.internal:8083';

export default function () {
  // 1. 상품 목록 조회
  let res = http.get(`${BASE_URL}/api/products?categoryId=1&sortType=LATEST&page=0&size=20`);
  check(res, {
    '상품 목록 조회 성공': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // 2. 특정 상품 상세 조회
  res = http.get(`${BASE_URL}/api/products/1`);
  check(res, {
    '상품 상세 조회 성공': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // 3. 카테고리 목록 조회
  res = http.get(`${BASE_URL}/api/categories`);
  check(res, {
    '카테고리 목록 조회 성공': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // 4. 포인트 조회
  /*
  const userId = Math.floor(Math.random() * 100) + 1;
  res = http.get(`${BASE_URL}/api/points/${userId}`);
  check(res, {
    '포인트 조회 성공': (r) => r.status === 200 || r.status === 404,
  }) || errorRate.add(1);

  sleep(2);
  */
}