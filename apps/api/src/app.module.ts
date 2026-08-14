import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MaintenanceMiddleware } from './maintenance.middleware';
import { LoggerModule } from 'nestjs-pino';

import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmpresasModule } from './modules/empresas/empresas.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { CatalogsModule } from './modules/catalogs/catalogs.module';
import { CommercialModule } from './modules/commercial/commercial.module';
import { RolesModule } from './modules/roles/roles.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SucursalesModule } from './modules/sucursales/sucursales.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiAgentModule } from './modules/ai-agent/ai-agent.module';
import { InventoryModule } from './modules/inventory/inventory.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.newPassword',
            'req.body.cvc',
            'req.body.cardNumber',
            'req.body.otp',
          ],
          censor: '[REDACTED]',
        },
        serializers: {
          req(req) {
            return {
              id: req.id,
              method: req.method,
              url: req.url,
              remoteAddress: req.remoteAddress,
              remotePort: req.remotePort,
            };
          },
        },
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    EmpresasModule,
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      defaults: {
        from: `"Dolphin ERP" <${process.env.SMTP_FROM}>`,
      },
    }),
    CatalogsModule,
    CommercialModule,
    RolesModule,
    DashboardModule,
    SucursalesModule,
    PaymentsModule,
    ActivityLogModule,
    NotificationsModule,
    AiAgentModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MaintenanceMiddleware).forRoutes('*');
  }
}
