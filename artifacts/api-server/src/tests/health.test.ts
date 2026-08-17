import request from 'supertest';
import { app } from '../app';

describe('Health Check', () => {
  it('should return 200 for health check', async () => {
    const response = await request(app).get('/api/healthz');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});
