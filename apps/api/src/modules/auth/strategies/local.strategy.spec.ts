import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';

describe('LocalStrategy', () => {
  it('devuelve el usuario si las credenciales son válidas', async () => {
    const authService = {
      validateUser: jest.fn().mockResolvedValue({ id: 'u1' }),
    };
    const strategy = new LocalStrategy(authService as any);

    await expect(strategy.validate('a@b.com', 'pass')).resolves.toEqual({
      id: 'u1',
    });
    expect(authService.validateUser).toHaveBeenCalledWith(
      'a@b.com',
      'pass',
      undefined,
    );
  });

  it('lanza UnauthorizedException si las credenciales son inválidas', async () => {
    const authService = { validateUser: jest.fn().mockResolvedValue(null) };
    const strategy = new LocalStrategy(authService as any);

    await expect(strategy.validate('a@b.com', 'bad')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
