# Solid Creaciones — Automatización de pedidos (WooCommerce → Fábrica → DHL)

Backend que automatiza:

`WooCommerce (pedido pagado) → validar SKU → obtener peso/dimensiones → crear orden de fabricación → notificar a fábrica → esperar "listo" → calcular paquete → crear envío DHL → generar etiqueta → solicitar recogida (si procede) → guardar tracking → actualizar estados → programar email de reseña → logs y manejo de errores`

## Stack

- Fastify + TypeScript (ESM, Node 22)
- PostgreSQL + Prisma (con migraciones versionadas en `prisma/migrations`)
- Docker / Docker Compose
- JWT para las rutas de administración/fábrica

## Qué implementa

- Recepción de pedidos de **WooCommerce** por webhook (`order.created` / `order.updated`) con validación de firma HMAC (`X-WC-Webhook-Signature`) e idempotencia por `X-WC-Webhook-Delivery-ID`.
- Cliente REST de WooCommerce para sincronización manual (`POST /woocommerce/sync/:wcOrderId`) cuando falta un webhook.
- Catálogo logístico por SKU (peso, dimensiones, embalaje, fábrica asignada) y modo de revisión manual cuando faltan datos.
- Órdenes de fabricación (una por fábrica involucrada), con fecha objetivo a **2 días hábiles**.
- Notificación a fábrica desacoplada vía `FactoryNotifier` (email o webhook — ver más abajo).
- Cálculo automático de paquete/caja a partir de `PackageType`.
- Proveedor de envíos desacoplado (`ShippingProvider`): **DHL** (adaptador con endpoints configurables, sin URLs de producción inventadas) y **Mock** (totalmente funcional, para pruebas).
- Remitente ("sender") **dinámico por pedido**: si el pedido no trae uno propio, se usa la dirección por defecto de Solid Creaciones.
- Recogida (`pickup`) opcional según el contrato DHL (`DHL_PICKUP_ENABLED`).
- Tracking + email de reseña programado **2 días después de la fecha estimada de entrega** del envío (no de la entrega real confirmada).
- Idempotencia de webhooks, protección contra creación duplicada de envíos (a nivel de aplicación y de base de datos), reintentos controlados en llamadas HTTP salientes.
- Logs estructurados (pino) + auditoría de negocio en `AutomationLog`.
- Endpoint de health check (`GET /health`).
- Seed de desarrollo y migraciones Prisma.

## Arquitectura de carpetas

```
src/
  app.ts                     Fastify app, rutas, parser de body crudo (para firmas)
  server.ts                  arranque + job de reseñas
  config/
    env.ts                   validación de variables de entorno (zod)
    company.ts                datos de Solid Creaciones (remitente por defecto)
  lib/
    prisma.ts, log.ts, logger.ts, date.ts, retry.ts, mailer.ts
  modules/
    woocommerce/              tipos, mapper, verificación de firma, cliente REST, rutas
    orders/                   ingestión de pedidos, sender dinámico, rutas
    products/                 catálogo de SKUs
    factory/                  cambio de estado de fabricación
    shipping/                 cálculo de paquete, orquestación de envío, tipos, rutas
    dhl/                      adaptador DHL (ShippingProvider)
    notifications/            FactoryNotifier (interfaz) + email/webhook
    reviews/                  programación y envío del email de reseña
    auth/                     login JWT
  jobs/
    review.job.ts             worker periódico que envía reseñas pendientes
```

## Puesta en marcha (Docker)

```bash
cp .env.example .env
# Rellena como mínimo: JWT_SECRET, WOOCOMMERCE_*, SMTP_* (o cambia FACTORY_NOTIFIER/REVIEW_NOTIFIER a "webhook")
docker compose up -d --build
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run seed
curl http://localhost:3000/health
```

## Puesta en marcha (local, sin Docker)

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev   # crea/actualiza la base local
npm run seed
npm run dev
```

Login de demo tras el seed: `admin@example.com` / `ChangeMe123!` (cámbialo de inmediato).

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"ChangeMe123!"}'
```

Usa el JWT devuelto como `Authorization: Bearer <token>` en las rutas protegidas.

---

## Conectar WooCommerce (pasos exactos)

1. **REST API**: en el admin de WordPress ve a *WooCommerce → Ajustes → Avanzado → API REST* y crea una clave con permisos de **Lectura/Escritura**. Copia `Consumer key` y `Consumer secret` en `WOOCOMMERCE_CONSUMER_KEY` / `WOOCOMMERCE_CONSUMER_SECRET`, y la URL de la tienda en `WOOCOMMERCE_STORE_URL`.
2. **Webhook**: en *WooCommerce → Ajustes → Avanzado → Webhooks*, crea uno (puedes repetirlo para "Order updated" si prefieres separarlos, el mismo endpoint acepta ambos):
   - Tema/Topic: `Order created` (y opcionalmente otro para `Order updated`)
   - URL de entrega: `https://tu-servidor/webhooks/woocommerce/orders`
   - Secreto: genera uno y ponlo también en `WOOCOMMERCE_WEBHOOK_SECRET` (deben coincidir exactamente).
   - Formato: `application/json` (por defecto).
3. **SKUs**: cada producto de WooCommerce debe tener el **SKU** relleno (Datos del producto → General → SKU) y ese SKU debe existir en la tabla `Product` de este backend con peso/dimensiones/fábrica asignada — si no, el pedido entra en `requires_manual_review` y no se activa la fabricación automáticamente.
4. **Teléfono y email del cliente**: se leen de los campos de *Billing* del pedido (WooCommerce ya los pide en el checkout); no hace falta configurar nada adicional.
5. **Remitente dinámico (opcional)**: si un pedido debe enviarse desde una dirección distinta a la de Solid Creaciones, puedes:
   - Añadir un `meta_data` al pedido con `key: "_solid_shipment_sender"` y `value` un objeto `{ name, addressLine1, addressLine2?, city, postalCode, province?, country?, phone?, email? }` (por ejemplo desde un plugin, un campo de checkout personalizado o una automatización previa), o
   - Llamar a `PATCH /orders/:id/sender` (autenticado) con el mismo cuerpo, después de que el pedido exista en este backend y antes de crear el envío.
   Si no se especifica, se usa la dirección de Solid Creaciones (`COMPANY_*` en `.env`).
6. **Prueba**: WooCommerce envía un payload de "ping" al crear el webhook (sin `id` de pedido); el endpoint responde `200 { ok: true, ignored: true }` y no crea nada.
7. **Reconciliación manual**: si un webhook se pierde, `POST /woocommerce/sync/:wcOrderId` (autenticado) trae el pedido por la REST API y lo procesa igual que un webhook.

No hace falta enviar peso/dimensiones desde WooCommerce: se leen del catálogo `Product` por SKU.

### Estados de pago que activan fabricación

`processing` y `completed` se tratan como **pagado**. `on-hold`/`pending` se guardan pero no activan fabricación (quedan a la espera de una actualización posterior). `cancelled`/`failed` → fallido, `refunded` → reembolsado.

---

## DHL — qué falta para conectar la API real

**No se ha inventado ningún endpoint de producción de DHL.** El adaptador (`src/modules/dhl/dhl.provider.ts`) implementa la interfaz `ShippingProvider` con:

- Autenticación HTTP Basic con `DHL_API_KEY` / `DHL_API_SECRET` (patrón habitual de la *MyDHL API* de DHL Express) — **hay que confirmar** si el producto contratado usa este esquema u otro (OAuth2, API key en header, etc.).
- Rutas (`DHL_CREATE_SHIPMENT_PATH`, `DHL_PICKUP_PATH`, `DHL_TRACKING_PATH`) y `DHL_API_URL` **vacíos por defecto**: si faltan, el adaptador lanza un error explícito en vez de intentar adivinar una URL.
- Mapeo de payload/respuesta (`mapToDhlCreateShipmentPayload`, `mapToDhlPickupPayload`, parseo de tracking) con comentarios `IMPORTANT` señalando que deben adaptarse al esquema exacto del contrato.

### Datos que faltan para activar `SHIPPING_PROVIDER=dhl` en producción

1. **Producto/contrato DHL exacto** (DHL Express *MyDHL API*, DHL Parcel ES, DHL eCommerce...) — cada uno tiene rutas y payloads distintos.
2. **Credenciales**: API key/secret (o client id/secret si es OAuth2) → `DHL_API_KEY`, `DHL_API_SECRET`.
3. **Número de cuenta/EKP** del contrato → `DHL_ACCOUNT_NUMBER`.
4. **URLs base y rutas** exactas de creación de envío, recogida y tracking de la documentación de tu cuenta developer de DHL → `DHL_API_URL`, `DHL_CREATE_SHIPMENT_PATH`, `DHL_PICKUP_PATH`, `DHL_TRACKING_PATH`.
5. **Esquema de request/response real** para adaptar `mapToDhlCreateShipmentPayload`/`mapToDhlPickupPayload` y el parseo de la respuesta (nombres de campos como `shipmentId`, `trackingNumber`, `estimatedDeliveryDate`, etc. son los más habituales pero deben confirmarse contra la documentación).
6. **¿La recogida (pickup) está incluida en el contrato?** Si no, deja `DHL_PICKUP_ENABLED=false` (por defecto) y el envío se queda en `label_created`; la recogida se gestiona por la vía que tengáis acordada con la mensajería (ruta fija, llamada telefónica, etc.). Si sí está disponible vía API, pon `DHL_PICKUP_ENABLED=true` tras validar `mapToDhlPickupPayload`.
7. **Entorno de pruebas/sandbox** de DHL, si el producto lo ofrece, para validar antes de pasar a producción.

Hasta tener estos datos, usa `SHIPPING_PROVIDER=mock` (por defecto): el flujo completo (paquete → envío → etiqueta → recogida simulada → tracking → reseña) funciona igual, con datos simulados.

---

## Notificación a fábrica (Solid Creaciones)

El WhatsApp de fábrica es un número normal sin API oficial, así que **no se ha implementado automatización de WhatsApp**. La interfaz `FactoryNotifier` (`src/modules/notifications/factory-notifier.ts`) queda desacoplada para poder añadir una implementación con la **WhatsApp Business Platform** en el futuro sin tocar el resto del pipeline.

Implementaciones disponibles hoy (selección por `FACTORY_NOTIFIER=email|webhook`):

- **`email` (por defecto)**: envía un correo a `FACTORY_NOTIFICATION_EMAIL` (por defecto `info@solidcreaciones.es`) vía SMTP (`SMTP_*` en `.env`) con el detalle del pedido y la fecha objetivo de fabricación.
- **`webhook`**: hace `POST` a `FACTORY_NOTIFICATION_WEBHOOK_URL` (por ejemplo Make/n8n), que puede a su vez enviar WhatsApp, Telegram, email o alimentar un panel — útil como puente mientras se configura WhatsApp Business Platform.

## Reseñas

El email de reseña se **programa 2 días después de la fecha estimada de entrega** del envío (no de la confirmación real de "entregado"), usando `REVIEW_DELAY_DAYS` (por defecto `2`). Se envía por `REVIEW_NOTIFIER=email|webhook` (mismo patrón que la notificación de fábrica) e incluye el enlace de reseñas:

`https://g.page/r/CUH9TQjJyAHCEBM/review`

Un worker (`src/jobs/review.job.ts`) revisa cada `JOB_INTERVAL_MS` las reseñas pendientes (`ReviewRequest.status = scheduled` y `scheduledFor <= now`) y las envía, con reintentos y registro en `AutomationLog`.

## Fábrica → envío automático

`PATCH /factory/orders/:productionOrderId/status`

```json
{ "status": "ready_for_pickup" }
```

Estados permitidos: `pending`, `in_production`, `finished`, `packed`, `ready_for_pickup`, `cancelled`. No existen pedidos urgentes ni productos personalizados: todos los pedidos siguen el mismo flujo con un objetivo de fabricación de 2 días hábiles.

Cuando **todas** las órdenes de fabricación del pedido (puede haber varias si hay ítems de fábricas distintas) están en `ready_for_pickup`, se dispara automáticamente: cálculo de paquete → creación de envío DHL → etiqueta → recogida (si procede) → guardado de tracking inicial → programación de reseña.

## Idempotencia y protección contra duplicados

- **Webhooks de WooCommerce**: se valida la firma HMAC y se registra cada `X-WC-Webhook-Delivery-ID` en `WebhookDelivery`; una entrega repetida responde `200 { duplicate: true }` sin reprocesar. Si el procesamiento falla, la entrega **no** se marca como completada, así que un reintento de WooCommerce la reprocesa de forma segura (la ingesta del pedido es en sí misma idempotente por `externalOrderId`).
- **Pedidos**: `externalOrderId` (id de WooCommerce) es único; reintentar el mismo pedido actualiza en vez de duplicar.
- **Órdenes de fabricación**: no se vuelven a crear si ya existen para ese pedido.
- **Envíos**: `Shipment.orderId` es único a nivel de base de datos, además de comprobarse antes de crear; una condición de carrera entre dos peticiones concurrentes se resuelve devolviendo el envío ya creado (`duplicate: true`) en vez de fallar o duplicar.

## Endpoints principales

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/health` | - | Comprueba conexión a base de datos |
| POST | `/webhooks/woocommerce/orders` | Firma HMAC | Webhook de WooCommerce |
| POST | `/woocommerce/sync/:wcOrderId` | JWT | Sincroniza un pedido manualmente vía REST API |
| GET | `/orders/:id` | JWT | Detalle de un pedido |
| PATCH | `/orders/:id/sender` | JWT | Fija/actualiza el remitente dinámico del pedido |
| POST | `/products` / GET `/products/:sku` | JWT | Catálogo logístico |
| PATCH | `/factory/orders/:id/status` | JWT | Cambia el estado de fabricación (dispara envío si procede) |
| POST | `/shipping/orders/:orderId/create` | JWT | Crea envío manualmente |
| POST | `/shipping/:id/refresh-tracking` | JWT | Refresca tracking DHL/mock |
| POST | `/auth/login` | - | Login admin/fábrica |

## Variables de entorno

Ver `.env.example` para la lista completa y comentada (WooCommerce, DHL, remitente/empresa, notificador de fábrica, notificador de reseñas, SMTP).

## Despliegue en VPS de Hostinger

Hostinger VPS soporta Docker Compose vía Docker Manager. Enfoque típico:

1. Sube el proyecto a GitHub/GitLab o directamente al VPS.
2. Crea `.env` con los secretos de producción (JWT, WooCommerce, DHL, SMTP).
3. Despliega `docker-compose.yml` con Hostinger Docker Manager o `docker compose up -d --build` por SSH.
4. Pon un proxy inverso/dominio + HTTPS delante del puerto 3000 (necesario para que WooCommerce pueda llamar al webhook).
5. No expongas PostgreSQL públicamente.
6. Haz backup de PostgreSQL y rota los secretos periódicamente.

## Próximos pasos recomendados antes de producción real

- Confirmar el producto DHL contratado y completar `DHL_*` (ver sección DHL arriba).
- Configurar SMTP real (o dejar `FACTORY_NOTIFIER=webhook` / `REVIEW_NOTIFIER=webhook` apuntando a Make/n8n mientras tanto).
- Cuando exista acceso a la WhatsApp Business Platform, añadir una implementación de `FactoryNotifier` (y opcionalmente de la notificación de reseñas) que la use, sin tocar el resto del pipeline.
- Validación de direcciones, empaquetado para pedidos multi-ítem irregulares.
- Cola dedicada (BullMQ/Redis) si el volumen de pedidos crece.
- Rate limiting y métricas/alertas.
