import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BackupsService } from './backups.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';
import { ActivityLogService } from '../activity-log/activity-log.service';

describe('BackupsService', () => {
  let service: BackupsService;
  let prisma: any;
  let activityLog: jest.Mocked<ActivityLogService>;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const activityLogMock = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupsService,
        mocks.provider,
        { provide: ActivityLogService, useValue: activityLogMock },
      ],
    }).compile();

    service = module.get<BackupsService>(BackupsService);
    activityLog = module.get(ActivityLogService);
  });

  describe('getSettings', () => {
    it('obtiene la configuración de backups automáticos', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'u1',
      });
      prisma.configuracionEmpresa.findUnique.mockResolvedValue({
        id: 'c1',
        empresaId: 'e1',
        backupAutoEnabled: true,
        backupFrecuencia: 'WEEKLY',
        backupHora: '03:00',
        backupDestino: 'LOCAL',
        backupRetencionDias: 14,
        ultimoBackupAuto: null,
      });
      prisma.googleDriveConnection.findUnique.mockResolvedValue(null);

      const res = await service.getSettings('u1', 'e1');

      expect(res.backupAutoEnabled).toBe(true);
      expect(res.backupFrecuencia).toBe('WEEKLY');
      expect(res.backupHora).toBe('03:00');
      expect(res.backupRetencionDias).toBe(14);
      expect(res.googleDriveConnected).toBe(false);
    });

    it('rechaza si el usuario no es propietario', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'otro_usuario',
      });

      await expect(service.getSettings('u1', 'e1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateSettings', () => {
    it('actualiza la configuración y registra en log de actividades', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'u1',
      });
      prisma.googleDriveConnection.findUnique.mockResolvedValue(null);
      prisma.configuracionEmpresa.upsert.mockResolvedValue({
        id: 'c1',
        empresaId: 'e1',
        backupAutoEnabled: true,
      });
      prisma.configuracionEmpresa.findUnique.mockResolvedValue({
        id: 'c1',
        empresaId: 'e1',
        backupAutoEnabled: true,
        backupFrecuencia: 'DAILY',
        backupHora: '02:00',
        backupDestino: 'LOCAL',
        backupRetencionDias: 7,
        ultimoBackupAuto: null,
      });

      const res = await service.updateSettings('u1', 'e1', {
        backupAutoEnabled: true,
        backupFrecuencia: 'DAILY',
        backupHora: '02:00',
        backupDestino: 'LOCAL',
        backupRetencionDias: 7,
      });

      expect(prisma.configuracionEmpresa.upsert).toHaveBeenCalled();
      expect(activityLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          modulo: 'BACKUPS',
          accion: 'UPDATE_SETTINGS',
        }),
      );
      expect(res.backupAutoEnabled).toBe(true);
    });

    it('rechaza destino GOOGLE_DRIVE si Google Drive no está conectado', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'u1',
      });
      prisma.googleDriveConnection.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSettings('u1', 'e1', {
          backupDestino: 'GOOGLE_DRIVE',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
