# ConectaPro multitenant

ConectaPro puede operar con varias empresas en una instalación mediante `MULTITENANT=true`.
Cada empresa conserva contactos, conversaciones, pipeline, marca, usuarios, credenciales de canales,
proveedor de IA y agente propios. La versión inicial usa **una sola réplica de aplicación**;
los eventos SSE son locales al proceso. No habilites varias réplicas hasta incorporar un transporte
compartido y probar reconexión, reparto y revocación de sesiones.

## Activar en una instalación existente

1. Conserva una copia de seguridad comprobada de PostgreSQL y del almacenamiento de archivos.
2. Compila este fork desde su código. Las imágenes publicadas por Vocero no contienen estos cambios.
3. Aplica las migraciones del fork. Añaden la conexión del agente y restricciones que impiden
   relacionar datos de empresas distintas. Los datos de la organización existente permanecen.
   Si hay duplicados de miembros o cuentas externas, o relaciones cruzadas, la migración se detiene:
   revisa los datos antes de continuar; no elimines registros automáticamente.
4. Identifica el ID interno del usuario que administrará la plataforma (`SELECT id, email FROM "user"`).
   Configura `PLATFORM_ADMIN_USER_IDS` con ese ID; para varios, sepáralos por comas.
   Ser propietario de una empresa no convierte a nadie en administrador de plataforma.
5. Configura `MULTITENANT=true`, conserva `ENCRYPTION_KEY` y `BETTER_AUTH_SECRET`, y reinicia la app.
   Conserva una sola réplica. Entra con tu cuenta y abre **Cambiar empresa**.
6. Desde **Conexión del agente**, configura el destino y genera una clave para la empresa existente.
   Configura esa clave en su agente. Se entrega una sola vez al administrador autorizado;
   el CRM la guarda cifrada y autentica su hash. Rotar o revocar invalida inmediatamente la anterior.
7. Guarda la llave del proveedor de IA de esa empresa en **Ajustes → IA**.
   En modo multitenant no se utilizan `BOT_API_KEY` ni `OPENROUTER_API_TOKEN` globales como respaldo.
   No se copian automáticamente secretos globales a nuevos clientes.
8. Configura `META_APP_SECRET` de la app Meta utilizada por la plataforma: en modo multitenant los
   webhooks Meta exigen firma. Cada empresa conecta un número/cuenta propios. Un número, cuenta
   de canal o WABA no puede asignarse a empresas diferentes.
9. Prueba la empresa existente en un entorno de ensayo antes de incorporar clientes reales.

Para revertir la activación, vuelve a la copia y configuración previas al despliegue.
No desactives simplemente la bandera después de incorporar varias empresas: el modo anterior
está diseñado para una sola empresa y la API global rechaza una resolución ambigua.

## Crear empresas

El administrador abre `/organizations`, introduce nombre e identificador de empresa y los datos
del propietario. Si la cuenta ya existe, conserva su contraseña; si es nueva, se requiere una
contraseña inicial de al menos 12 caracteres. El alta crea empresa, membresía, cinco etapas y perfil
del agente en una transacción. Si el alta del dominio falla después de crear la cuenta, esta puede
quedar sin membresía: repetir el alta con el mismo correo la reutiliza.

El registro público sigue cerrado después de la primera empresa incluso con `ALLOW_SIGNUP=true`.
El propietario puede crear cuentas de equipo para su empresa. El selector solo ofrece las empresas
con membresía vigente, salvo el administrador, que ve el directorio para aprovisionarlas. La vista
de administración no le concede automáticamente acceso a sus conversaciones.

## Kapso del despliegue anterior

Si la empresa original enviaba por Kapso, configura `KAPSO_ORGANIZATION_ID` con su ID.
Solo esa empresa utiliza `KAPSO_API_KEY` y acepta el webhook de esa conexión. Las demás
usan sus propias credenciales de Meta directamente. Sin ese enlace explícito, el modo
multitenant no usa la clave global de Kapso. Esta entrega no incorpora cuentas Kapso
independientes por empresa; conecta Meta directamente para los clientes nuevos.

## Usuarios con varias empresas

Una nueva sesión con varias membresías abre el selector. Cada solicitud comprueba la empresa activa
y el rol en BD. Una membresía revocada deniega acceso, sin pasar silenciosamente a otra empresa.
Cambiar empresa provoca recarga completa y comunica el cambio a las otras pestañas del CRM.
Los streams SSE vuelven a validar sesión y membresía al emitir eventos y en cada heartbeat.

## Agentes e integraciones

El administrador configura una conexión por empresa y entrega al agente su clave para `X-API-Key`
o `Authorization: Bearer`. El servidor deduce la empresa desde la clave; no acepta un header de
organización como autorización. El formato de los contratos de `/api/bot/*` y los despachos se
conserva. El límite autenticado se cuenta por empresa y los fallos por IP.

La URL del agente y su `/health` solo pueden configurarlos administradores de plataforma, ya que
pueden apuntar a servicios internos. Usa un agente por empresa salvo que hayas verificado que el
servicio externo separa su memoria y herramientas por `organization.id`; el CRM no puede imponer
el aislamiento dentro de otro proceso. Los secretos de WhatsApp y del proveedor LLM permanecen en
el CRM. Una empresa sin agente conectado funciona como bandeja manual.

Cada lote Meta se divide por entrada/cambio antes de persistirlo. Cada fragmento conserva su
organización; el worker vuelve a comprobarla antes de procesar, por si cambió la conexión.
Las firmas Zernio se verifican con los secretos de la empresa correspondiente; en modo multitenant
una conexión sin secreto válido no acepta entregas. Las conexiones desconocidas se descartan.

## Migraciones de defensa

`0029_tenant_relations.sql` es una migración SQL personalizada: añade índices y claves
foráneas compuestas sin sustituir las cascadas existentes. Se mantiene deliberadamente
fuera del modelo de Drizzle para conservar sus acciones originales. Usa las migraciones
versionadas; no sincronices este despliegue mediante `drizzle-kit push`, que podría
interpretar estas restricciones adicionales como diferencias que eliminar.

## Verificación

`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` y el arnés
`node --env-file=.env scripts/e2e-multitenant.mjs` (o `pnpm test:e2e:multitenant`).

El arnés se niega a ejecutarse si no es localhost, no hay mocks o el modo multitenant está apagado.
Requiere una **base local desechable**, un administrador autorizado y `E2E_ADMIN_EMAIL` /
`E2E_ADMIN_PASSWORD`. Crea datos sintéticos; no limpia empresas automáticamente para conservar la
evidencia. Reinicia el entorno entre ejecuciones si se alcanza el límite de login.

Cubre empresas y propietarios independientes, mismo teléfono en varias empresas, lecturas y
escrituras ajenas, selección sin membresía, revocación, roles, origen de mutaciones, claves por
empresa, rotación y revocación, relaciones cruzadas rechazadas por SQL y lotes de WhatsApp firmados
con mensajes despachados a dos agentes locales y deduplicación por empresa.

La CI incluye el mismo arnés con un servicio PostgreSQL nativo. La verificación local puede usar
PGlite si el sandbox impide arrancar PostgreSQL; eso no sustituye las pruebas de concurrencia,
restauración, carga y conectividad con proveedores en un entorno de ensayo equivalente a producción.

## Límites de esta entrega

Sin facturación ni planes, sin registro público de empresas, sin dominios por cliente y sin
escalado horizontal. La marca pública es ConectaPro; tras autenticarse se utiliza la de la empresa
activa. Agenda y canales opcionales conservan sus banderas de despliegue, comunes a la instalación.
El modo multitenant es optativo y las nuevas tablas/migraciones viajan también con él apagado.

### Panel de superadmin

En **Tus empresas**, el enlace **Administración de plataforma** abre `/admin`.
Desde allí se crean empresas, se busca por nombre o identificador, se filtra por
configuración de la clave del agente y se abre la ficha de cada empresa. El
panel cuenta empresas, membresías, claves de agente y conversaciones reales
con actividad en los últimos siete días.

La ficha muestra los miembros y permite restablecer su contraseña con la
contraseña actual del superadmin. El cambio afecta a la cuenta completa, cierra
sus sesiones y queda registrado en el log del servidor por IDs. Las cuentas
designadas como superadmin quedan fuera de esta operación.
