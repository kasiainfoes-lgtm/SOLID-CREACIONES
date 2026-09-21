import { z } from 'zod';

const boolFromString = (defaultValue: 'true' | 'false') =>
  z.string().optional().default(defaultValue).transform(v => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),

  // --- WooCommerce -----------------------------------------------------
  // REST API credentials (Settings > Advanced > REST API in WooCommerce).
  // Used to fetch/reconcile orders and to write order notes (tracking info).
  WOOCOMMERCE_STORE_URL: z.string().optional().default(''),
  WOOCOMMERCE_CONSUMER_KEY: z.string().optional().default(''),
  WOOCOMMERCE_CONSUMER_SECRET: z.string().optional().default(''),
  // Secret configured on the WooCommerce webhook (Settings > Advanced > Webhooks).
  // Used to validate the X-WC-Webhook-Signature HMAC on every inbound webhook.
  WOOCOMMERCE_WEBHOOK_SECRET: z.string().optional().default(''),

  // --- Shipping ----------------------------------------------------------
  SHIPPING_PROVIDER: z.enum(['mock', 'dhl']).default('mock'),

  // DHL API access. Exact endpoint paths are deliberately left blank/configurable
  // because they depend on the specific DHL product/contract (DHL Express MyDHL
  // API, DHL Parcel ES, DHL eCommerce...). Do not guess production endpoints.
  DHL_API_URL: z.string().optional().default(''),
  DHL_API_KEY: z.string().optional().default(''),
  DHL_API_SECRET: z.string().optional().default(''),
  DHL_ACCOUNT_NUMBER: z.string().optional().default(''),
  DHL_CREATE_SHIPMENT_PATH: z.string().optional().default(''),
  DHL_PICKUP_PATH: z.string().optional().default(''),
  DHL_TRACKING_PATH: z.string().optional().default(''),
  // Some DHL contracts don't support/require pickup requests through the API
  // (courier already has a scheduled route). Keep disabled until confirmed.
  DHL_PICKUP_ENABLED: boolFromString('false'),
  // Fallback transit estimate (calendar days) used only when the DHL API
  // response does not include an estimated delivery date.
  DHL_DEFAULT_TRANSIT_DAYS: z.coerce.number().int().min(0).default(2),

  // --- Company / sender defaults ------------------------------------------
  // Used as the default "remitente" whenever an order does not carry its own
  // dynamic sender data.
  COMPANY_NAME: z.string().default('Solid Creaciones'),
  COMPANY_EMAIL: z.string().default('info@solidcreaciones.es'),
  COMPANY_PHONE: z.string().optional().default(''),
  COMPANY_CIF: z.string().default('E98438799'),
  COMPANY_ADDRESS_LINE1: z.string().default('Camí del Mas de Moret, 29'),
  COMPANY_CITY: z.string().default('Alaquàs'),
  COMPANY_POSTAL_CODE: z.string().default('46970'),
  COMPANY_PROVINCE: z.string().default('València'),
  COMPANY_COUNTRY: z.string().default('ES'),

  // --- Facturación ------------------------------------------------------
  // The invoices are issued under the registered trade name, which differs
  // from the COMPANY_NAME used for shipping labels.
  INVOICE_ISSUER_NAME: z.string().default('Innova Superficies Sólidas C.B.'),
  INVOICE_ISSUER_ADDRESS_EXTRA: z.string().optional().default('POL. IND. LA GARROFERA'),
  INVOICE_DEFAULT_VAT_RATE: z.coerce.number().min(0).max(100).default(21),
  INVOICE_PAYMENT_METHOD: z.string().default('TRANSFERENCIA A LA VISTA'),
  // Bank details are printed on every invoice. Keep them in .env (not in git):
  // an empty value simply leaves the bank block off the invoice.
  INVOICE_BANK_NAME: z.string().optional().default(''),
  INVOICE_BANK_IBAN: z.string().optional().default(''),
  // "Rellenar con IA" en /facturas: extrae cliente/líneas/descuento de un
  // texto pegado (pedido, WhatsApp...) con la API de Claude. Sin esta clave,
  // el botón simplemente no aparece — el resto de la app funciona igual.
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  // Only needed if Anthropic rejects the key above with "not scoped to a
  // workspace" (400 invalid_request_error). Find it in console.anthropic.com
  // under the workspace's settings — looks like "wrkspc_...". Leave empty
  // otherwise.
  ANTHROPIC_WORKSPACE_ID: z.string().optional().default(''),

  // --- Factory notification -------------------------------------------
  // WhatsApp has no official API access yet, so notifications go out over
  // email (default) or a generic outbound webhook (Make/n8n/etc.) that can
  // later be pointed at the WhatsApp Business Platform.
  FACTORY_NOTIFIER: z.enum(['email', 'webhook']).default('email'),
  FACTORY_NOTIFICATION_EMAIL: z.string().default('info@solidcreaciones.es'),
  FACTORY_NOTIFICATION_WEBHOOK_URL: z.string().optional().default(''),

  // --- Review requests -----------------------------------------------
  REVIEW_NOTIFIER: z.enum(['email', 'webhook']).default('email'),
  REVIEW_NOTIFICATION_WEBHOOK_URL: z.string().optional().default(''),
  REVIEW_LINK: z.string().default('https://g.page/r/CUH9TQjJyAHCEBM/review'),
  // Days added AFTER the shipment's estimated delivery date.
  REVIEW_DELAY_DAYS: z.coerce.number().int().min(0).default(2),
  JOB_INTERVAL_MS: z.coerce.number().int().min(5000).default(60000),

  // --- Outbound email (factory notifications, review requests) ---------
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: boolFromString('false'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('Solid Creaciones <info@solidcreaciones.es>'),

  // --- Copias de seguridad ---------------------------------------------
  // Si está puesto (junto con SMTP_*), scripts/backup-db.sh envía cada
  // volcado por email a esta dirección — la forma sencilla de sacarlo del
  // servidor cada noche sin instalar nada más.
  BACKUP_EMAIL_TO: z.string().optional().default('')
});

export const env = schema.parse(process.env);
