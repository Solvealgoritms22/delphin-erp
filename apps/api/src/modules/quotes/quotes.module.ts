import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { TenantMailerService } from '../../common/tenant-mailer.service';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';

@Module({
  imports: [PrismaModule, ActivityLogModule, EmailTemplatesModule],
  controllers: [QuotesController],
  providers: [QuotesService, TenantMailerService],
  exports: [QuotesService],
})
export class QuotesModule {}
