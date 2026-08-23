import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreditNotesService } from './credit-notes.service';
import { CreateCreditNoteDto } from './dto/credit-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notas de Crédito')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/credit-notes')
export class CreditNotesController {
  constructor(private readonly creditNotes: CreditNotesService) {}

  @Post()
  @ApiOperation({ summary: 'Emitir nota de crédito (E34/B04) sobre una factura' })
  create(@CurrentUser() user: any, @Body() dto: CreateCreditNoteDto) {
    return this.creditNotes.create(user.empresaId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar notas de crédito de la empresa' })
  findAll(@CurrentUser() user: any, @Query('facturaId') facturaId?: string) {
    return this.creditNotes.findAll(user.empresaId, facturaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una nota de crédito' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.creditNotes.findOne(user.empresaId, id);
  }
}
