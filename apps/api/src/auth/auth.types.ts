import type { Request } from 'express';

export interface AuthUser { id: string; email: string; displayName: string }
export type AuthedRequest = Request & { user: AuthUser };
export type AuthMode = 'local' | 'supabase';
