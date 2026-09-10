export type Address = {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  postalCode: string;
  province?: string | null;
  country: string;
  phone?: string | null;
  email?: string | null;
};

export type Parcel = {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type CreateShipmentInput = {
  reference: string;
  service?: string;
  recipient: Address;
  sender: Address;
  parcel: Parcel;
};

export type CreateShipmentResult = {
  carrierShipmentId: string;
  trackingNumber: string;
  labelUrl?: string;
  estimatedDeliveryDate?: Date;
  raw?: unknown;
};

export type PickupInput = {
  reference: string;
  shipmentIds: string[];
  pickupAddress: Address;
  packageCount: number;
  totalWeightGrams: number;
};

export type PickupResult = { pickupRequestId: string; raw?: unknown };

export type TrackingResult = {
  status: 'pending' | 'in_transit' | 'delivered' | 'exception';
  events: Array<{
    status: string;
    description?: string;
    location?: string;
    eventDate: Date;
    raw?: unknown;
  }>;
  raw?: unknown;
};

export interface ShippingProvider {
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  requestPickup(input: PickupInput): Promise<PickupResult>;
  getTracking(trackingNumber: string): Promise<TrackingResult>;
}
