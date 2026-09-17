import { env } from './env.js';
import type { Address } from '../modules/shipping/types.js';

export const COMPANY = {
  NAME: env.COMPANY_NAME,
  EMAIL: env.COMPANY_EMAIL,
  PHONE: env.COMPANY_PHONE,
  CIF: env.COMPANY_CIF,
  ADDRESS_LINE1: env.COMPANY_ADDRESS_LINE1,
  CITY: env.COMPANY_CITY,
  POSTAL_CODE: env.COMPANY_POSTAL_CODE,
  PROVINCE: env.COMPANY_PROVINCE,
  COUNTRY: env.COMPANY_COUNTRY,
  REVIEW_LINK: env.REVIEW_LINK,
  PRODUCTION_TARGET_BUSINESS_DAYS: 2
} as const;

export const COMPANY_DEFAULT_SENDER: Address = {
  name: COMPANY.NAME,
  addressLine1: COMPANY.ADDRESS_LINE1,
  city: COMPANY.CITY,
  postalCode: COMPANY.POSTAL_CODE,
  province: COMPANY.PROVINCE,
  country: COMPANY.COUNTRY,
  phone: COMPANY.PHONE || undefined,
  email: COMPANY.EMAIL
};

/**
 * Fixed data printed on every invoice. The web UI at /facturas reads this from
 * GET /invoices/settings so the boss never has to retype it.
 */
export const INVOICE_ISSUER = {
  name: env.INVOICE_ISSUER_NAME,
  addressExtra: env.INVOICE_ISSUER_ADDRESS_EXTRA,
  addressLine1: COMPANY.ADDRESS_LINE1,
  postalCode: COMPANY.POSTAL_CODE,
  city: COMPANY.CITY,
  province: COMPANY.PROVINCE,
  taxId: COMPANY.CIF,
  phone: COMPANY.PHONE,
  email: COMPANY.EMAIL,
  defaultVatRate: env.INVOICE_DEFAULT_VAT_RATE,
  defaultPaymentMethod: env.INVOICE_PAYMENT_METHOD,
  bankName: env.INVOICE_BANK_NAME,
  bankIban: env.INVOICE_BANK_IBAN
} as const;
