import { BadRequestException } from '@nestjs/common';

export function assertPassword(password: unknown): asserts password is string {
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new BadRequestException('La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes.');
  }
}
