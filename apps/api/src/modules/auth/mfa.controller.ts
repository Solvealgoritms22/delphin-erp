import { Body, Controller, Get, Post, Request, UseGuards, Header } from '@nestjs/common';
import { IsString, Matches, MaxLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { MfaService } from './mfa.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

class MfaCodeDto {
  @IsString() @Matches(/^(?:\d{6}|[a-fA-F0-9 -]{32,40})$/) code!: string;
}
class MfaLoginDto extends MfaCodeDto {
  @IsString() @MaxLength(43) @Matches(/^[A-Za-z0-9_-]{43}$/) challengeToken!: string;
}
@Controller('v1/auth/mfa')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class MfaController {
  constructor(private readonly mfa: MfaService, private readonly auth: AuthService) {}
  @Post('verify') @Header('Cache-Control', 'no-store')
  async verify(@Body() body: MfaLoginDto, @Request() req: any) {
    const id = await this.mfa.complete(body.challengeToken, body.code, req);
    return this.auth.loginAfterMfa(id, req);
  }
  @Get() @UseGuards(JwtAuthGuard) @Header('Cache-Control', 'no-store')
  status(@CurrentUser() user: any) { return this.mfa.status(user.id); }
  @Post('setup') @UseGuards(JwtAuthGuard) @Header('Cache-Control', 'no-store')
  setup(@CurrentUser() user: any) { return this.mfa.setup(user); }
  @Post('enable') @UseGuards(JwtAuthGuard) @Header('Cache-Control', 'no-store')
  enable(@CurrentUser() user: any, @Body() body: MfaCodeDto) { return this.mfa.manage(user, body.code, 'enable'); }
  @Post('disable') @UseGuards(JwtAuthGuard) @Header('Cache-Control', 'no-store')
  disable(@CurrentUser() user: any, @Body() body: MfaCodeDto) { return this.mfa.manage(user, body.code, 'disable'); }
  @Post('recovery-codes') @UseGuards(JwtAuthGuard) @Header('Cache-Control', 'no-store')
  recovery(@CurrentUser() user: any, @Body() body: MfaCodeDto) { return this.mfa.manage(user, body.code, 'recovery'); }
}
