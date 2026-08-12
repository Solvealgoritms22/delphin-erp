import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
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
    empresasPropiedad: [{ id: 'e1' }],
    membresias: [{ empresaId: 'e1', estado: 'ACTIVO', role: null }],
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
        where: { email: 'a@b.com' },
        include: {
          membresias: { include: { role: true } },
          empresasPropiedad: true,
        },
      });
    });

    it('lanza UnauthorizedException si no hay membresía activa ni empresa propia', async () => {
      prisma.usuario.findFirst.mockResolvedValue({
        ...baseUser,
        empresasPropiedad: [],
        membresias: [{ estado: 'INACTIVO' }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.validateUser('a@b.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
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
        suscripcion: { plan: { nombre: 'Pro' } },
      });

      const result = await service.login(baseUser);

      expect(result.access_token).toBe('token');
      expect(result.user.empresaId).toBe('e1');
      expect(result.user.permissions).toEqual(['*']);
      expect(result.user.plan).toBe('Pro');
      expect(prisma.usuario.update).toHaveBeenCalled();
    });

    it('parsea permisos desde el rol de la membresía', async () => {
      prisma.empresa.findUnique.mockResolvedValue({ suscripcion: null });
      const member = {
        ...baseUser,
        empresasPropiedad: [],
        membresias: [
          {
            empresaId: 'e1',
            estado: 'ACTIVO',
            role: { permissions: '["a","b"]' },
          },
        ],
      };

      const result = await service.login(member);

      expect(result.user.permissions).toEqual(['a', 'b']);
      expect(result.user.plan).toBe('Free');
    });

    it('deja permisos vacíos si el JSON del rol está corrupto', async () => {
      prisma.empresa.findUnique.mockResolvedValue({ suscripcion: null });
      const member = {
        ...baseUser,
        empresasPropiedad: [],
        membresias: [
          {
            empresaId: 'e1',
            estado: 'ACTIVO',
            role: { permissions: 'not-json' },
          },
        ],
      };

      const result = await service.login(member);

      expect(result.user.permissions).toEqual([]);
    });

    it('registra el dispositivo y la actividad de seguridad', async () => {
      prisma.empresa.findUnique.mockResolvedValue({ suscripcion: null });
      prisma.userSession.findMany.mockResolvedValue([]);

      await service.login(baseUser, {
        ip: '10.0.0.5',
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' },
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
      prisma.empresa.findUnique.mockResolvedValue({ suscripcion: null });
      prisma.userSession.findMany.mockResolvedValue([
        {
          id: 's-device',
          browserName: 'Chrome',
          osName: 'Windows',
          ipAddress: '10.0.0.5',
          ultimoAcceso: new Date(),
        },
      ]);

      const result = await service.login(baseUser, {
        ip: '10.0.0.5',
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' },
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
      expect(helpers.detectOperatingSystem('Unknown')).toBe('Sistema desconocido');
      expect(helpers.detectOperatingSystem()).toBe('Sistema desconocido');
    });
  });

  describe('register', () => {
    it('crea usuario, empresa y membresía, y devuelve token', async () => {
      prisma.usuario.create.mockResolvedValue({ id: 'u1', email: 'x@y.com' });
      prisma.empresa.create.mockResolvedValue({ id: 'e1' });

      const result = await service.register({
        email: 'x@y.com',
        password: '123456',
      });

      expect(prisma.empresa.create).toHaveBeenCalled();
      expect(result.access_token).toBe('token');
      expect(result.user.empresaId).toBe('e1');
    });
  });

  describe('switchTenant', () => {
    it('cambia a una empresa donde el usuario es owner', async () => {
      prisma.usuario.findUnique.mockResolvedValue(baseUser);
      prisma.empresa.findUnique.mockResolvedValue({ suscripcion: null });

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
          { empresaId: 'e2', estado: 'ACTIVO', role: { permissions: '["x"]' } },
        ],
      });
      prisma.empresa.findUnique.mockResolvedValue({
        suscripcion: { plan: { nombre: 'Pro' } },
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
          { empresaId: 'e2', estado: 'ACTIVO', role: { permissions: 'oops' } },
        ],
      });
      prisma.empresa.findUnique.mockResolvedValue({ suscripcion: null });

      const result = await service.switchTenant('u1', 'e2');

      expect(result.user.permissions).toEqual([]);
      expect(result.user.plan).toBe('Free');
    });
  });

  describe('forgotPassword / verifyOtp / resetPassword', () => {
    it('forgotPassword no filtra la existencia del usuario', async () => {
      usersService.findOne.mockResolvedValue(null);
      expect(await service.forgotPassword('ghost@x.com')).toEqual({
        success: true,
      });
      expect(mailerService.sendMail).not.toHaveBeenCalled();
    });

    it('forgotPassword genera OTP y envía email', async () => {
      usersService.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      prisma.usuario.update.mockResolvedValue({});

      await service.forgotPassword('a@b.com');

      expect(prisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            otpCode: expect.stringMatching(/^\d{6}$/),
          }),
        }),
      );
      expect(mailerService.sendMail).toHaveBeenCalled();
    });

    it('verifyOtp rechaza un OTP inválido', async () => {
      usersService.findOne.mockResolvedValue({ otpCode: '111111' });
      await expect(service.verifyOtp('a@b.com', '000000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('verifyOtp acepta un OTP válido', async () => {
      usersService.findOne.mockResolvedValue({
        otpCode: '111111',
        otpExpiresAt: new Date(Date.now() + 60000),
      });

      await expect(service.verifyOtp('a@b.com', '111111')).resolves.toEqual({
        success: true,
      });
    });

    it('resetPassword rechaza un OTP inválido', async () => {
      usersService.findOne.mockResolvedValue({ otpCode: '111111' });

      await expect(
        service.resetPassword('a@b.com', '999999', 'nueva'),
      ).rejects.toThrow(BadRequestException);
    });

    it('resetPassword limpia el OTP tras cambiar la contraseña', async () => {
      usersService.findOne.mockResolvedValue({
        id: 'u1',
        otpCode: '111111',
        otpExpiresAt: new Date(Date.now() + 60000),
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhash');
      prisma.usuario.update.mockResolvedValue({});

      await service.resetPassword('a@b.com', '111111', 'nueva');

      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { passwordHash: 'newhash', otpCode: null, otpExpiresAt: null },
      });
    });
  });

  describe('updateProfile', () => {
    it('mapea name -> nombre y actualiza', async () => {
      prisma.usuario.update.mockResolvedValue({});
      await service.updateProfile('u1', { name: 'Ana', avatar: 'x.png' });

      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { nombre: 'Ana', avatar: 'x.png' },
      });
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
