import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants, JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { TenantMailerService } from '../../common/tenant-mailer.service';

@Module({
  imports: [
    UsersModule,
    NotificationsModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '12h') as any },
    }),
  ],
  controllers: [AuthController, SessionController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    SessionService,
    TenantMailerService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
