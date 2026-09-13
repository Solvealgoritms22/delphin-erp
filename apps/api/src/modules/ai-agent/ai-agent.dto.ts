import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
  IsBoolean,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant', 'system'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant' | 'system';

  @ApiProperty()
  @IsString()
  @MaxLength(12000)
  content: string;
}

export class ChatRequestDto {
  @ApiProperty({ description: 'User message or query for the ERP assistant' })
  @IsString()
  @MaxLength(12000)
  message: string;

  @ApiPropertyOptional({
    description: 'Optional conversation ID to maintain multi-turn chat history',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  conversationId?: string;

  @ApiPropertyOptional({
    type: [ChatMessageDto],
    description: 'Previous message history',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional base64 image data URLs (up to 4 images)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(2000000, { each: true })
  @Matches(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, { each: true })
  images?: string[];

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Flag to enable deep analytical reasoning (thinking mode)',
  })
  @IsOptional()
  @IsBoolean()
  thinking?: boolean;
}

export class ChatResponseDto {
  @ApiProperty()
  reply: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty({ type: [String] })
  toolsUsed: string[];
}
