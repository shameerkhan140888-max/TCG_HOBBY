import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createSessionExpiry, generateSessionToken, hashPassword, normalizeEmail, validateLoginInput, validateProfileInput, validateRegisterInput, verifyPassword } from '@tcg-hobby/auth';
import { prisma } from '@tcg-hobby/database';
import type { PublicAccount, PublicSession, PublicSessionUser } from '@tcg-hobby/types';

type Credentials = { email?: unknown; password?: unknown; confirmPassword?: unknown };

function toPublicUser(user: { id: string; email: string; name: string | null }): PublicSessionUser {
  return { id: user.id, email: user.email, name: user.name };
}

@Injectable()
export class AuthService {
  private async createSession(user: { id: string; email: string; name: string | null }): Promise<PublicSession> {
    const token = generateSessionToken();
    const expires = createSessionExpiry();
    await prisma.session.create({ data: { sessionToken: token, userId: user.id, expires } });
    return { token, expiresAt: expires.toISOString(), user: toPublicUser(user) };
  }

  async login(input: Credentials): Promise<PublicSession> {
    const result = validateLoginInput({ email: String(input.email ?? ''), password: String(input.password ?? '') });
    if (!result.ok) throw new UnauthorizedException('The email or password you entered is incorrect.');

    const user = await prisma.user.findUnique({ where: { email: result.email } });
    if (!user?.passwordHash || user.role !== 'CUSTOMER' || !verifyPassword(result.password, user.passwordHash)) {
      throw new UnauthorizedException('The email or password you entered is incorrect.');
    }
    return this.createSession(user);
  }

  async register(input: Credentials): Promise<PublicSession> {
    const result = validateRegisterInput({
      email: String(input.email ?? ''),
      password: String(input.password ?? ''),
      confirmPassword: String(input.confirmPassword ?? ''),
    });
    if (!result.ok) throw new ConflictException(Object.values(result.fieldErrors)[0] ?? 'Check your account details.');
    if (await prisma.user.findUnique({ where: { email: result.email }, select: { id: true } })) {
      throw new ConflictException('An account with that email already exists.');
    }

    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(result.email),
        passwordHash: hashPassword(result.password),
        role: 'CUSTOMER',
        wishlist: { create: {} },
      },
    });
    return this.createSession(user);
  }

  tokenFromHeader(authorization?: string): string | null {
    const [scheme, token] = authorization?.trim().split(/\s+/, 2) ?? [];
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }

  async getOptionalUser(authorization?: string): Promise<PublicSessionUser | null> {
    const token = this.tokenFromHeader(authorization);
    if (!token) return null;
    const session = await prisma.session.findUnique({ where: { sessionToken: token }, include: { user: true } });
    if (!session || session.expires <= new Date() || session.user.role !== 'CUSTOMER') return null;
    return toPublicUser(session.user);
  }

  async requireUser(authorization?: string): Promise<PublicSessionUser> {
    const user = await this.getOptionalUser(authorization);
    if (!user) throw new UnauthorizedException('Sign in to continue.');
    return user;
  }

  async account(authorization?: string): Promise<PublicAccount> {
    return { user: await this.requireUser(authorization) };
  }

  async updateProfile(authorization: string | undefined, input: { name?: unknown }): Promise<PublicAccount> {
    const user = await this.requireUser(authorization);
    const result = validateProfileInput({ name: String(input.name ?? '') });
    if (!result.ok) throw new ConflictException(result.fieldErrors.name ?? 'Enter a valid name.');
    const updated = await prisma.user.update({ where: { id: user.id }, data: { name: result.name } });
    return { user: toPublicUser(updated) };
  }

  async logout(authorization?: string): Promise<{ success: true }> {
    const token = this.tokenFromHeader(authorization);
    if (token) await prisma.session.deleteMany({ where: { sessionToken: token } });
    return { success: true };
  }
}
