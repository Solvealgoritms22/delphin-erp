import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SequencesService } from './sequences.service';
import { CreateSequenceDto, UpdateSequenceDto } from './dto/sequence.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Secuencias NCF')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/sequences')
export class SequencesController {
  constructor(private readonly sequencesService: SequencesService) {}

  @Post()
  @RequirePermissions('sequences:write')
  create(@CurrentUser() user: any, @Body() dto: CreateSequenceDto) {
    return this.sequencesService.create(user.empresaId, dto);
  }

  @Get()
  @RequirePermissions('sequences:read')
  findAll(@CurrentUser() user: any) {
    return this.sequencesService.findAll(user.empresaId);
  }

  @Get(':id')
  @RequirePermissions('sequences:read')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.sequencesService.findOne(user.empresaId, id);
  }

  @Put(':id')
  @RequirePermissions('sequences:write')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateSequenceDto,
  ) {
    return this.sequencesService.update(user.empresaId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('sequences:delete')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.sequencesService.delete(user.empresaId, id);
  }
}
