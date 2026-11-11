# Estado de la entrega 2.8.0

- [x] Validar la organización activa y el rol contra la membresía real.
- [x] Rechazar empresa activa ajena o revocada sin elegir otra.
- [x] Conservar sesiones antiguas con una sola membresía; exigir selección ante varias.
- [x] Administración de plataforma por IDs explícitos y alta controlada de empresas.
- [x] Crear propietario, pipeline y perfil iniciales, y selector web con recarga de contexto.
- [x] Claves y destinos del agente por empresa, rotación y revocación; sin proveedor LLM global en modo multitenant.
- [x] Aislar el Kapso heredado mediante KAPSO_ORGANIZATION_ID.
- [x] Firmas obligatorias, separación de lotes, unicidad de canales y deduplicación de mensajes por empresa.
- [x] Restricciones SQL compuestas contra relaciones de empresas distintas.
- [x] SSE con comprobación de sesión y membresía, incluyendo streams ya abiertos.
- [x] Pruebas de integración local con dos empresas y agentes; alta y selección desde la interfaz.
- [x] Tipos, lint y 1.471 pruebas en configuración predeterminada y completa.
- [x] Compilación de producción final.
- [ ] Ejecutar el job de CI con PostgreSQL nativo: configurado, todavía no ejecutado en GitHub.
- [ ] Verificar carga, concurrencia, copia/restauración y proveedores reales en un entorno equivalente a producción.

Las pruebas locales de integración usan PostgreSQL WASM (PGlite). El sandbox deniega
la memoria compartida requerida por PostgreSQL nativo; por eso no se declara esa
verificación como realizada. La entrega funciona con una sola réplica, sin billing,
dominios por cliente ni alta pública. No se ha activado en la instalación existente.

- [x] Añadir la columna de fecha de creación a invitaciones y generar 0031.
