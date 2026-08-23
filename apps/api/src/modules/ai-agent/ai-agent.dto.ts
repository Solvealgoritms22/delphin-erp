import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant', 'system'] })
  @IsString()
  role: 'user' | 'assistant' | 'system';

  @ApiProperty()
  @IsString()
  content: string;
}

export class ChatRequestDto {
  @ApiProperty({ description: 'User message or query for the ERP assistant' })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Optional conversation ID to maintain multi-turn chat history',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    type: [ChatMessageDto],
    description: 'Previous message history',
  })
  @IsOptional()
  @IsArray()
  history?: ChatMessageDto[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional base64 image data URLs (up to 4 images)',
  })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Flag to enable deep analytical reasoning (thinking mode)',
  })
  @IsOptional()
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
