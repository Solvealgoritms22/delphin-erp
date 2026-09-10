import { ProfileDto } from '../../common/dto/resource.dto';
import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Body,
  Patch,
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
import { EmailDto, OtpDto, PasswordResetDto, PasswordChangeDto, RegisterDto, InvitationDto, SwitchTenantDto, GoogleStartDto, GoogleFlowDto, GoogleCompleteDto } from './dto/auth.dto';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService, private googleOAuth: GoogleOAuthService) {}

  @Post('google/start')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  googleStart(@Body() body: GoogleStartDto) { return this.googleOAuth.start(body.challenge); }

  @Post('google/status')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  googleStatus(@Body() body: GoogleFlowDto) { return this.googleOAuth.status(body.flowId, body.verifier); }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Query('state') state: string,
    @Query('error') denied: string, @Res() response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const result = await this.googleOAuth.callback(code, state, denied);
      if (result?.rejected) {
        // El usuario está autenticado con Google pero no es elegible (ej: es colaborador).
        // Mostramos una página de rechazo específica en lugar de "Autorización completada".
        response.status(403).type('html').send(
          `<!doctype html><html lang="es"><meta charset="utf-8"><title>Dolphin ERP</title>
          <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc}
          h1{color:#dc2626;font-size:1.25rem}p{color:#374151;max-width:400px;text-align:center}</style>
          <h1>Acceso no disponible</h1><p>${result.rejected}</p>
          <p style="font-size:.85rem;color:#6b7280;margin-top:1rem">Puedes cerrar esta pestaña y regresar a Dolphin ERP.</p></html>`);
      } else {
        response.type('html').send(
          '<!doctype html><html lang="es"><meta charset="utf-8"><title>Dolphin ERP</title>'
          + '<style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc}'
          + 'h1{color:#16a34a}p{color:#374151}</style>'
          + '<h1>Autorización completada</h1><p>Regresa a Dolphin ERP para continuar. Puedes cerrar esta pestaña.</p></html>');
      }
    } catch {
      response.status(400).type('html').send(
        '<!doctype html><html lang="es"><meta charset="utf-8"><title>Dolphin ERP</title>'
        + '<h1>No se completó la autorización</h1><p>Regresa a Dolphin ERP e inténtalo de nuevo.</p></html>');
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
  getProfile(@CurrentUser() user: any) {
    return user;
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
    );
  }
}
