import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(userId: string, currentSessionId?: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        usuarioId: userId,
      },
      include: {
        usuario: { select: { nombre: true, email: true, avatar: true } },
      },
      orderBy: { ultimoAcceso: 'desc' },
      take: 50,
    });
    const now = Date.now();

    return sessions.map((session: any) => ({
      id: session.id,
      personName:
        session.usuario?.nombre || session.usuario?.email || 'Usuario',
      personAvatar: session.usuario?.avatar || null,
      browserName: session.browserName || 'Navegador desconocido',
      osName: session.osName || 'Sistema desconocido',
      ipAddress: session.ipAddress || 'No disponible',
      locationCountry: session.locationCountry || 'Ubicación desconocida',
      userAgent: session.userAgent,
      createdAt: session.creadoEn,
      lastSeenAt: session.ultimoAcceso,
      isCurrent: session.id === currentSessionId,
      isActive:
        !session.revokedAt &&
        (!session.expiraEn || new Date(session.expiraEn).getTime() > now),
    }));
  }

  async revoke(userId: string, sessionId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, usuarioId: userId },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async revokeOthers(userId: string, currentSessionId?: string) {
    await this.prisma.userSession.updateMany({
      where: {
        usuarioId: userId,
        ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }
}
