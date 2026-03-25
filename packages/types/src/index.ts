export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type Role = 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};
