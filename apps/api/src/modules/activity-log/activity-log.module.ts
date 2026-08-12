import { Module, Global } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogController } from './activity-log.controller';
import { SecurityLogsController } from './security-logs.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Global() // Global so any module can inject ActivityLogService without importing this module
@Module({
  controllers: [ActivityLogController, SecurityLogsController],
  providers: [ActivityLogService, PrismaService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
