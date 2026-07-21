import { Body, Controller, Get, Headers, Inject, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('v1')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('auth/login')
  login(@Body() body: Record<string, unknown>) { return this.auth.login(body); }

  @Post('auth/register')
  register(@Body() body: Record<string, unknown>) { return this.auth.register(body); }

  @Post('auth/logout')
  logout(@Headers('authorization') authorization?: string) { return this.auth.logout(authorization); }

  @Get('account')
  account(@Headers('authorization') authorization?: string) { return this.auth.account(authorization); }

  @Patch('account/profile')
  updateProfile(@Headers('authorization') authorization: string | undefined, @Body() body: Record<string, unknown>) {
    return this.auth.updateProfile(authorization, body);
  }
}
