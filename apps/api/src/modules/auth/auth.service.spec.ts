import { MfaService } from './mfa.service';
import { createHash } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { createPrismaMock } from '../../test/mocks/prisma.mock';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let usersService: { findOne: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let mailerService: { sendMail: jest.Mock };

  const baseUser = {
    id: 'u1',
    email: 'a@b.com',
    passwordHash: 'hash',
    nombre: 'Ana',
    avatar: null,
    empresasPropiedad: [{ id: 'e1', estado: 'ACTIVA' }],
    membresias: [{ empresaId: 'e1', estado: 'ACTIVO', empresa: { estado: 'ACTIVA' }, role: null }],
  };

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;
    usersService = { findOne: jest.fn() };
    jwtService = { sign: jest.fn(() => 'token') };
    mailerService = { sendMail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: MfaService, useValue: { challenge: jest.fn().mockResolvedValue(null) } },
        mocks.provider,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: MailerService, useValue: mailerService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('devuelve el usuario sin passwordHash si las credenciales son válidas', async () => {
      prisma.usuario.findFirst.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('a@b.com', 'pass');

      expect(result).toBeDefined();
      expect(result.passwordHash).toBeUndefined();
      expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
        where: { email: { equals: 'a@b.com', mode: 'insensitive' } },
        include: {
          membresias: { include: { role: true, empresa: true } },
          empresasPropiedad: true,
        },
      });
    });

    it('retorna null si no hay membresía activa ni empresa propia', async () => {
      prisma.usuario.findFirst.mockResolvedValue({
        ...baseUser,
        empresasPropiedad: [],
        membresias: [{ estado: 'INACTIVO' }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      expect(await service.validateUser('a@b.com', 'pass')).toBeNull();
    });

    it('retorna null si la contraseña no coincide', async () => {
      prisma.usuario.findFirst.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      expect(await service.validateUser('a@b.com', 'wrong')).toBeNull();
    });
  });

  describe('login', () => {
    it('genera token con permisos wildcard para el owner', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        estado: 'ACTIVA', suscripcion: { plan: { nombre: 'Pro' } },
      });

      const result: any = await service.login(baseUser);

      expect(result.access_token).toBe('token');
      expect(result.user.empresaId).toBe('e1');
      expect(result.user.permissions).toEqual(['*']);
      expect(result.user.plan).toBe('Pro');
      expect(prisma.usuario.update).toHaveBeenCalled();
    });

    it('parsea permisos desde el rol de la membresía', async () => {
      prisma.empresa.findUnique.mockResolvedValue({ estado: 'ACTIVA', suscripcion: null });
      const member = {
        ...baseUser,
        empresasPropiedad: [],
        membresias: [
          {
            empresaId: 'e1',
            estado: 'ACTIVO', empresa: { estado: 'ACTIVA' },
            role: { permissions: '["a","b"]' },
          },
        ],
      };

      const result: any = await service.login(member);

      expect(result.user.permissions).toEqual(['a', 'b']);
      expect(result.user.plan).toBe('Free');
    });

    it('deja permisos vacíos si el JSON del rol está corrupto', async () => {
      prisma.empresa.findUnique.mockResolvedValue({ estado: 'ACTIVA', suscripcion: null });
      const member = {
        ...baseUser,
        empresasPropiedad: [],
        membresias: [
          {
            empresaId: 'e1',
            estado: 'ACTIVO', empresa: { estado: 'ACTIVA' },
            role: { permissions: 'not-json' },
          },
        ],
      };

      const result: any = await service.login(member);

      expect(result.user.permissions).toEqual([]);
    });

    it('registra el dispositivo y la actividad de seguridad', async () => {
      prisma.empresa.findUnique.mockResolvedValue({ estado: 'ACTIVA', suscripcion: null });
      prisma.userSession.findMany.mockResolvedValue([]);

      await service.login(baseUser, {
        ip: '10.0.0.5',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
        },
      });

      expect(prisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '10.0.0.5',
          browserName: 'Chrome',
          osName: 'Windows',
          tokenHash: expect.any(String),
        }),
      });
      expect(prisma.activityLog.create).toHaveBeenCalled();
    });

    it('reutiliza la sesión activa del mismo dispositivo', async () => {
      prisma.empresa.findUnique.mockResolvedValue({ estado: 'ACTIVA', suscripcion: null });
      prisma.userSession.findMany.mockResolvedValue([
        {
          id: 's-device',
          browserName: 'Chrome',
          osName: 'Windows',
          ipAddress: '10.0.0.5',
          ultimoAcceso: new Date(),
        },
      ]);

      const result: any = await service.login(baseUser, {
        ip: '10.0.0.5',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
        },
      });

      expect(prisma.userSession.create).not.toHaveBeenCalled();
      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 's-device' },
        data: expect.objectContaining({
          tokenHash: expect.any(String),
          expiraEn: expect.any(Date),
        }),
      });
      expect(result.user.sessionId).toBe('s-device');
    });

    it('identifica navegadores y sistemas operativos', () => {
      const helpers = service as any;
      expect(helpers.detectBrowser('Edg/120 Windows')).toBe('Edge');
      expect(helpers.detectBrowser('Firefox/120 Linux')).toBe('Firefox');
      expect(helpers.detectBrowser('Safari/17 Mac OS')).toBe('Safari');
      expect(helpers.detectBrowser('Unknown')).toBe('Navegador desconocido');
      expect(helpers.detectBrowser()).toBe('Navegador desconocido');
      expect(helpers.detectOperatingSystem('Mac OS')).toBe('macOS');
      expect(helpers.detectOperatingSystem('Android')).toBe('Android');
      expect(helpers.detectOperatingSystem('iPhone')).toBe('iOS');
      expect(helpers.detectOperatingSystem('Linux')).toBe('Linux');
      expect(helpers.detectOperatingSystem('Unknown')).toBe(
        'Sistema desconocido',
      );
      expect(helpers.detectOperatingSystem()).toBe('Sistema desconocido');
    });
  });

  describe('register', () => {
    it('crea usuario, empresa y membresía, y solicita verificación', async () => {
      prisma.usuario.create.mockResolvedValue({ id: 'u1', email: 'x@y.com' });
      prisma.empresa.create.mockResolvedValue({ id: 'e1' });

      const result = await service.register({
        email: 'x@y.com',
        password: 'secure-password-test',
      });

      expect(prisma.empresa.create).toHaveBeenCalled();
      expect(result.needsVerification).toBe(true);
      expect(result.email).toBe('x@y.com');
    });
  });

  describe('switchTenant', () => {
    it('cambia a una empresa donde el usuario es owner', async () => {
      prisma.usuario.findUnique.mockResolvedValue(baseUser);
      prisma.empresa.findUnique.mockResolvedValue({ estado: 'ACTIVA', suscripcion: null });

      const result = await service.switchTenant('u1', 'e1');

      expect(result.user.empresaId).toBe('e1');
      expect(result.user.permissions).toEqual(['*']);
    });

    it('lanza BadRequestException si el usuario no pertenece al tenant', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        ...baseUser,
        empresasPropiedad: [],
        membresias: [],
      });

      await expect(service.switchTenant('u1', 'e2')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cambia a un tenant vía membresía y toma el plan del target', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        ...baseUser,
        empresasPropiedad: [],
        membresias: [
          { empresaId: 'e2', estado: 'ACTIVO', empresa: { estado: 'ACTIVA' }, role: { permissions: '["x"]' } },
        ],
      });
      prisma.empresa.findUnique.mockResolvedValue({
        estado: 'ACTIVA', suscripcion: { plan: { nombre: 'Pro' } },
      });

      const result = await service.switchTenant('u1', 'e2');

      expect(result.user.empresaId).toBe('e2');
      expect(result.user.permissions).toEqual(['x']);
      expect(result.user.plan).toBe('Pro');
    });

    it('deja permisos vacíos si el JSON del rol está corrupto', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        ...baseUser,
        empresasPropiedad: [],
        membresias: [
          { empresaId: 'e2', estado: 'ACTIVO', empresa: { estado: 'ACTIVA' }, role: { permissions: 'oops' } },
        ],
      });
      prisma.empresa.findUnique.mockResolvedValue({ estado: 'ACTIVA', suscripcion: null });

      const result = await service.switchTenant('u1', 'e2');

      expect(result.user.permissions).toEqual([]);
      expect(result.user.plan).toBe('Free');
    });
  });

  describe('forgotPassword / verifyOtp / resetPassword', () => {
    it('forgotPassword no filtra la existencia del usuario', async () => {
      prisma.usuario.findFirst.mockResolvedValue(null);
      expect(await service.forgotPassword('ghost@x.com')).toEqual({
        success: true,
      });
      expect(mailerService.sendMail).not.toHaveBeenCalled();
    });

    it('forgotPassword genera OTP y envía email', async () => {
      prisma.usuario.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        empresasPropiedad: [{ id: 'e1', estado: 'ACTIVA' }],
      });
      prisma.usuario.update.mockResolvedValue({});

      await service.forgotPassword('a@b.com');

      expect(prisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            otpCode: expect.stringMatching(/^[a-f0-9]{64}$/),
          }),
        }),
      );
      expect(mailerService.sendMail).toHaveBeenCalled();
    });

    it('verifyOtp rechaza un OTP inválido', async () => {
      usersService.findOne.mockResolvedValue({ otpCode: createHash('sha256').update('111111').digest('hex') });
      await expect(service.verifyOtp('a@b.com', '000000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('verifyOtp acepta un OTP válido', async () => {
      usersService.findOne.mockResolvedValue({
        otpCode: createHash('sha256').update('111111').digest('hex'),
        otpExpiresAt: new Date(Date.now() + 60000),
      });

      await expect(service.verifyOtp('a@b.com', '111111')).resolves.toEqual({
        success: true,
      });
    });

    it('resetPassword rechaza un OTP inválido', async () => {
      usersService.findOne.mockResolvedValue({ otpCode: createHash('sha256').update('111111').digest('hex') });

      await expect(
        service.resetPassword('a@b.com', '999999', 'new-password-test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('resetPassword limpia el OTP tras cambiar la contraseña', async () => {
      usersService.findOne.mockResolvedValue({
        id: 'u1',
        otpCode: createHash('sha256').update('111111').digest('hex'),
        otpExpiresAt: new Date(Date.now() + 60000),
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhash');
      prisma.usuario.updateMany.mockResolvedValue({ count: 1 });

      await service.resetPassword('a@b.com', '111111', 'new-password-test');

      expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
        where: { id: 'u1', otpCode: createHash('sha256').update('111111').digest('hex'), otpExpiresAt: { gt: expect.any(Date) } },
        data: { passwordHash: 'newhash', otpCode: null, otpExpiresAt: null },
      });
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({ where: { usuarioId: 'u1', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
    });
  });

  describe('updateProfile', () => {
    it('mapea name -> nombre y actualiza', async () => {
      prisma.usuario.update.mockResolvedValue({});
      await service.updateProfile('u1', { name: 'Ana', avatar: 'x.png' });

      expect(prisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: { nombre: 'Ana', avatar: 'x.png' },
        }),
      );
    });
  });

  describe('logout', () => {
    it('revoca la sesión actual y registra el cierre', async () => {
      prisma.userSession.updateMany.mockResolvedValue({ count: 1 });
      prisma.activityLog.create.mockResolvedValue({});

      const result = await service.logout(
        { id: 'u1', sessionId: 's1', empresaId: 'e1', email: 'a@b.com' },
        { ip: '10.0.0.5', headers: { 'user-agent': 'Chrome' } },
      );

      expect(result).toEqual({ success: true });
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { id: 's1', usuarioId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.activityLog.create).toHaveBeenCalled();
    });

    it('no registra actividad si no hay empresa', async () => {
      await service.logout({ id: 'u1', sessionId: 's1' });

      expect(prisma.activityLog.create).not.toHaveBeenCalled();
    });
  });
});
