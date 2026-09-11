import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  Header,
} from '@nestjs/common';
import { IsInt, IsString, MaxLength, Min, Matches } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EmailTemplatesService } from './email-templates.service';
import type { EmailKey } from './email-template.catalog';
class RevisionDto {
  @IsInt() @Min(0) revision: number;
}
class DesignDto {
  @IsString() @MaxLength(200) subject: string;
  @IsString() @MaxLength(160) heading: string;
  @IsString() @MaxLength(250000) body: string;
  @IsString() @MaxLength(1000) footer: string;
  @Matches(/^#[0-9a-fA-F]{6}$/) accent: string;
}
class SaveDto extends DesignDto {
  @IsInt() @Min(0) revision: number;
}
@Controller('v1/email-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('company:read')
export class EmailTemplatesController {
  constructor(private readonly templates: EmailTemplatesService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  list(@CurrentUser() user: any) {
    return this.templates.list(user.empresaId, user.id);
  }
  @Put(':key')
  @RequirePermissions('company:write')
  save(
    @CurrentUser() user: any,
    @Param('key') key: string,
    @Body() body: SaveDto,
    @Req() req: any,
  ) {
    return this.templates.save(
      user.empresaId,
      user.id,
      key,
      body,
      body.revision,
      req.ip,
    );
  }
  @Post(':key/reset')
  @RequirePermissions('company:write')
  reset(
    @CurrentUser() user: any,
    @Param('key') key: string,
    @Body() body: RevisionDto,
    @Req() req: any,
  ) {
    return this.templates.reset(
      user.empresaId,
      user.id,
      key,
      body.revision,
      req.ip,
    );
  }
  @Post(':key/preview')
  @Header('Cache-Control', 'no-store')
  preview(
    @CurrentUser() user: any,
    @Param('key') key: string,
    @Body() body: DesignDto,
  ) {
    return this.templates.preview(
      user.empresaId,
      user.id,
      key as EmailKey,
      body,
    );
  }
}
