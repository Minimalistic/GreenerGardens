import type { AuthUser } from '../services/auth.service.js';

interface CookieSerializeOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  secure?: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    user: AuthUser;
    cookies: { [cookieName: string]: string | undefined };
  }

  interface FastifyReply {
    setCookie(name: string, value: string, options?: CookieSerializeOptions): this;
    clearCookie(name: string, options?: CookieSerializeOptions): this;
  }
}
