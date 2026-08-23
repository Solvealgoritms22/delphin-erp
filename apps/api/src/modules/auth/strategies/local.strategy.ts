import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email', passReqToCallback: true });
  }

  async validate(
    reqOrEmail: any,
    emailOrPassword: string,
    password?: string,
  ): Promise<any> {
    const legacyCall = typeof reqOrEmail === 'string';
    const req = legacyCall ? undefined : reqOrEmail;
    const email = legacyCall ? reqOrEmail : emailOrPassword;
    const actualPassword = legacyCall ? emailOrPassword : password;
    const accessMode = req?.body?.accessMode;
    const user = await this.authService.validateUser(
      email,
      actualPassword || '',
      accessMode,
    );
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return user;
  }
}
