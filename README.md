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
- **Facturación**: página web en `/facturas` para crear facturas sin Excel (numeración automática por año, memoria de clientes y precios, cálculo exacto de IVA e impresión a PDF en A4).
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
    invoices/                 facturación: importes, numeración, API y página web
  jobs/
    review.job.ts             worker periódico que envía reseñas pendientes
public/
  facturas/index.html         página de facturación (un único archivo, sin build)
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

El seed carga el catálogo real de Solid Creaciones (`prisma/data/solid-creaciones-catalog.ts`, generado a partir de `TARIFA_SOLID_MEDIDAS_Y_PESO.xlsx`): 93 SKUs de las líneas Lyam (Lamber), Adhex (Omara), Lyss (Lars), Declive (Dyagonal) y Complementos, con su peso real y medidas de embalaje, más las 12 cajas (`PackageType`) derivadas de esas medidas. Si la tarifa cambia, regenera este fichero a partir del Excel actualizado en vez de editarlo a mano.

> Nota sobre el mapeo de datos: `Product.weightGrams` se toma de la columna "PESO REAL" del Excel (peso del artículo ya embalado, listo para enviar) y `Product.lengthCm/widthCm/heightCm` de "MEDIDAS DE EMBALAJE" (largo, ancho, alto — ese orden no cambia). Como el peso real ya incluye el embalaje individual, las cajas (`PackageType`) generadas llevan `packagingWeightGrams: 0` para no contarlo dos veces; el peso máximo de cada caja es el mayor entre el tramo "HASTA X KILOS" de la tarifa y el peso real máximo observado en esa caja (dos referencias, LCD-03 y ACD-03, pesan 3,2 kg pese a estar en el tramo "hasta 3 kilos" del Excel — se ajustó al alza para que no queden fuera de catálogo).

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
| GET | `/facturas` | - | Página web de facturación (pide login al abrirse) |
| GET | `/invoices` | JWT | Lista de facturas |
| POST | `/invoices` | JWT | Crea una factura (asigna número si no se indica) |
| GET | `/invoices/next-number` | JWT | Siguiente número libre de la serie |
| GET | `/invoices/summary?year=` | JWT | Totales por trimestre (modelo 303) |
| GET | `/invoices/from-order/:orderId` | JWT | Borrador de factura a partir de un pedido |
| POST | `/invoices/autofill` | JWT | Extrae cliente/líneas/descuento de un texto pegado (IA) |
| PATCH | `/invoices/:id/status` | JWT | Cambia el estado (borrador/emitida/cobrada/anulada) |
| GET/POST | `/clients` | JWT | Clientes guardados |

## Facturación (`/facturas`)

Sustituye al Excel con el que se hacían las facturas a mano. Es **una sola página**
que se abre en el navegador: se escribe directamente encima de la factura y lo que
se ve en pantalla es exactamente lo que sale impreso en A4.

Qué hace sola:

- **Numera** la factura siguiendo la serie del año (`2026-037` → `2026-038`), sin
  huecos. La primera vez basta con escribir el número por el que se va, y a partir
  de ahí continúa sola.
- **Recuerda los clientes**: los datos de un cliente se escriben una vez y después
  se eligen por el nombre y se rellenan solos (nombre, CIF, dirección).
- **Recupera el precio** de un artículo a partir de su referencia mirando la última
  factura en la que aparece.
- **Calcula el IVA al céntimo**. El Excel anterior imprimía totales como
  `520,29999999999995` porque sumaba en coma flotante; aquí todo se redondea a
  céntimos (ver `src/modules/invoices/invoice.totals.ts` y sus tests).
- **Cupón / descuento**: un campo de "Cupón" en % o en € que resta sobre el bruto
  antes de calcular el IVA (Bruto → Descuento → Base imponible → IVA → Total), tal
  y como se hace en una factura real. Un descuento mal escrito nunca puede dejar la
  base en negativo — se limita automáticamente. La fila solo aparece impresa cuando
  hay descuento; en una factura normal no se ve.
- **IVA incluido en los precios**: un interruptor de dos botones ("No — se suma
  el IVA" / "Sí — pedido de la tienda") para cuando se copia un pedido de la tienda
  online, donde el precio que ve la clienta ya lleva el IVA dentro. Activado por
  **defecto en cada factura nueva** (es el caso normal aquí), el total que escribas
  **no se mueve** (es lo que la clienta pagó de verdad): la base imponible y la
  cuota de IVA se calculan hacia atrás a partir de ese total, en vez de sumarle IVA
  encima. Para una factura a empresa (como la del Excel original) se cambia al otro
  botón, y el IVA se añade sobre la base como en una factura tradicional.
- **Rellenar con IA**: pegas el texto que ya tengas — un pedido de WooCommerce
  copiado tal cual, un mensaje de WhatsApp, un email — y un botón ("✨ Rellenar con
  IA") extrae cliente, líneas, cantidades y descuento, y los pone en la factura.
  Usa la API de Claude con la clave de `ANTHROPIC_API_KEY` (servidor, nunca en el
  navegador); sin esa clave el botón simplemente no aparece, el resto de la
  aplicación sigue igual. La IA **nunca calcula el total ni el IVA** — solo
  extrae los datos en bruto (quién es el cliente, qué se vendió, a cuánto, si hay
  cupón); los importes siempre los calcula la misma calculadora probada del resto
  de la app (`src/modules/invoices/invoice.autofill.ts` hace la extracción,
  `invoice.totals.ts` hace las cuentas). Siempre se revisa antes de guardar. Solo
  rellena lo que el texto pegado realmente dice: si eliges el cliente a mano y
  luego le pasas a la IA solo el importe ("son 533 con el cupón de 59"), el
  cliente elegido se queda tal cual — nunca lo borra.
- **Duplica** una factura anterior con el número siguiente, para clientes que se
  repiten cada mes.
- **Resumen de IVA por trimestre** y **exportación a CSV** para la gestoría.
- **Imprimir / PDF**: usa la impresión del navegador ("Guardar como PDF"), con la
  hoja ya ajustada a A4.

Dónde se guarda: al abrirse desde el backend, las facturas van a PostgreSQL y las
comparten todos los usuarios. Si la página se abre suelta (por ejemplo, el archivo
`public/facturas/index.html` copiado a un ordenador), sigue funcionando y guarda en
ese navegador. El aviso de la esquina inferior izquierda dice siempre cuál de las
dos cosas está pasando.

El emisor, la forma de pago y el banco salen de las variables `INVOICE_*` del
`.env`. **El IBAN no está en el repositorio**: se rellena en el `.env` del servidor
o se escribe una vez en la propia página, que lo recuerda para las siguientes.

Facturar un pedido de la tienda: `GET /invoices/from-order/:orderId` devuelve el
borrador con el cliente y las líneas del pedido de WooCommerce ya rellenados, listo
para revisar y guardar.

## Variables de entorno

Ver `.env.example` para la lista completa y comentada (WooCommerce, DHL, remitente/empresa, facturación, notificador de fábrica, notificador de reseñas, SMTP).

## Despliegue en VPS de Hostinger

Hostinger VPS soporta Docker Compose vía Docker Manager. Enfoque típico:

1. Sube el proyecto a GitHub/GitLab o directamente al VPS.
2. Crea `.env` con los secretos de producción (JWT, WooCommerce, DHL, SMTP).
3. Despliega `docker-compose.yml` con Hostinger Docker Manager o `docker compose up -d --build` por SSH.
4. Pon un proxy inverso/dominio + HTTPS delante del puerto 3000 (necesario para que WooCommerce pueda llamar al webhook).
5. No expongas PostgreSQL públicamente.
6. Configura las copias de seguridad — ver la sección siguiente. Sin esto, las
   facturas solo existen en el disco del VPS.

## Copias de seguridad

**Ahora mismo, sin configurar esto, las facturas viven únicamente en el disco del
VPS.** El volumen de Docker (`postgres_data`) sí sobrevive a un `docker compose up
-d --build`, a reiniciar el contenedor o a reiniciar el servidor entero — pero si el
disco del VPS falla, se borra por accidente, o hay que reinstalar el servidor desde
cero, las facturas desaparecen con él. Para algo que hace falta guardar por
Hacienda, eso no es suficiente por sí solo.

`scripts/backup-db.sh` guarda un volcado comprimido de la base de datos
(`.sql.gz`) en `/opt/backups/solid-creaciones/` y borra los que tengan más de 30
días. Pruébalo una vez a mano:

```bash
cd /opt/SOLID-CREACIONES
./scripts/backup-db.sh
```

Para que se haga solo todos los días a las 3:00, instala el cron job una vez:

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * cd /opt/SOLID-CREACIONES && ./scripts/backup-db.sh >> /var/log/facturas-backup.log 2>&1") | crontab -
```

Eso te protege de errores dentro de la aplicación, una migración mala o un borrado
por accidente — pero **sigue estando en el mismo disco**. Para estar realmente a
salvo si el servidor entero falla, esos ficheros tienen que salir del VPS.

### Envío automático por email

Si rellenas `SMTP_HOST` y `BACKUP_EMAIL_TO` en el `.env`, cada copia se manda sola
por correo en cuanto se crea — sin instalar nada más en el servidor. Con Gmail:

1. Activa la verificación en dos pasos en tu cuenta de Google (si no la tienes ya):
   https://myaccount.google.com/security
2. Crea una **contraseña de aplicación**: https://myaccount.google.com/apppasswords
   — elige un nombre como "Facturas backup" y copia la contraseña de 16 letras que
   te da (esa, no la de tu cuenta normal).
3. En el `.env` del servidor:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=tu-correo@gmail.com
   SMTP_PASS=la contraseña de 16 letras, sin espacios
   SMTP_FROM=Facturas Innova <tu-correo@gmail.com>
   BACKUP_EMAIL_TO=tu-correo@gmail.com
   ```
4. `docker compose up -d --build` (para que el contenedor vea la carpeta de
   backups — hace falta una vez tras este cambio) y luego `./scripts/backup-db.sh`
   para probarlo. Si todo está bien, te llega un correo con el `.sql.gz` adjunto.

Si `SMTP_HOST`/`BACKUP_EMAIL_TO` no están puestos, el backup local se sigue
haciendo igual — solo se salta el envío por correo, sin dar error.

*(Estas mismas variables `SMTP_*` son las que usan las notificaciones a fábrica y
las reseñas si `FACTORY_NOTIFIER`/`REVIEW_NOTIFIER` están en `email` — configurarlas
aquí también las deja funcionando a ellas.)*

Para recuperar de un desastre (con el `.sql.gz` que corresponda):

```bash
./scripts/restore-db.sh /opt/backups/solid-creaciones/facturas-20260921-030001.sql.gz
```

## Próximos pasos recomendados antes de producción real

- Confirmar el producto DHL contratado y completar `DHL_*` (ver sección DHL arriba).
- Configurar SMTP real (o dejar `FACTORY_NOTIFIER=webhook` / `REVIEW_NOTIFIER=webhook` apuntando a Make/n8n mientras tanto).
- Cuando exista acceso a la WhatsApp Business Platform, añadir una implementación de `FactoryNotifier` (y opcionalmente de la notificación de reseñas) que la use, sin tocar el resto del pipeline.
- Validación de direcciones, empaquetado para pedidos multi-ítem irregulares.
- Cola dedicada (BullMQ/Redis) si el volumen de pedidos crece.
- Rate limiting y métricas/alertas.
