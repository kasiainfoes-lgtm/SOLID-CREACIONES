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
