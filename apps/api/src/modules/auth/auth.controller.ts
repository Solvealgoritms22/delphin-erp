import { ProfileDto } from '../../common/dto/resource.dto';
import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Body,
  Patch,
  Delete,
  Res,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthService } from './google-oauth.service';
import { Throttle } from '@nestjs/throttler';
import { EmailDto, OtpDto, PasswordResetDto, PasswordChangeDto, DestructiveAuthDto, RegisterDto, InvitationDto, SwitchTenantDto, GoogleStartDto, GoogleFlowDto, GoogleCompleteDto } from './dto/auth.dto';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService, private googleOAuth: GoogleOAuthService) {}

  @Post('google/start')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  googleStart(@Body() body: GoogleStartDto, @Request() req: any) {
    const origin = body.origin || req?.headers?.origin || req?.headers?.referer;
    return this.googleOAuth.start(body.challenge, typeof origin === 'string' ? origin : undefined);
  }

  @Post('google/status')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  googleStatus(@Body() body: GoogleFlowDto) { return this.googleOAuth.status(body.flowId, body.verifier); }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') denied: string,
    @Res() response: Response,
  ) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    try {
      const result = await this.googleOAuth.callback(code, state, denied);
      const origin = (result?.origin || process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');
      if (result?.rejected) {
        return response.redirect(`${origin}/auth-callback.html?error=${encodeURIComponent(result.rejected)}`);
      }
      return response.redirect(`${origin}/auth-callback.html?status=success`);
    } catch (err: any) {
      const origin = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');
      const message = err?.message || 'failed';
      return response.redirect(`${origin}/auth-callback.html?error=${encodeURIComponent(message)}`);
    }
  }

  @Post('google/complete')
  completeGoogle(@Body() body: GoogleCompleteDto, @Request() request) {
    return this.googleOAuth.complete(body.flowId, body.verifier, body.acceptedPolicies, body.companyName, body.rnc, request);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Devuelve access_token y user.',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas o cuenta inactiva.',
  })
  async login(@Request() req) {
    return this.authService.login(req.user, req);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Registrar nueva cuenta (crea empresa y membresía)',
  })
  @ApiResponse({
    status: 201,
    description: 'Cuenta creada. Retorna email y needsVerification.',
  })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('verify-account')
  @ApiOperation({ summary: 'Verificar correo electrónico de cuenta nueva' })
  @ApiResponse({
    status: 200,
    description: 'Cuenta verificada exitosamente.',
  })
  async verifyAccount(@Body() body: OtpDto) {
    return this.authService.verifyAccount(body.email, body.otp);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Reenviar código de verificación de correo' })
  @ApiResponse({
    status: 200,
    description: 'Código reenviado.',
  })
  async resendVerification(@Body() body: EmailDto) {
    return this.authService.resendVerification(body.email);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar código OTP para reset de contraseña' })
  @ApiResponse({
    status: 201,
    description: 'OTP enviado por email (si el usuario existe).',
  })
  async forgotPassword(@Body() body: EmailDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verificar código OTP' })
  async verifyOtp(@Body() body: OtpDto) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Resetear contraseña con OTP válido' })
  async resetPassword(
    @Body() body: PasswordResetDto,
  ) {
    return this.authService.resetPassword(
      body.email,
      body.otp,
      body.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  async getProfile(@CurrentUser() user: any) {
    const profile = await this.authService.getProfile(user.id);
    return {
      ...user,
      ...profile,
      name: profile?.nombre ?? user.name,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-tenant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar de empresa activa (multi-tenant)' })
  async switchTenant(
    @CurrentUser() user: any,
    @Body() body: SwitchTenantDto,
  ) {
    return this.authService.switchTenant(user.id, body.empresaId, user.authTime);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión y revocar la sesión actual' })
  async logout(@CurrentUser() user: any, @Request() req) {
    return this.authService.logout(user, req);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil y configuración' })
  async updateProfile(@CurrentUser() user: any, @Body() body: ProfileDto) {
    return this.authService.updateProfile(user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/test-smtp')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Probar configuración SMTP del perfil' })
  async testSmtpConnection(@CurrentUser() user: any) {
    return this.authService.testSmtpConnection(user.id);
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Activar cuenta mediante invitación' })
  acceptInvitation(
    @Body()
    body: InvitationDto,
  ) {
    return this.authService.acceptInvitation(
      body.token,
      body.newPassword,
      body.confirmPassword,
      body.acceptedPolicies,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña del usuario autenticado' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() body: PasswordChangeDto,
  ) {
    return this.authService.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
      user.sessionId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('account/wipe-data')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar y restablecer todos los datos del tenant' })
  async wipeData(@CurrentUser() user: any, @Body() body: DestructiveAuthDto) {
    return this.authService.wipeTenantData(user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar permanentemente la cuenta del usuario y sus datos' })
  async deleteAccount(@CurrentUser() user: any, @Body() body: DestructiveAuthDto) {
    return this.authService.deleteUserAccount(user.id, body);
  }
}
