import { ServiceUnavailableException } from '@nestjs/common';
import { MaintenanceMiddleware } from './maintenance.middleware';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

jest.mock('fs');
jest.mock('dotenv');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedDotenv = dotenv as jest.Mocked<typeof dotenv>;

describe('MaintenanceMiddleware', () => {
  let middleware: MaintenanceMiddleware;
  const next = jest.fn();
  const res = {} as any;
  const makeReq = (authorization?: string) =>
    ({
      headers: { authorization },
    }) as any;
  const tokenOf = (payload: any) =>
    `Bearer x.${Buffer.from(JSON.stringify(payload)).toString('base64')}.y`;

  beforeEach(() => {
    middleware = new MaintenanceMiddleware();
    next.mockClear();
    mockedFs.existsSync.mockReturnValue(false);
    mockedDotenv.parse.mockReturnValue({});
    delete process.env.MAINTENANCE_MODE;
    delete process.env.MAINTENANCE_TENANT_ID;
  });

  it('continúa si no hay archivo .env', () => {
    middleware.use(makeReq(), res, next);
    expect(next).toHaveBeenCalled();
  });

  it('bloquea en mantenimiento global sin tenant específico', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedDotenv.parse.mockReturnValue({ MAINTENANCE_MODE: 'true' });

    expect(() => middleware.use(makeReq(), res, next)).toThrow(
      ServiceUnavailableException,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('bloquea si el tenant del token está en la lista', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedDotenv.parse.mockReturnValue({
      MAINTENANCE_MODE: 'true',
      MAINTENANCE_TENANT_ID: 'e1, e2',
    });

    expect(() =>
      middleware.use(makeReq(tokenOf({ empresaId: 'e2' })), res, next),
    ).toThrow(ServiceUnavailableException);
  });

  it('deja pasar si el tenant del token no está en la lista', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedDotenv.parse.mockReturnValue({
      MAINTENANCE_MODE: 'true',
      MAINTENANCE_TENANT_ID: 'e1',
    });

    expect(() =>
      middleware.use(makeReq(tokenOf({ empresaId: 'e2' })), res, next),
    ).not.toThrow();
    expect(next).toHaveBeenCalled();
  });

  it('usa el fallback de process.env', () => {
    process.env.MAINTENANCE_MODE = 'true';

    expect(() => middleware.use(makeReq(), res, next)).toThrow(
      ServiceUnavailableException,
    );
  });

  it('usa el fallback de process.env con lista de tenants', () => {
    process.env.MAINTENANCE_MODE = 'true';
    process.env.MAINTENANCE_TENANT_ID = 'e1,e2';

    expect(() =>
      middleware.use(makeReq(tokenOf({ empresaId: 'e1' })), res, next),
    ).toThrow(ServiceUnavailableException);
    expect(() =>
      middleware.use(makeReq(tokenOf({ empresaId: 'e9' })), res, next),
    ).not.toThrow();
  });

  it('ignora tokens corruptos', () => {
    expect(() =>
      middleware.use(makeReq('Bearer x.badtoken.y'), res, next),
    ).not.toThrow();
    expect(next).toHaveBeenCalled();
  });
});
