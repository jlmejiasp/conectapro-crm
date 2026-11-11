# ConectaPro multitenant: especificación inicial

## Objetivo

Una instalación compartida aloja varias empresas. Cada empresa controla sus usuarios, canales, conversaciones, datos y agente. La función queda cerrada hasta cumplir los criterios de aislamiento y migración de esta especificación.

## Alcance de la primera versión

- Alta controlada de empresas por administración de plataforma; sin registro público general.
- Propietario y miembros por empresa, con sus roles. Un usuario con varias membresías selecciona una organización activa; el servidor valida esa membresía en cada solicitud.
- Pipeline y perfil iniciales creados de forma transaccional para cada empresa.
- Bandeja, contactos, pipeline, ajustes, archivos, eventos y agente aislados por organización.
- Credenciales de API de agente y configuración de despacho por organización, con rotación y revocación. La credencial autenticada determina la organización; nunca se confía en un identificador proporcionado por el cliente sin comprobarlo.
- Encaminamiento de webhooks por conexión verificada y por empresa; rechazar identificadores ambiguos y tratar correctamente entregas con eventos de varias cuentas.
- Conservar los datos y el comportamiento de la instalación existente durante la migración.

## Riesgos identificados en la base actual

1. `onUserCreated` solo crea la primera organización y `resolveMembership` escoge la primera membresía. `ALLOW_SIGNUP=true` por sí solo no crea organizaciones adicionales.
2. `resolveInstanceOrg` escoge y cachea la primera organización; `BOT_API_KEY` y la configuración del despacho son globales.
3. La marca pública toma la primera organización. El login general debe usar la marca de plataforma hasta que haya un contexto de empresa resuelto y validado.
4. El encaminador de webhooks presupone una cuenta por entrega y devuelve la primera organización encontrada. Revisar subdivisión, autenticación, idempotencia y colisiones por proveedor antes de aceptar múltiples empresas.
5. El bus SSE es local al proceso. Si se ejecuta más de una réplica, sustituirlo por transporte compartido o mantener explícitamente una sola réplica hasta disponer de él.
6. `organization_id` y `scoped()` ayudan, pero no demuestran aislamiento universal: auditar todas las consultas, relaciones, archivos, tareas y puntos de entrada. Las claves foráneas simples no garantizan que las filas relacionadas pertenezcan a la misma organización.

## Fases y puertas de salida

1. **Inventario de aislamiento.** Catalogar rutas, funciones, consultas y trabajos en segundo plano; identificar estado y configuraciones globales, credenciales y datos sin alcance. Definir relaciones e índices compuestos y los controles de base de datos necesarios.
2. **Identidad y alta.** Organización activa validada contra membresía, selector, roles, provisión transaccional y preservación de la primera organización existente. Solo el administrador autorizado puede aprovisionar empresas.
3. **Datos y canales.** Aislamiento por organización en CRUD, archivos, SSE y webhooks. Asegurar que la credencial, firma y cuenta de canal correspondan a la empresa de cada evento antes de procesarlo.
4. **Agentes.** Autenticación vinculada a organización, configuración de despacho por empresa y límites separados. Mantener el contrato single-tenant existente de forma compatible y documentar la migración; no habilitar la credencial global como acceso ambiguo en modo multitenant.
5. **Operación.** Auditoría, copias y restauración, cuotas, límites y monitorización; probar el despliegue y diseñar suspensión y facturación antes de exponer el servicio comercialmente.

## Pruebas de aceptación obligatorias

- Empresas A y B con el mismo teléfono de contacto permanecen separadas; A no puede leer, modificar, eliminar ni descargar datos o archivos de B mediante IDs conocidos.
- Una membresía revocada no conserva acceso mediante una sesión previa. Cambiar de empresa requiere una membresía válida y respeta el rol correspondiente.
- La clave del agente de A no accede ni escribe en B, tampoco mediante el proxy LLM, archivos o despachos; la revocación impide inmediatamente su uso.
- Un webhook auténtico se asigna solo a la empresa propietaria del canal; firmas inválidas y conexiones ambiguas no se procesan; entregas con múltiples cuentas no mezclan eventos.
- Los eventos SSE, trabajos, cachés y límites no filtran datos ni bloquean indebidamente a otra empresa.
- Una copia de datos existente se migra conservando organización, usuarios, mensajes, canales, credenciales y comportamiento; se ensaya restauración y vuelta atrás.
- Ejecutar las comprobaciones de CI y pruebas de integración con PostgreSQL real; documentar las que no puedan ejecutarse.

## Decisiones pendientes

Modelo exacto de administrador de plataforma, dominios y marca, proveedores de canal y facturación, límites por plan y política de datos. No abrir registro ni incorporar clientes reales hasta superar las pruebas de aislamiento.

### Actualización de seguridad

La migración 0031 añade `invitation.created_at`, requerida por el adaptador
de Better Auth actualizado. Los datos existentes se conservan y la imagen
anterior puede leer la base con la columna adicional.
