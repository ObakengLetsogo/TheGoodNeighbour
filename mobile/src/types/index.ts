/**
 * Typed domain contracts. These mirror the REST API served by the Spring Boot backend, so the
 * mock services and the HTTP services are interchangeable. Money is always integer cents (ZAR).
 *
 * Products and services are deliberately independent of occasion types: an occasion is just a
 * tag that can be used to surface packages, never a structural dependency.
 */
import type { AccentName } from '../theme';

export type Cents = number;

export type OccasionType =
  | 'funeral'
  | 'wedding'
  | 'traditional_ceremony'
  | 'family_celebration'
  | 'community_event';

export type ProductKind = 'grocery' | 'livestock' | 'meat' | 'hamper' | 'service';

export type Availability = 'in_stock' | 'limited' | 'on_request' | 'out_of_stock';

export interface Category {
  id: string;
  name: string;
  /** Group shown in Explore: Groceries, Livestock, Meat, Hampers. */
  group: 'groceries' | 'livestock' | 'meat' | 'hampers' | 'supplies';
  accent: AccentName;
  icon: string;
  blurb: string;
}

export interface Variant {
  id: string;
  label: string;
  priceCents: Cents;
  availability?: Availability;
}

/** A separately-configured service attached to a product, e.g. preparation of livestock. */
export interface ServiceOption {
  id: string;
  name: string;
  description: string;
  priceCents: Cents;
}

export interface Product {
  id: string;
  categoryId: string;
  kind: ProductKind;
  name: string;
  description: string;
  unitLabel: string;
  /** Base price used when no variant is selected. */
  priceCents: Cents;
  variants?: Variant[];
  serviceOptions?: ServiceOption[];
  availability: Availability;
  stock?: number;
  imageUrl?: string;
  /** What's inside, for hampers and bundles. */
  includes?: string[];
  deliveryInfo?: string;
  tags?: string[];
  /** Id of the supplier fulfilling this product. Lets us add multiple suppliers later. */
  supplierId?: string;
}

export interface PackageLine {
  productId: string;
  variantId?: string;
  quantity: number;
  /** Optional lines can be removed by the customer. */
  optional: boolean;
}

export interface PackageDef {
  id: string;
  name: string;
  description: string;
  /** e.g. "Around 40 people". Only shown where defined. */
  accommodates?: string;
  accent: AccentName;
  occasions: OccasionType[];
  lines: PackageLine[];
  /** Bundle saving in basis points (500 = 5%). */
  discountBps: number;
  imageUrl?: string;
}

export interface DeliveryZone {
  province: string;
  provinceCode: string;
  feeCents: Cents;
  note?: string;
}

export interface ProductQuery {
  categoryId?: string;
  group?: Category['group'];
  search?: string;
  availableOnly?: boolean;
  sort?: 'featured' | 'price_asc' | 'price_desc' | 'name';
}

// ---------- Basket ----------

export interface BasketLine {
  /** Unique line id (productId + variant + options + package instance). */
  key: string;
  productId: string;
  productName: string;
  kind: ProductKind;
  categoryId: string;
  variantId?: string;
  variantLabel?: string;
  unitLabel: string;
  unitPriceCents: Cents;
  serviceOptions: { id: string; name: string; priceCents: Cents }[];
  quantity: number;
  /** Set when the line belongs to a customised package. */
  packageInstanceId?: string;
}

export interface BasketPackage {
  instanceId: string;
  packageId: string;
  name: string;
  discountBps: number;
  instructions?: string;
}

export interface BasketState {
  lines: BasketLine[];
  packages: BasketPackage[];
  notes?: string;
}

export interface PricedLine extends BasketLine {
  lineTotalCents: Cents;
}

export interface PricedPackage extends BasketPackage {
  subtotalCents: Cents;
  savingCents: Cents;
}

export interface BasketTotals {
  itemsCents: Cents;
  packageSavingCents: Cents;
  subtotalCents: Cents;
  deliveryCents: Cents | null;
  totalCents: Cents | null;
}

// ---------- Orders ----------

export const ORDER_STATUSES = [
  'order_received',
  'payment_confirmed',
  'preparing',
  'supplier_confirmed',
  'out_for_delivery',
  'delivered',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  order_received: 'Order Received',
  payment_confirmed: 'Payment Confirmed',
  preparing: 'Preparing Your Order',
  supplier_confirmed: 'Supplier Confirmed',
  out_for_delivery: 'Out For Delivery',
  delivered: 'Delivered',
};

export type PaymentStatus = 'awaiting_payment' | 'paid' | 'failed' | 'refunded';

export interface DeliveryDetails {
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  suburb: string;
  city: string;
  provinceCode: string;
  province: string;
  postalCode: string;
  date: string; // ISO date (yyyy-mm-dd)
  window: DeliveryWindowId;
  instructions?: string;
}

export type DeliveryWindowId = 'morning' | 'midday' | 'afternoon';

export interface Order {
  id: string;
  reference: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  lines: PricedLine[];
  packages: PricedPackage[];
  totals: BasketTotals;
  delivery: DeliveryDetails;
  placedBy: { name: string; phone: string };
  notes?: string;
}

export interface NewOrderInput {
  basket: BasketState;
  delivery: DeliveryDetails;
  placedBy: { name: string; phone: string };
}

// ---------- Account ----------

export interface User {
  id: string;
  fullName: string;
  phone: string; // E.164
  email?: string;
}

export interface Session {
  user: User;
  token: string;
}

export interface SupportRequest {
  kind: 'order_enquiry' | 'problem';
  orderRef?: string;
  message: string;
  contactPhone: string;
}
