import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './identity';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('signup')
  signup(@Body() body: unknown) {
    return this.auth.signup(body);
  }

  @Public()
  @Post('login')
  login(@Body() body: unknown) {
    return this.auth.login(body);
  }

  @Public()
  @Post('register-invite')
  registerInvite(@Body() body: unknown) {
    return this.auth.registerInvite(body);
  }
}
