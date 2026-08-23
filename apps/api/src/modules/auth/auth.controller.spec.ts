import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    register: jest.Mock;
    forgotPassword: jest.Mock;
    verifyOtp: jest.Mock;
    resetPassword: jest.Mock;
    switchTenant: jest.Mock;
    updateProfile: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      register: jest.fn(),
      forgotPassword: jest.fn(),
      verifyOtp: jest.fn(),
      resetPassword: jest.fn(),
      switchTenant: jest.fn(),
      updateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('login delega al AuthService con req.user', async () => {
    const user = { id: 'u1' };
    authService.login.mockResolvedValue({ access_token: 't' });

    await controller.login({ user });

    expect(authService.login).toHaveBeenCalledWith(user, { user });
  });

  it('register delega el body', async () => {
    const body = { email: 'a@b.com' };
    authService.register.mockResolvedValue({ ok: true });

    await controller.register(body);

    expect(authService.register).toHaveBeenCalledWith(body);
  });

  it('forgotPassword, verifyOtp y resetPassword delegan', async () => {
    await controller.forgotPassword({ email: 'a@b.com' });
    await controller.verifyOtp({ email: 'a@b.com', otp: '111111' });
    await controller.resetPassword({
      email: 'a@b.com',
      otp: '111111',
      newPassword: 'x',
    });

    expect(authService.forgotPassword).toHaveBeenCalledWith('a@b.com');
    expect(authService.verifyOtp).toHaveBeenCalledWith('a@b.com', '111111');
    expect(authService.resetPassword).toHaveBeenCalledWith(
      'a@b.com',
      '111111',
      'x',
    );
  });

  it('getProfile devuelve el usuario autenticado', () => {
    expect(controller.getProfile({ id: 'u1' })).toEqual({ id: 'u1' });
  });

  it('switchTenant usa user.id y empresaId del body', async () => {
    await controller.switchTenant({ id: 'u1' }, { empresaId: 'e1' });
    expect(authService.switchTenant).toHaveBeenCalledWith('u1', 'e1');
  });

  it('updateProfile usa user.id', async () => {
    await controller.updateProfile({ id: 'u1' }, { name: 'Ana' });
    expect(authService.updateProfile).toHaveBeenCalledWith('u1', {
      name: 'Ana',
    });
  });
});
