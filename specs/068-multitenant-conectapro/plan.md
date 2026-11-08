# Plan técnico

Carril completo: la iniciativa afecta contratos y datos. La primera entrega modifica solo la resolución de sesión, sin habilitar nuevas empresas ni alterar los contratos públicos.

1. Resolver la membresía por usuario y organización activa persistida, comprobando el rol en BD en cada petición. Si existe un valor activo sin membresía, denegar sin elegir otra empresa. Para sesiones antiguas sin organización activa, aceptar una sola membresía; ante ninguna o varias, denegar.
2. Mantener el alta inicial y el comportamiento de la instancia existente. Probar revocación, organización ajena y sesiones antiguas sin seleccionar organización.
3. Después, diseñar y verificar la selección de organización, aprovisionamiento, credenciales de agente, webhooks, aislamiento de datos y migraciones antes de activar multitenancy.

La instrucción del responsable de convertir ConectaPro en multitenant sustituye la limitación heredada «una instancia = un negocio»; los principios de seguridad, aislamiento y compatibilidad siguen vigentes. Esta primera etapa no declara el producto multitenant ni abre el registro.

## Implementación de la primera versión operativa

- Modo explícito `MULTITENANT=true`; administrador de plataforma por IDs internos en `PLATFORM_ADMIN_USER_IDS`, sin ascenso automático por correo o por ser propietario de una empresa.
- Alta controlada desde `/organizations`; el usuario inicial se conserva. Sesiones sin empresa seleccionada acceden al selector con su identidad autenticada.
- Nueva tabla `brain_connection` por organización: clave aleatoria cifrada, hash de autenticación, URL de despacho y salud. Las URLs las configura el administrador de plataforma; los clientes no obtienen acceso a la red interna mediante este ajuste.
- En modo multitenant no se usan BOT_API_KEY ni OPENROUTER_API_TOKEN globales como respaldo de empresas. Un agente se autentica con clave por organización y el servidor propaga ese contexto a todas las rutas bot.
- El despacho, Laboratorio y estado del cerebro resuelven configuración por organización; los indicadores en memoria se separan por organización.
- Webhooks Meta firmados obligatoriamente en modo multitenant, separados por entrada/cambio antes de persistir y procesar. Zernio requiere firma incluso si falta secreto. Unicidad de cuentas por proveedor para evitar enrutamiento ambiguo.
- Primera versión operativa con una sola réplica de aplicación; SSE en memoria por organización. Escalado horizontal y facturación quedan fuera de esta entrega y se documentan.
- Pruebas con PostgreSQL local temporal, dos empresas, cambios de organización y ataques de acceso por IDs de la otra empresa. Sin acceso a datos de producción.
