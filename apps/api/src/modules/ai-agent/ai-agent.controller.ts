import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiAgentService } from './ai-agent.service';
import { ChatRequestDto, ChatResponseDto } from './ai-agent.dto';

@ApiTags('AI Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/ai')
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Get('conversations')
  @ApiOperation({
    summary: 'Get all AI conversations for current user and company',
  })
  async getConversations(@CurrentUser() user: any) {
    const empresaId = user?.empresaId;
    if (!empresaId) {
      throw new UnauthorizedException('No active company selected.');
    }
    const userId = user.id || user.sub;
    return this.aiAgentService.getConversations(empresaId, userId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a specific conversation with all messages' })
  async getConversation(@CurrentUser() user: any, @Param('id') id: string) {
    const empresaId = user?.empresaId;
    if (!empresaId) {
      throw new UnauthorizedException('No active company selected.');
    }
    const userId = user.id || user.sub;
    return this.aiAgentService.getConversation(empresaId, userId, id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new AI conversation thread' })
  async createConversation(
    @CurrentUser() user: any,
    @Body() body: { title?: string },
  ) {
    const empresaId = user?.empresaId;
    if (!empresaId) {
      throw new UnauthorizedException('No active company selected.');
    }
    const userId = user.id || user.sub;
    return this.aiAgentService.createConversation(
      empresaId,
      userId,
      body?.title,
    );
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete an AI conversation thread' })
  async deleteConversation(@CurrentUser() user: any, @Param('id') id: string) {
    const empresaId = user?.empresaId;
    if (!empresaId) {
      throw new UnauthorizedException('No active company selected.');
    }
    const userId = user.id || user.sub;
    return this.aiAgentService.deleteConversation(empresaId, userId, id);
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Interact with ERP AI Assistant with read-only database tools',
  })
  async chat(
    @CurrentUser() user: any,
    @Body() dto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const empresaId = user?.empresaId;
    if (!empresaId) {
      throw new UnauthorizedException(
        'No active company selected for this session.',
      );
    }

    return this.aiAgentService.processChat(
      empresaId,
      {
        id: user.id || user.sub,
        name: user.name,
        email: user.email,
      },
      dto,
    );
  }

  @Post('chat/stream')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stream AI assistant tokens in real-time (SSE / Token by token)',
  })
  async chatStream(
    @CurrentUser() user: any,
    @Body() dto: ChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    const empresaId = user?.empresaId;
    if (!empresaId) {
      throw new UnauthorizedException(
        'No active company selected for this session.',
      );
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    await this.aiAgentService.processChatStream(
      empresaId,
      {
        id: user.id || user.sub,
        name: user.name,
        email: user.email,
      },
      dto,
      (chunk: any) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      },
    );

    res.end();
  }

  @Get('status')
  @ApiOperation({ summary: 'Check AI Agent status and enabled features' })
  getStatus(@CurrentUser() user: any) {
    const hasExternalKey = !!(
      process.env.OPENROUTER_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GROQ_API_KEY
    );

    return {
      status: 'active',
      provider: hasExternalKey
        ? 'OpenRouter / LLM'
        : 'Ollama (Local) / Heuristic Engine',
      model:
        process.env.OLLAMA_MODEL ||
        process.env.OPENROUTER_MODEL ||
        'qwen2.5:3b',
      companyId: user?.empresaId,
      capabilities: [
        'Read-Only Database Queries',
        'Products & Catalog Insights',
        'Clients & Suppliers Directory',
        'Audit & Security Logs',
        'Executive Financial & Operational Summary',
        'Rich Markdown & Tables',
        'PostgreSQL Persistent Multi-Tenant Chats',
      ],
    };
  }
}
