import { Global, Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';
@Global()
@Module({
  imports: [ActivityLogModule],
  controllers: [EmailTemplatesController],
  providers: [EmailTemplatesService],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
