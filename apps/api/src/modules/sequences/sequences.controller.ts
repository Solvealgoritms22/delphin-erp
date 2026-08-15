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
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Secuencias NCF')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/sequences')
export class SequencesController {
  constructor(private readonly sequencesService: SequencesService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateSequenceDto) {
    return this.sequencesService.create(user.empresaId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.sequencesService.findAll(user.empresaId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.sequencesService.findOne(user.empresaId, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateSequenceDto,
  ) {
    return this.sequencesService.update(user.empresaId, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.sequencesService.delete(user.empresaId, id);
  }
}
