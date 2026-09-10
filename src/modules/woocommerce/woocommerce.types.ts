export interface WooCommerceAddress {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface WooCommerceLineItem {
  id?: number;
  name?: string;
  sku?: string;
  quantity: number;
  price?: string | number;
  total?: string | number;
  meta_data?: Array<{ key: string; value: unknown }>;
}

export interface WooCommerceOrderPayload {
  id: number;
  status: string;
  currency?: string;
  total?: string | number;
  order_key?: string;
  date_paid?: string | null;
  billing?: WooCommerceAddress;
  shipping?: WooCommerceAddress;
  line_items?: WooCommerceLineItem[];
  meta_data?: Array<{ key: string; value: unknown }>;
  // WooCommerce webhook "ping" test payloads look like { webhook_id, action }
  webhook_id?: number;
}
