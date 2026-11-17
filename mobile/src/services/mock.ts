import * as Crypto from 'expo-crypto';
import { mockCategories, mockDeliveryZones, mockPackages, mockProducts } from '../data/mockCatalog';
import { priceBasket } from '../lib/pricing';
import type { NewOrderInput, Order, Session, User } from '../types';
import {
  AuthError, type AuthService, type Catalog, type CatalogService, type OrderService, type RegisterInput,
  type SupportService,
} from './contracts';
import { KEYS, readJSON, removeKey, writeJSON } from './storage';

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export class MockCatalogService implements CatalogService {
  async getCatalog(): Promise<Catalog> {
    await delay(450);
    return {
      categories: mockCategories,
      products: mockProducts,
      packages: mockPackages,
      deliveryZones: mockDeliveryZones,
    };
  }
}

/**
 * Orders are stored on this device only. They are NOT sent to anyone and NEVER progress past
 * "Order Received": status changes must come from the backend/operations, not from the app.
 */
export class MockOrderService implements OrderService {
  async placeOrder(input: NewOrderInput): Promise<Order> {
    await delay(500);
    const zone = mockDeliveryZones.find((z) => z.provinceCode === input.delivery.provinceCode);
    const priced = priceBasket(input.basket, zone?.feeCents ?? null);
    const id = Crypto.randomUUID();
    const order: Order = {
      id,
      reference: `TGN-${id.slice(0, 6).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: 'order_received',
      paymentStatus: 'awaiting_payment',
      lines: priced.lines,
      packages: priced.packages,
      totals: priced.totals,
      delivery: input.delivery,
      placedBy: input.placedBy,
      notes: input.basket.notes,
    };
    const all = await readJSON<Order[]>(KEYS.orders, []);
    await writeJSON(KEYS.orders, [order, ...all]);
    return order;
  }

  async listOrders(): Promise<Order[]> {
    await delay(250);
    return readJSON<Order[]>(KEYS.orders, []);
  }

  async getOrder(id: string): Promise<Order | null> {
    const all = await readJSON<Order[]>(KEYS.orders, []);
    return all.find((o) => o.id === id) ?? null;
  }
}

interface MockAccount {
  user: User;
  salt: string;
  hash: string;
}

/**
 * DEVELOPMENT-ONLY authentication that keeps accounts on this device so the full journey can be
 * exercised. Replace with the backend auth (HttpAuthService) before any real release.
 */
export class MockAuthService implements AuthService {
  private async hash(password: string, salt: string) {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
  }

  async restore(): Promise<Session | null> {
    return readJSON<Session | null>(KEYS.session, null);
  }

  async register(input: RegisterInput): Promise<Session> {
    await delay();
    const accounts = await readJSON<MockAccount[]>(KEYS.accounts, []);
    if (accounts.some((a) => a.user.phone === input.phone)) {
      throw new AuthError('That mobile number already has an account. Try signing in instead.');
    }
    const salt = Crypto.randomUUID();
    const user: User = { id: Crypto.randomUUID(), fullName: input.fullName, phone: input.phone, email: input.email };
    await writeJSON(KEYS.accounts, [...accounts, { user, salt, hash: await this.hash(input.password, salt) }]);
    const session: Session = { user, token: Crypto.randomUUID() };
    await writeJSON(KEYS.session, session);
    return session;
  }

  async signIn(phone: string, password: string): Promise<Session> {
    await delay();
    const accounts = await readJSON<MockAccount[]>(KEYS.accounts, []);
    const acc = accounts.find((a) => a.user.phone === phone);
    if (!acc || (await this.hash(password, acc.salt)) !== acc.hash) {
      throw new AuthError("That number and password don't match. Please check and try again.");
    }
    const session: Session = { user: acc.user, token: Crypto.randomUUID() };
    await writeJSON(KEYS.session, session);
    return session;
  }

  async signOut() {
    await removeKey(KEYS.session);
  }

  async updateProfile(user: User): Promise<User> {
    const accounts = await readJSON<MockAccount[]>(KEYS.accounts, []);
    await writeJSON(KEYS.accounts, accounts.map((a) => (a.user.id === user.id ? { ...a, user } : a)));
    const session = await readJSON<Session | null>(KEYS.session, null);
    if (session) await writeJSON(KEYS.session, { ...session, user });
    return user;
  }
}

/** No backend yet: requests are not delivered, and the UI says so and offers WhatsApp/phone instead. */
export class MockSupportService implements SupportService {
  async submit() {
    await delay();
    return { delivered: false };
  }
}
