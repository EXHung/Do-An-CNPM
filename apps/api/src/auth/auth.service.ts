import { ConflictException, HttpException, Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { AuthMode, AuthUser } from './auth.types';
import { hashPassword, verifyPassword } from './password';
import { decryptToken, encryptToken, readEncryptionKey } from './token-crypto';

const COOKIE_NAME = 'orbit_session';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function publicUser(user: AuthUser): AuthUser { return { id: user.id, email: user.email, displayName: user.displayName }; }
function digest(token: string): string { return createHash('sha256').update(token).digest('hex'); }

@Injectable()
export class AuthService {
  readonly mode: AuthMode;
  private readonly supabase?: SupabaseClient;
  private readonly encryptionKey?: Buffer;

  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    const mode = process.env.AUTH_MODE ?? 'local';
    if (mode !== 'local' && mode !== 'supabase') throw new Error('AUTH_MODE must be local or supabase.');
    if (mode === 'local' && process.env.NODE_ENV === 'production') throw new Error('Local auth is for learning/development only. Set AUTH_MODE=supabase in production.');
    this.mode = mode;
    if (mode === 'supabase') {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error('Supabase auth requires SUPABASE_URL and SUPABASE_ANON_KEY.');
      this.encryptionKey = readEncryptionKey(process.env.SESSION_ENCRYPTION_KEY);
      this.supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
    }
  }

  private cookieOptions() {
    return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/api/v1' };
  }

  private async issueSession(userId: string, response: Response, providerToken?: string, providerExpiresAt?: number): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    const maxAge = providerExpiresAt ? Math.max(0, Math.min(SESSION_MS, providerExpiresAt * 1000 - Date.now())) : SESSION_MS;
    const now = new Date();
    await this.db.session.deleteMany({ where: { expiresAt: { lte: now } } });
    await this.db.authAttempt.deleteMany({ where: { windowEndsAt: { lte: now } } });
    const storedToken = providerToken && this.encryptionKey ? encryptToken(providerToken, this.encryptionKey) : undefined;
    await this.db.session.create({ data: { userId, tokenHash: digest(token), providerToken: storedToken, expiresAt: new Date(now.getTime() + maxAge) } });
    response.cookie(COOKIE_NAME, token, { ...this.cookieOptions(), maxAge });
  }

  /** Counts in the database so limits survive restarts and hold across API instances. Keys are hashed. */
  async throttle(scope: 'ip' | 'email', subject: string, limit: number): Promise<void> {
    const key = digest(`${scope}:${subject}`);
    const rows = await this.db.$queryRaw<{ count: number }[]>`
      INSERT INTO "AuthAttempt" ("key", "count", "windowEndsAt")
      VALUES (${key}, 1, (now() AT TIME ZONE 'UTC') + interval '60 seconds')
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "AuthAttempt"."windowEndsAt" <= (now() AT TIME ZONE 'UTC') THEN 1 ELSE "AuthAttempt"."count" + 1 END,
        "windowEndsAt" = CASE WHEN "AuthAttempt"."windowEndsAt" <= (now() AT TIME ZONE 'UTC') THEN (now() AT TIME ZONE 'UTC') + interval '60 seconds' ELSE "AuthAttempt"."windowEndsAt" END
      RETURNING "count"`;
    if (rows[0].count > limit) throw new HttpException('Bạn đã thử quá nhiều lần. Vui lòng đợi một phút.', 429);
  }

  private token(request: Request): string | null {
    const token = request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }

  private async syncProviderUser(user: User): Promise<AuthUser> {
    if (!user.email) throw new UnauthorizedException('Tài khoản phải có địa chỉ email.');
    const name = typeof user.user_metadata?.displayName === 'string' ? user.user_metadata.displayName.slice(0, 100) : user.email.split('@')[0];
    return publicUser(await this.db.userProfile.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email.toLowerCase(), displayName: name },
      update: { email: user.email.toLowerCase(), displayName: name },
    }));
  }

  async register(input: { email: string; password: string; displayName: string }, response: Response) {
    if (this.supabase) {
      const { data, error } = await this.supabase.auth.signUp({ email: input.email, password: input.password, options: { data: { displayName: input.displayName } } });
      if (error) throw new ConflictException('Không thể đăng ký tài khoản. Vui lòng kiểm tra thông tin hoặc đăng nhập.');
      if (!data.user || !data.session) return { requiresConfirmation: true, authMode: this.mode };
      const verified = await this.supabase.auth.getUser(data.session.access_token);
      if (verified.error || !verified.data.user) throw new UnauthorizedException('Không thể xác minh tài khoản.');
      const user = await this.syncProviderUser(verified.data.user);
      await this.issueSession(user.id, response, data.session.access_token, data.session.expires_at);
      return { user, authMode: this.mode };
    }
    const exists = await this.db.userProfile.findUnique({ where: { email: input.email } });
    if (exists) throw new ConflictException('Địa chỉ email đã được sử dụng.');
    const passwordHash = await hashPassword(input.password);
    const user = await this.db.userProfile.create({ data: { email: input.email, displayName: input.displayName, passwordAccount: { create: { passwordHash } } } });
    await this.issueSession(user.id, response);
    return { user: publicUser(user), authMode: this.mode };
  }

  async login(input: { email: string; password: string }, response: Response) {
    if (this.supabase) {
      const { data, error } = await this.supabase.auth.signInWithPassword(input);
      if (error || !data.user || !data.session) throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
      const verified = await this.supabase.auth.getUser(data.session.access_token);
      if (verified.error || !verified.data.user) throw new UnauthorizedException('Không thể xác minh tài khoản.');
      const user = await this.syncProviderUser(verified.data.user);
      await this.issueSession(user.id, response, data.session.access_token, data.session.expires_at);
      return { user, authMode: this.mode };
    }
    const user = await this.db.userProfile.findUnique({ where: { email: input.email }, include: { passwordAccount: true } });
    const valid = await verifyPassword(input.password, user?.passwordAccount?.passwordHash);
    if (!user || !valid) throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    await this.issueSession(user.id, response);
    return { user: publicUser(user), authMode: this.mode };
  }

  async currentUser(request: Request): Promise<AuthUser> {
    const token = this.token(request);
    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập.');
    const session = await this.db.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: true } });
    if (!session || session.expiresAt <= new Date()) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    if (this.supabase) {
      if (!session.providerToken) throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
      const providerToken = this.encryptionKey ? decryptToken(session.providerToken, this.encryptionKey) : null;
      if (!providerToken) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
      const { data, error } = await this.supabase.auth.getUser(providerToken);
      if (error || !data.user || data.user.id !== session.userId) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    } else if (session.providerToken) throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
    return publicUser(session.user);
  }

  async logout(request: Request, response: Response) {
    const token = this.token(request);
    if (token) await this.db.session.deleteMany({ where: { tokenHash: digest(token) } });
    response.clearCookie(COOKIE_NAME, this.cookieOptions());
    return { message: 'Đã đăng xuất.' };
  }
}
