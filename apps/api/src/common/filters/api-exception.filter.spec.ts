import { HttpException } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';
describe('Public error contract', () => {
  it('preserves error codes without exposing arbitrary exception fields', () => {
    const json = jest.fn(); const status = jest.fn(() => ({ json }));
    const host = { switchToHttp: () => ({ getRequest: () => ({ url: '/', id: 'request' }), getResponse: () => ({ status }) }) };
    new ApiExceptionFilter().catch(new HttpException({ message: 'Expired', code: 'TRIAL_EXPIRED', secret: 'private' }, 402), host as any);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TRIAL_EXPIRED', statusCode: 402 }));
    expect(json.mock.calls[0][0]).not.toHaveProperty('secret');
  });
});
