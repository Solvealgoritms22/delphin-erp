import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import Redis from 'ioredis';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Liveness Probe (Kubernetes / Azure Container Apps / AWS ECS)
   * Valida que el proceso esté vivo y respondiendo.
   */
  @Get('healthz')
  healthz() {
    return {
      status: 'ok',
      service: 'dolphin-erp-api',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness Probe (Kubernetes / Cloud Load Balancers)
   * Valida que todas las dependencias críticas (PostgreSQL, Redis) estén operativas
   * antes de enrutar tráfico de clientes al pod/contenedor.
   */
  @Get('readyz')
  async readyz() {
    const checks: Record<string, any> = {};
    let isReady = true;

    // 1. PostgreSQL Healthcheck
    try {
      const dbCheck = await this.prisma.ping();
      checks.database = {
        status: 'healthy',
        latencyMs: dbCheck.latencyMs,
      };
    } catch (error: any) {
      isReady = false;
      checks.database = {
        status: 'unhealthy',
        error: error.message || 'Database connection error',
      };
    }

    // 2. Redis Cache Healthcheck (si está configurado en la nube)
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      try {
        const client = process.env.REDIS_URL
          ? new Redis(process.env.REDIS_URL, {
              connectTimeout: 2500,
              maxRetriesPerRequest: 1,
              lazyConnect: true,
            })
          : new Redis({
              host: process.env.REDIS_HOST || 'localhost',
              port: Number(process.env.REDIS_PORT) || 6379,
              connectTimeout: 2500,
              maxRetriesPerRequest: 1,
              lazyConnect: true,
            });
        await client.connect();
        const start = Date.now();
        const pong = await client.ping();
        checks.redis = {
          status: pong === 'PONG' ? 'healthy' : 'degraded',
          latencyMs: Date.now() - start,
        };
        client.disconnect();
      } catch (error: any) {
        // En caso de que Redis falle en nube, marcar aviso
        checks.redis = {
          status: 'unhealthy',
          error: error.message || 'Redis connection timeout',
        };
      }
    } else {
      checks.redis = {
        status: 'disabled',
        notice: 'Redis no configurado (modo monoproceso)',
      };
    }

    // 3. System Resources
    const mem = process.memoryUsage();
    checks.memory = {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    };

    if (!isReady) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        checks,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
