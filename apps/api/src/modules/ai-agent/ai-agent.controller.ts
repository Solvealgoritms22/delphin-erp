import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Interact with ERP AI Assistant with read-only database tools' })
  async chat(
    @CurrentUser() user: any,
    @Body() dto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const empresaId = user?.empresaId;
    if (!empresaId) {
      throw new UnauthorizedException('No active company selected for this session.');
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
      provider: hasExternalKey ? 'OpenRouter / LLM' : 'Smart ERP Heuristic Engine',
      model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
      companyId: user?.empresaId,
      capabilities: [
        'Read-Only Database Queries',
        'Products & Catalog Insights',
        'Clients & Suppliers Directory',
        'Audit & Security Logs',
        'Executive Financial & Operational Summary',
        'Rich Markdown & Tables',
      ],
    };
  }
}
