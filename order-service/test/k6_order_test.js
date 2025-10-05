import http from 'k6/http';
import { check, sleep } from 'k6';

// Simulasi 1000 request per detik
export const options = {
  scenarios: {
    high_load: {
      executor: 'constant-arrival-rate',
      rate: 1000, // 1000 requests per detik
      timeUnit: '1s',
      duration: '30s', // jalankan selama 30 detik
      preAllocatedVUs: 100, // jumlah virtual user awal
      maxVUs: 1000,         // batas maksimal virtual user
    },
  },
};

export default function () {
  const url = 'http://localhost:4000/orders';
  const payload = JSON.stringify({
    productId: '001119dd-8e66-4ad4-8f63-ebba5291291f',
    qty: 1
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  sleep(0.1);
}
