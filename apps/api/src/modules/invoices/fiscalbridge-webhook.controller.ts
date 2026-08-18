import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { FiscalbridgeWebhookService } from './fiscalbridge-webhook.service';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@Controller('v1/fiscalbridge/webhook')
export class FiscalbridgeWebhookController {
  constructor(private readonly service: FiscalbridgeWebhookService) {}

  @Post(':empresaId')
  @HttpCode(HttpStatus.OK)
  handle(
    @Param('empresaId') empresaId: string,
    @Headers('x-fiscalbridge-signature') signature: string,
    @Req() request: RequestWithRawBody,
  ) {
    if (!request.rawBody)
      throw new BadRequestException(
        'Se requiere el cuerpo original del webhook',
      );
    return this.service.handle(
      empresaId,
      request.rawBody.toString('utf8'),
      signature,
      request.body,
    );
  }
}
