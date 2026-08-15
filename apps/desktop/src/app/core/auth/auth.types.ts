export interface Empresa {
  id: string;
  razonSocial: string;
  rnc?: string | null;
  logo?: string | null;
  estado?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  mustChangePassword?: boolean;
  role: string;
  plan: string;
  empresaId?: string;
  empresas?: Empresa[];
  permissions?: string[];
  sessionId?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password?: string;
  accessMode?: 'owner' | 'member';
}
