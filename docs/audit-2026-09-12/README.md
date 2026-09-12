# Evidencias de auditoría

El informe principal está en ../AUDITORIA_PRODUCCION_2026-09-12.md. Los registros completos están en evidence/. Los logs vacíos de lint acotado corresponden a salida exitosa (código 0).

- reproductions.json: cinco defectos reproducidos mediante servicios API compilados y dobles de Prisma. Ejecutar `node docs/audit-2026-09-12/reproduce.cjs` después del build API. El script demuestra defectos; no es una suite de aceptación.
- module-inventory.json: inventario y cobertura medida; no certifica recorridos completos.
- schema-drift.sql: diferencia diagnóstica entre migraciones y Prisma. NO ejecutar como migración: contiene eliminaciones de restricciones SQL intencionales no representadas en Prisma.
- visual-results.json y PNG: once verificaciones sobre componentes Angular reales, con puente Electron simulado. No ejecutan un instalador.
- preview-source.ts: harness conservado como evidencia fuera de la aplicación. Sus imports son relativos a apps/desktop/src; para reconstruir la vista hay que copiarlo temporalmente allí y compilarlo como entrada alternativa hacia dist/audit-preview, retirándolo al terminar. visual-check.cjs sirve ese build en loopback y usa Edge mediante Playwright del runtime local; ajustar la ruta de Playwright en otro equipo.

La base PostgreSQL 16 fue un contenedor exclusivo de auditoría con datos sintéticos y puerto loopback. Se retiró junto con su volumen al terminar. No se modificó la base operativa.

Resultado final: builds API y Angular aprobados; 323 pruebas API y 12 Desktop pasan. Los gates globales de cobertura, lint y E2E siguen fallando según el informe. El lint acotado del actualizador pasa. No se desplegó ni publicó ningún release.
