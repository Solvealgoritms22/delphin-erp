import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TenantMailerService } from '../../common/tenant-mailer.service';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';

@Module({
  imports: [MailerModule, EmailTemplatesModule],
  providers: [UsersService, TenantMailerService],
  exports: [UsersService, TenantMailerService],
  controllers: [UsersController],
})
export class UsersModule {}
