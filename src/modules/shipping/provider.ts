import { env } from '../../config/env.js';
import { DhlProvider } from '../dhl/dhl.provider.js';
import { MockShippingProvider } from './mock.provider.js';
import type { ShippingProvider } from './types.js';

let provider: ShippingProvider | undefined;
export function getShippingProvider(): ShippingProvider {
  if (!provider) provider = env.SHIPPING_PROVIDER === 'dhl' ? new DhlProvider() : new MockShippingProvider();
  return provider;
}
