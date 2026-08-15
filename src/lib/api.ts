const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
import { getIdToken } from './firebase';

export interface FileRecord {
  id?: string;
  path: string;
  content: string;
  updatedAt?: string | number;
}

export interface ProjectRecord {
  id?: string;
  name: string;
  tree: string;
  files?: FileRecord[];
  createdAt?: string | number;
  updatedAt?: string | number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string | number;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Get Firebase ID token
    const idToken = await getIdToken();
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await getIdToken();
    return !!token;
  }

  // Auth endpoints
  async register(idToken: string, username: string): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ idToken, username }),
    });
  }

  async login(idToken: string): Promise<User> {
    return this.request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Projects endpoints
  async getProjects(): Promise<ProjectRecord[]> {
    return this.request<ProjectRecord[]>('/projects');
  }

  async getProject(id: string): Promise<ProjectRecord> {
    return this.request<ProjectRecord>(`/projects/${id}`);
  }

  async createProject(name: string, tree: string = ''): Promise<ProjectRecord> {
    return this.request<ProjectRecord>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, tree }),
    });
  }

  async updateProject(id: string, data: Partial<ProjectRecord>): Promise<ProjectRecord> {
    return this.request<ProjectRecord>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  // Files endpoints
  async getProjectFiles(projectId: string): Promise<FileRecord[]> {
    return this.request<FileRecord[]>(`/files/project/${projectId}`);
  }

  async createFile(projectId: string, path: string, content: string = ''): Promise<FileRecord> {
    return this.request<FileRecord>(`/files/project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    });
  }

  async updateFile(id: string, data: Partial<FileRecord>): Promise<FileRecord> {
    return this.request<FileRecord>(`/files/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFile(id: string): Promise<void> {
    return this.request(`/files/${id}`, { method: 'DELETE' });
  }

  async bulkCreateFiles(projectId: string, files: FileRecord[]): Promise<FileRecord[]> {
    return this.request<FileRecord[]>(`/files/project/${projectId}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ files }),
    });
  }
}

export const apiClient = new ApiClient();
