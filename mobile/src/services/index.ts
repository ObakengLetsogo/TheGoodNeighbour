import { config } from '../config';
import type { AuthService, CatalogService, OrderService, PaymentProvider, SupportService } from './contracts';
import { HttpAuthService, HttpCatalogService, HttpOrderService, HttpSupportService } from './http';
import { MockAuthService, MockCatalogService, MockOrderService, MockSupportService } from './mock';
import { NotConfiguredPaymentProvider } from './payments';

/** The single place that decides which implementation backs each service. */
export const catalogService: CatalogService = config.usingMocks ? new MockCatalogService() : new HttpCatalogService();
export const orderService: OrderService = config.usingMocks ? new MockOrderService() : new HttpOrderService();
export const authService: AuthService = config.usingMocks ? new MockAuthService() : new HttpAuthService();
export const supportService: SupportService = config.usingMocks ? new MockSupportService() : new HttpSupportService();

/** Swap this for a real provider implementation when one is integrated. */
export const paymentProvider: PaymentProvider = new NotConfiguredPaymentProvider();

export * from './contracts';
