import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { AiToolsService } from './ai-tools.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiAgentController],
  providers: [AiAgentService, AiToolsService],
  exports: [AiAgentService, AiToolsService],
})
export class AiAgentModule {}
