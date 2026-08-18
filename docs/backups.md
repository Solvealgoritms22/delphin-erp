# Backups

Los backups se generan por empresa, no como un `pg_dump` completo. El contenido se serializa con una versión de esquema, se comprime con gzip y se cifra con AES-256-GCM antes de guardarse.

## Variables requeridas

```env
BACKUP_ENCRYPTION_KEY=<32 bytes en base64 o 64 caracteres hexadecimales>
BACKUP_STORAGE_PATH=./var/backups
GOOGLE_CLIENT_ID=<OAuth client id>
GOOGLE_CLIENT_SECRET=<OAuth client secret>
GOOGLE_DRIVE_REDIRECT_URI=https://api.example.com/v1/backups/google/callback
```

El propietario inicia la conexión desde `Configuración > Copias de seguridad`. Se solicita únicamente el scope `drive.file`. El refresh token se cifra antes de persistirse y nunca se devuelve al frontend.

## Producción

1. Generar una clave diferente por ambiente y almacenarla en un Secret Manager.
2. Usar un volumen privado para `BACKUP_STORAGE_PATH` con permisos de aplicación.
3. Configurar retención, backup del volumen y monitorización de espacio.
4. Probar restauración antes de activar el primer tenant.
5. Ejecutar `npm run db:deploy --workspace=apps/api`; no usar `prisma db push`.

Los archivos no se exponen mediante una ruta estática. La descarga requiere JWT, permiso `backups:read` y que el usuario sea propietario de la empresa.
