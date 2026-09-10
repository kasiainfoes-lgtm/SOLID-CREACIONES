import type { SenderInput } from './order.schema.js';

export function senderFieldsFromInput(input: SenderInput) {
  return {
    senderName: input.name,
    senderAddressLine1: input.addressLine1,
    senderAddressLine2: input.addressLine2,
    senderCity: input.city,
    senderPostalCode: input.postalCode,
    senderProvince: input.province,
    senderCountry: input.country,
    senderPhone: input.phone,
    senderEmail: input.email
  };
}
