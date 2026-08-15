export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  tree: string;
  createdAt: number;
  updatedAt: number;
}

export interface File {
  id: string;
  projectId: string;
  path: string;
  content: string;
  updatedAt: number;
}

export interface CreateUserData {
  email: string;
  username: string;
}

export interface CreateProjectData {
  userId: string;
  name: string;
  tree: string;
}

export interface UpdateProjectData {
  name?: string;
  tree?: string;
  updatedAt: number;
}

export interface CreateFileData {
  projectId: string;
  path: string;
  content: string;
}

export interface UpdateFileData {
  path?: string;
  content?: string;
  updatedAt: number;
}
