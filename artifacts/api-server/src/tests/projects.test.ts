import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Projects API', () => {
  let authToken: string;
  let userId: number;
  let projectId: number;

  beforeAll(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'projecttest@example.com',
        username: 'projecttest',
        password: 'testpassword123',
      });
    
    authToken = registerResponse.body.token;
    userId = registerResponse.body.userId;
  });

  it('should create a new project', async () => {
    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Project',
        tree: 'src/\n  ├── App.tsx\n  └── index.css',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Test Project');
    expect(response.body.userId).toBe(userId);
    
    projectId = response.body.id;
  });

  it('should get all projects for user', async () => {
    const response = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('should get a specific project', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(projectId);
    expect(response.body.name).toBe('Test Project');
  });

  it('should update a project', async () => {
    const response = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Updated Project Name',
      });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated Project Name');
  });

  it('should not update project without auth', async () => {
    const response = await request(app)
      .put(`/api/projects/${projectId}`)
      .send({
        name: 'Unauthorized Update',
      });

    expect(response.status).toBe(401);
  });

  it('should delete a project', async () => {
    const response = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
  });

  it('should not access deleted project', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(404);
  });
});
