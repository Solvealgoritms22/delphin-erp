import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as net from 'net';

export interface OwnerSmtpConfig {
  smtpEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFrom: string | null;
  smtpSecure: boolean;
}

@Injectable()
export class TenantMailerService {
  private readonly logger = new Logger(TenantMailerService.name);

  /** Lanza BadRequestException si el SMTP del propietario no está configurado */
  assertSmtpConfigured(config: OwnerSmtpConfig): void {
    if (!config.smtpEnabled) {
      throw new BadRequestException(
        'SMTP_NOT_CONFIGURED: Configura tu servidor de correo en Mi Cuenta antes de realizar esta operación.',
      );
    }
    if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
      throw new BadRequestException(
        'SMTP_NOT_CONFIGURED: El servidor de correo está incompleto (host, usuario y contraseña son requeridos).',
      );
    }
  }

  /** Envía un email usando el SMTP configurado por el propietario */
  async sendMail(
    config: OwnerSmtpConfig,
    options: { to: string; subject: string; html: string; text?: string },
  ): Promise<void> {
    this.assertSmtpConfigured(config);

    // Importación dinámica para no depender del MailerModule global
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.smtpHost!,
      port: config.smtpPort ?? 587,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser!,
        pass: config.smtpPass!,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
    });

    const fromAddress = config.smtpFrom || config.smtpUser!;

    await transporter.sendMail({
      from: `"Dolphin ERP" <${fromAddress}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    this.logger.log(`[TenantMailer] Email enviado a ${options.to} (host: ${config.smtpHost})`);
  }

  /**
   * Prueba la conectividad TCP al servidor SMTP sin enviar ningún correo.
   * Retorna { success, message, latencyMs }
   */
  async testTcpConnection(
    host: string,
    port: number,
    timeoutMs = 8000,
  ): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = new net.Socket();

      const cleanup = () => {
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        const latencyMs = Date.now() - start;
        cleanup();
        resolve({
          success: true,
          message: `Conexión TCP exitosa a ${host}:${port}`,
          latencyMs,
        });
      });

      socket.on('timeout', () => {
        cleanup();
        resolve({
          success: false,
          message: `Tiempo de espera agotado al conectar a ${host}:${port} (${timeoutMs}ms)`,
        });
      });

      socket.on('error', (err: NodeJS.ErrnoException) => {
        cleanup();
        const detail =
          err.code === 'ECONNREFUSED'
            ? 'Conexión rechazada — verifica que el puerto sea correcto'
            : err.code === 'ENOTFOUND'
              ? 'Host no encontrado — verifica que el dominio SMTP sea correcto'
              : err.message;
        resolve({ success: false, message: `Error TCP: ${detail}` });
      });

      socket.connect(port, host);
    });
  }
}
