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
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @ApiOperation({ summary: 'Iniciar autenticación de propietarios con Google' })
  googleLogin(@Res() response: Response) {
    response.redirect(this.authService.startGoogleOAuth());
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Callback OAuth de Google' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() response: Response,
  ) {
    try {
      response.redirect(
        await this.authService.handleGoogleCallback(code, state),
      );
    } catch (error: any) {
      const frontendUrl =
        process.env.FRONTEND_URL?.trim() || 'http://localhost:4200';
      response.redirect(
        `${frontendUrl}/auth/sign-in?googleError=${encodeURIComponent(error.message || 'oauth_error')}`,
      );
    }
  }

  @Post('google/complete')
  @ApiOperation({
    summary: 'Aceptar políticas y completar la configuración de Google',
  })
  completeGoogle(
    @Body()
    body: {
      code: string;
      acceptedPolicies: boolean;
      companyName?: string;
      rnc?: string;
    },
    @Request() request,
  ) {
    return this.authService.completeGoogleSetup(
      body.code,
      body.acceptedPolicies,
      body.companyName,
      body.rnc,
      request,
    );
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
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('verify-account')
  @ApiOperation({ summary: 'Verificar correo electrónico de cuenta nueva' })
  @ApiResponse({
    status: 200,
    description: 'Cuenta verificada exitosamente.',
  })
  async verifyAccount(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyAccount(body.email, body.otp);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Reenviar código de verificación de correo' })
  @ApiResponse({
    status: 200,
    description: 'Código reenviado.',
  })
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerification(body.email);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar código OTP para reset de contraseña' })
  @ApiResponse({
    status: 201,
    description: 'OTP enviado por email (si el usuario existe).',
  })
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verificar código OTP' })
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Resetear contraseña con OTP válido' })
  async resetPassword(
    @Body() body: { email: string; otp: string; newPassword: string },
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
    @Body() body: { empresaId: string },
  ) {
    return this.authService.switchTenant(user.id, body.empresaId);
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
  async updateProfile(@CurrentUser() user: any, @Body() body: any) {
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
    body: {
      token: string;
      newPassword: string;
      confirmPassword: string;
      acceptedPolicies: boolean;
    },
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
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
    );
  }
}
