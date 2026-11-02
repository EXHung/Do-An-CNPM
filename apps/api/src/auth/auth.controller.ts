import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { parse } from '../common/validation';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthedRequest } from './auth.types';

const credentials = z.object({ email: z.string().trim().email().max(254).transform(value => value.toLowerCase()), password: z.string().min(10).max(128) }).strict();
const registration = credentials.extend({ displayName: z.string().trim().min(1).max(100) }).strict();

@Controller('api/v1')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  private async throttleIp(request: Request): Promise<void> {
    await this.auth.throttle('ip', request.ip ?? request.socket.remoteAddress ?? 'unknown', 30);
  }

  @Post('auth/register')
  async register(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.throttleIp(request);
    return this.auth.register(parse(registration, body), response);
  }

  @Post('auth/login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.throttleIp(request);
    const input = parse(credentials, body);
    await this.auth.throttle('email', input.email, 10);
    return this.auth.login(input, response);
  }

  @Post('auth/logout')
  @HttpCode(200)
  logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) { return this.auth.logout(request, response); }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthedRequest) { return { user: request.user, authMode: this.auth.mode }; }
}
