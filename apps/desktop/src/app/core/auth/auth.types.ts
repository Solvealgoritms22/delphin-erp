export type Empresa = {
  id: string;
  razonSocial: string;
  rnc?: string | null;
  logo?: string | null;
  estado?: string;
};

export type User = {
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
};

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user: User;
};

export type LoginCredentials = {
  email: string;
  password?: string;
  accessMode?: 'owner' | 'member';
};

