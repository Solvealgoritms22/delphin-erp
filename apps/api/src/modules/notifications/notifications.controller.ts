import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { map, Observable } from 'rxjs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificaciones del usuario y su empresa' })
  list(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unread') unread?: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.notifications.list(user.id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
      unread: unread === 'true',
      tipo,
    });
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: any) {
    return this.notifications.unreadCount(user.id);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: any) {
    return this.notifications.markAllRead(user.id);
  }

  @Delete()
  @ApiOperation({ summary: 'Eliminar todas las notificaciones del usuario' })
  clear(@CurrentUser() user: any) {
    return this.notifications.clear(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una notificación del usuario' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notifications.remove(user.id, id);
  }

  @Get('preferences')
  preferences(@CurrentUser() user: any) {
    return this.notifications.preferences(user.id);
  }

  @Patch('preferences')
  savePreference(
    @CurrentUser() user: any,
    @Body() body: { tipo: string; canal: string; habilitado: boolean },
  ) {
    return this.notifications.savePreference(
      user.id,
      body.tipo,
      body.canal,
      body.habilitado,
    );
  }

  @Post('push-subscriptions')
  savePushSubscription(
    @CurrentUser() user: any,
    @Body()
    body: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string;
    },
  ) {
    return this.notifications.savePushSubscription(user.id, body);
  }

  @Sse('stream')
  stream(@CurrentUser() user: any): Observable<MessageEvent> {
    return this.notifications
      .stream(user.id)
      .pipe(map((event) => ({ data: event.notification as object })));
  }
}
