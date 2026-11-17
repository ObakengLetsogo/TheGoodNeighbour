import type {
  Category, DeliveryZone, NewOrderInput, Order, PackageDef, PaymentStatus, Product, Session, SupportRequest, User,
} from '../types';

export interface Catalog {
  categories: Category[];
  products: Product[];
  packages: PackageDef[];
  deliveryZones: DeliveryZone[];
}

export interface CatalogService {
  getCatalog(): Promise<Catalog>;
}

export interface OrderService {
  placeOrder(input: NewOrderInput): Promise<Order>;
  listOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
}

export interface RegisterInput {
  fullName: string;
  phone: string; // E.164
  email?: string;
  password: string;
}

export class AuthError extends Error {}

export interface AuthService {
  restore(): Promise<Session | null>;
  register(input: RegisterInput): Promise<Session>;
  signIn(phone: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  updateProfile(user: User): Promise<User>;
}

export interface SupportService {
  submit(request: SupportRequest): Promise<{ delivered: boolean }>;
}

// ---------- Payments ----------

export type PaymentMethodId = 'card' | 'instant_eft';

export interface PaymentMethod {
  id: PaymentMethodId;
  label: string;
  description: string;
}

/**
 * The checkout only ever talks to this interface. To integrate a South African payment
 * provider (PayFast, Ozow, Peach Payments, Stitch, ...) implement it, return `redirect`
 * or `confirmed` results, and register it in services/index.ts. No checkout code changes.
 *
 * `confirmed` MUST only be returned when the provider (or our backend, from a provider
 * webhook) has actually confirmed the money. The UI never claims payment otherwise.
 */
export type PaymentResult =
  | { state: 'not_configured' }
  | { state: 'redirect'; url: string }
  | { state: 'pending'; message?: string }
  | { state: 'confirmed'; providerReference: string }
  | { state: 'failed'; reason: string };

export interface PaymentProvider {
  readonly id: string;
  readonly displayName: string;
  readonly isConfigured: boolean;
  availableMethods(): PaymentMethod[];
  startPayment(order: Order, method: PaymentMethodId): Promise<PaymentResult>;
  /** Re-checks the payment state with the provider / backend. */
  getPaymentStatus(order: Order): Promise<PaymentStatus>;
}
