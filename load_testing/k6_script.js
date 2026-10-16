import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Warm up with 50 students
    { duration: '1m', target: 100 },   // Ramp up to 100 students
    { duration: '2m', target: 180 },   // Peak concurrency: 180 simultaneous uploaders
    { duration: '30s', target: 0 },    // Cool down
  ],
  thresholds: {
    // 95% of non-transfer API requests must complete in under 500ms
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'], // less than 1% errors
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8000';

export default function () {
  // 1. Guidelines check
  const guidelinesRes = http.get(`${BASE_URL}/api/v1/system/assignment-info`);
  check(guidelinesRes, {
    'guidelines status 200': (r) => r.status === 200,
    'guidelines latency < 200ms': (r) => r.timings.duration < 200,
  });

  // 2. Expected filename check
  const roll = `25${Math.floor(100000000 + Math.random() * 900000000)}`;
  const filenamePayload = JSON.stringify({
    roll_number: roll,
    section: 'CSE1',
    name: 'Test_Student',
  });

  const filenameRes = http.post(`${BASE_URL}/api/v1/uploads/expected-filenames`, filenamePayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(filenameRes, {
    'filename status 200': (r) => r.status === 200,
    'filename latency < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(1);
}
