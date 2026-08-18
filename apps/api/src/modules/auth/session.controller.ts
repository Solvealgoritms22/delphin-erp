import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { SessionService } from './session.service';

@ApiTags('Sesiones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @ApiOperation({ summary: 'Listar sesiones del usuario autenticado' })
  findAll(@CurrentUser() user: any) {
    return this.sessionService.findForUser(user.id, user.sessionId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revocar una sesión específica' })
  revoke(@CurrentUser() user: any, @Param('id') id: string) {
    return this.sessionService.revoke(user.id, id);
  }

  @Post('revoke-others')
  @ApiOperation({ summary: 'Revocar todas las demás sesiones' })
  revokeOthers(@CurrentUser() user: any) {
    return this.sessionService.revokeOthers(user.id, user.sessionId);
  }
}
