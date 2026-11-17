/**
 * MOCK DATA — development only.
 *
 * Everything here is sample data so the app can be exercised before the backend exists.
 * Prices, stock, availability, serving guides and discounts are PLACEHOLDERS, not real
 * supplier quotes or commitments. In production this comes from the catalogue API
 * (GET /api/catalog) and is managed through the admin platform.
 */
import type { Category, DeliveryZone, PackageDef, Product } from '../types';

const R = (rand: number) => Math.round(rand * 100);

export const mockCategories: Category[] = [
  { id: 'hampers', name: 'Grocery Hampers', group: 'hampers', accent: 'ember', icon: 'basket-outline', blurb: 'Ready-made hampers, sized for the household.' },
  { id: 'livestock', name: 'Sheep & Livestock', group: 'livestock', accent: 'olive', icon: 'sheep', blurb: 'Sheep and cattle, arranged with care.' },
  { id: 'meat', name: 'Beef & Meat', group: 'meat', accent: 'berry', icon: 'food-steak', blurb: 'Beef and lamb in the quantities you need.' },
  { id: 'vegetables', name: 'Vegetables', group: 'groceries', accent: 'olive', icon: 'carrot', blurb: 'Fresh produce by the bag and box.' },
  { id: 'cooking', name: 'Cooking Essentials', group: 'groceries', accent: 'gold', icon: 'shaker-outline', blurb: 'Maize meal, rice, oil, flour and more.' },
  { id: 'supplies', name: 'Additional Supplies', group: 'supplies', accent: 'berry', icon: 'package-variant-closed', blurb: 'Tea, water and the extras that help.' },
];

export const mockProducts: Product[] = [
  // ----- Hampers -----
  {
    id: 'hamper-essential', categoryId: 'hampers', kind: 'hamper', name: 'Essential Grocery Hamper',
    description: 'The staples for a small household, packed and ready to deliver.',
    unitLabel: 'hamper', priceCents: R(1450), availability: 'in_stock', stock: 40,
    includes: ['Maize meal 12.5 kg', 'Rice 5 kg', 'Cooking oil 2 L', 'Sugar 2.5 kg', 'Salt 1 kg', 'Tea bags 100s'],
    deliveryInfo: 'Delivery window is confirmed once your order is accepted.', tags: ['groceries', 'starter'],
  },
  {
    id: 'hamper-family', categoryId: 'hampers', kind: 'hamper', name: 'Family Grocery Hamper',
    description: 'A fuller hamper for a household welcoming extended family.',
    unitLabel: 'hamper', priceCents: R(2650), availability: 'in_stock', stock: 30,
    includes: ['Maize meal 25 kg', 'Rice 10 kg', 'Cooking oil 5 L', 'Cake flour 5 kg', 'Sugar 5 kg', 'Salt 1 kg', 'Tea bags 200s', 'Spice selection'],
    deliveryInfo: 'Delivery window is confirmed once your order is accepted.', tags: ['groceries', 'family'],
  },
  {
    id: 'hamper-large', categoryId: 'hampers', kind: 'hamper', name: 'Large Family Hamper',
    description: 'Generous quantities for gatherings that run over several days.',
    unitLabel: 'hamper', priceCents: R(4850), availability: 'limited', stock: 8,
    includes: ['Maize meal 2 × 25 kg', 'Rice 2 × 10 kg', 'Cooking oil 2 × 5 L', 'Cake flour 10 kg', 'Sugar 10 kg', 'Salt 2 kg', 'Tea bags 400s', 'Spice selection'],
    deliveryInfo: 'Delivery window is confirmed once your order is accepted.', tags: ['groceries', 'large'],
  },
  {
    id: 'hamper-custom', categoryId: 'hampers', kind: 'hamper', name: 'Custom Hamper',
    description: 'Tell us what you need and we will put a hamper together for you.',
    unitLabel: 'hamper', priceCents: 0, availability: 'on_request', tags: ['custom'],
  },

  // ----- Livestock -----
  {
    id: 'sheep', categoryId: 'livestock', kind: 'livestock', name: 'Sheep',
    description: 'Healthy live sheep, selected by size. Order one, two or three by adjusting the quantity.',
    unitLabel: 'sheep', priceCents: R(3200), availability: 'limited', stock: 12,
    variants: [
      { id: 'standard', label: 'Standard', priceCents: R(3200) },
      { id: 'large', label: 'Large', priceCents: R(3900), availability: 'limited' },
    ],
    serviceOptions: [
      { id: 'prep-sheep', name: 'Slaughter & Dressing', description: 'Preparation by an accredited provider, where offered in the delivery area. Confirmed by our team.', priceCents: R(450) },
    ],
    deliveryInfo: 'Livestock delivery is scheduled with you directly. We confirm timing and handling before dispatch.',
    tags: ['sheep', 'livestock'],
  },
  {
    id: 'cattle', categoryId: 'livestock', kind: 'livestock', name: 'Cattle',
    description: 'A cow or ox, arranged to your specification and delivery area.',
    unitLabel: 'animal', priceCents: R(14500), availability: 'limited', stock: 4,
    variants: [
      { id: 'standard', label: 'Standard', priceCents: R(14500) },
      { id: 'large', label: 'Large', priceCents: R(18500) },
    ],
    serviceOptions: [
      { id: 'prep-cattle', name: 'Slaughter & Dressing', description: 'Preparation by an accredited provider, where offered in the delivery area. Confirmed by our team.', priceCents: R(1200) },
    ],
    deliveryInfo: 'Livestock delivery is scheduled with you directly. We confirm timing and handling before dispatch.',
    tags: ['cattle', 'cow', 'livestock'],
  },
  {
    id: 'livestock-custom', categoryId: 'livestock', kind: 'livestock', name: 'Custom Livestock Request',
    description: 'Need goats, a specific breed or a larger order? Tell us and we will see what is possible.',
    unitLabel: 'request', priceCents: 0, availability: 'on_request', tags: ['custom', 'livestock'],
  },

  // ----- Meat -----
  {
    id: 'beef', categoryId: 'meat', kind: 'meat', name: 'Beef',
    description: 'Fresh beef, cut for stewing and cooking in large pots.',
    unitLabel: 'pack', priceCents: R(1450), availability: 'in_stock', stock: 25,
    variants: [
      { id: '10kg', label: '10 kg', priceCents: R(1450) },
      { id: '20kg', label: '20 kg', priceCents: R(2800) },
      { id: '40kg', label: '40 kg', priceCents: R(5500), availability: 'limited' },
    ],
    deliveryInfo: 'Delivered chilled where cold-chain is available. We confirm before dispatch.', tags: ['beef', 'meat'],
  },
  {
    id: 'lamb', categoryId: 'meat', kind: 'meat', name: 'Lamb',
    description: 'Fresh lamb portions, ideal for feeding a crowd.',
    unitLabel: 'pack', priceCents: R(1650), availability: 'in_stock', stock: 18,
    variants: [
      { id: '10kg', label: '10 kg', priceCents: R(1650) },
      { id: '20kg', label: '20 kg', priceCents: R(3200) },
    ],
    deliveryInfo: 'Delivered chilled where cold-chain is available. We confirm before dispatch.', tags: ['lamb', 'meat'],
  },
  {
    id: 'meat-custom', categoryId: 'meat', kind: 'meat', name: 'Custom Meat Quantity',
    description: 'Need a different quantity or cut? Tell us what you need.',
    unitLabel: 'request', priceCents: 0, availability: 'on_request', tags: ['custom', 'meat'],
  },

  // ----- Vegetables -----
  {
    id: 'veg-box', categoryId: 'vegetables', kind: 'grocery', name: 'Mixed Vegetable Box',
    description: 'Cabbage, carrots, butternut and spinach, packed together.',
    unitLabel: 'box', priceCents: R(380), availability: 'in_stock', stock: 60, tags: ['vegetables'],
  },
  {
    id: 'potatoes', categoryId: 'vegetables', kind: 'grocery', name: 'Potatoes',
    description: 'Washed potatoes, good for boiling, roasting and stews.',
    unitLabel: 'bag', priceCents: R(95), availability: 'in_stock', stock: 120,
    variants: [
      { id: '10kg', label: '10 kg', priceCents: R(95) },
      { id: '20kg', label: '20 kg', priceCents: R(180) },
    ],
    tags: ['vegetables'],
  },
  {
    id: 'onions', categoryId: 'vegetables', kind: 'grocery', name: 'Onions',
    description: 'Brown onions, bagged.',
    unitLabel: 'bag', priceCents: R(80), availability: 'in_stock', stock: 120,
    variants: [
      { id: '10kg', label: '10 kg', priceCents: R(80) },
      { id: '20kg', label: '20 kg', priceCents: R(150) },
    ],
    tags: ['vegetables'],
  },
  {
    id: 'tomatoes', categoryId: 'vegetables', kind: 'grocery', name: 'Tomatoes',
    description: 'Ripe cooking tomatoes by the tray.',
    unitLabel: 'tray', priceCents: R(150), availability: 'limited', stock: 20, tags: ['vegetables'],
  },
  {
    id: 'butternut', categoryId: 'vegetables', kind: 'grocery', name: 'Butternut & Pumpkin',
    description: 'A mixed bag of butternut and pumpkin.',
    unitLabel: 'bag', priceCents: R(120), availability: 'in_stock', stock: 50, tags: ['vegetables'],
  },

  // ----- Cooking essentials -----
  {
    id: 'maize-meal', categoryId: 'cooking', kind: 'grocery', name: 'Maize Meal',
    description: 'Super maize meal for pap, in family-sized bags.',
    unitLabel: 'bag', priceCents: R(190), availability: 'in_stock', stock: 200,
    variants: [
      { id: '12-5kg', label: '12.5 kg', priceCents: R(190) },
      { id: '25kg', label: '25 kg', priceCents: R(360) },
    ],
    tags: ['staples', 'pap'],
  },
  {
    id: 'rice', categoryId: 'cooking', kind: 'grocery', name: 'Rice',
    description: 'Long-grain white rice.',
    unitLabel: 'bag', priceCents: R(215), availability: 'in_stock', stock: 150,
    variants: [
      { id: '5kg', label: '5 kg', priceCents: R(120) },
      { id: '10kg', label: '10 kg', priceCents: R(215) },
      { id: '20kg', label: '20 kg', priceCents: R(410) },
    ],
    tags: ['staples'],
  },
  {
    id: 'cooking-oil', categoryId: 'cooking', kind: 'grocery', name: 'Sunflower Cooking Oil',
    description: 'Refined sunflower oil.',
    unitLabel: 'bottle', priceCents: R(210), availability: 'in_stock', stock: 90,
    variants: [
      { id: '2l', label: '2 L', priceCents: R(95) },
      { id: '5l', label: '5 L', priceCents: R(210) },
    ],
    tags: ['staples'],
  },
  {
    id: 'flour', categoryId: 'cooking', kind: 'grocery', name: 'Cake Flour',
    description: 'All-purpose flour for bread, scones and dumplings.',
    unitLabel: 'bag', priceCents: R(95), availability: 'in_stock', stock: 80,
    variants: [
      { id: '5kg', label: '5 kg', priceCents: R(60) },
      { id: '10kg', label: '10 kg', priceCents: R(110) },
    ],
    tags: ['baking'],
  },
  {
    id: 'sugar', categoryId: 'cooking', kind: 'grocery', name: 'White Sugar',
    description: 'Fine white sugar.',
    unitLabel: 'bag', priceCents: R(125), availability: 'in_stock', stock: 80,
    variants: [
      { id: '2-5kg', label: '2.5 kg', priceCents: R(65) },
      { id: '10kg', label: '10 kg', priceCents: R(235) },
    ],
    tags: ['staples'],
  },
  {
    id: 'salt', categoryId: 'cooking', kind: 'grocery', name: 'Table Salt',
    description: 'Iodated table salt.',
    unitLabel: 'pack', priceCents: R(18), availability: 'in_stock', stock: 300, tags: ['staples'],
  },
  {
    id: 'spices', categoryId: 'cooking', kind: 'grocery', name: 'Spice Selection',
    description: 'Curry powder, mixed masala, stew spice and all-purpose seasoning.',
    unitLabel: 'set', priceCents: R(145), availability: 'in_stock', stock: 70, tags: ['spices'],
  },

  // ----- Additional supplies -----
  {
    id: 'tea-coffee', categoryId: 'supplies', kind: 'grocery', name: 'Tea & Coffee Station',
    description: 'Rooibos and black tea bags, instant coffee, sugar sticks and creamer.',
    unitLabel: 'set', priceCents: R(420), availability: 'in_stock', stock: 40, tags: ['hospitality'],
  },
  {
    id: 'water', categoryId: 'supplies', kind: 'grocery', name: 'Still Water 5 L',
    description: 'Still drinking water in 5 litre bottles.',
    unitLabel: '4-pack', priceCents: R(130), availability: 'in_stock', stock: 100, tags: ['hospitality'],
  },
  {
    id: 'disposables', categoryId: 'supplies', kind: 'grocery', name: 'Disposable Serving Pack',
    description: 'Plates, cups, cutlery and napkins for around 50 guests.',
    unitLabel: 'pack', priceCents: R(310), availability: 'limited', stock: 15, tags: ['hospitality'],
  },
];

export const mockPackages: PackageDef[] = [
  {
    id: 'pkg-essential', name: 'Essential Family Package',
    description: 'Everything to keep a household going through the first few days.',
    accommodates: 'Around 30 people', accent: 'ember', occasions: ['funeral', 'family_celebration'],
    discountBps: 300,
    lines: [
      { productId: 'hamper-essential', quantity: 1, optional: false },
      { productId: 'veg-box', quantity: 2, optional: true },
      { productId: 'cooking-oil', variantId: '5l', quantity: 1, optional: true },
      { productId: 'tea-coffee', quantity: 1, optional: true },
    ],
  },
  {
    id: 'pkg-gathering', name: 'Family Gathering Package',
    description: 'A grocery hamper, a sheep, vegetables and cooking essentials in one order.',
    accommodates: 'Around 60 people', accent: 'olive', occasions: ['funeral', 'family_celebration', 'wedding'],
    discountBps: 500,
    lines: [
      { productId: 'hamper-family', quantity: 1, optional: false },
      { productId: 'sheep', variantId: 'standard', quantity: 1, optional: false },
      { productId: 'veg-box', quantity: 3, optional: true },
      { productId: 'cooking-oil', variantId: '5l', quantity: 1, optional: true },
      { productId: 'spices', quantity: 1, optional: true },
    ],
  },
  {
    id: 'pkg-traditional', name: 'Traditional Package',
    description: 'Two sheep, a large hamper and the vegetables to feed a full homestead.',
    accommodates: 'Around 100 people', accent: 'gold', occasions: ['funeral', 'traditional_ceremony'],
    discountBps: 600,
    lines: [
      { productId: 'hamper-large', quantity: 1, optional: false },
      { productId: 'sheep', variantId: 'standard', quantity: 2, optional: false },
      { productId: 'potatoes', variantId: '20kg', quantity: 1, optional: true },
      { productId: 'onions', variantId: '10kg', quantity: 1, optional: true },
      { productId: 'butternut', quantity: 2, optional: true },
      { productId: 'tea-coffee', quantity: 1, optional: true },
    ],
  },
  {
    id: 'pkg-complete', name: 'Complete Family Package',
    description: 'Cattle, sheep, hampers and fresh produce: the full provision for a large gathering.',
    accommodates: 'Around 150 people', accent: 'berry', occasions: ['funeral', 'traditional_ceremony', 'wedding', 'community_event'],
    discountBps: 800,
    lines: [
      { productId: 'hamper-large', quantity: 2, optional: false },
      { productId: 'cattle', variantId: 'standard', quantity: 1, optional: false },
      { productId: 'sheep', variantId: 'standard', quantity: 1, optional: false },
      { productId: 'veg-box', quantity: 4, optional: true },
      { productId: 'potatoes', variantId: '20kg', quantity: 2, optional: true },
      { productId: 'water', quantity: 3, optional: true },
      { productId: 'disposables', quantity: 2, optional: true },
    ],
  },
];

/** Placeholder delivery fees by province. Real fees are set by operations per delivery location. */
export const mockDeliveryZones: DeliveryZone[] = [
  { province: 'Gauteng', provinceCode: 'GP', feeCents: R(250) },
  { province: 'Limpopo', provinceCode: 'LP', feeCents: R(450) },
  { province: 'Mpumalanga', provinceCode: 'MP', feeCents: R(450) },
  { province: 'North West', provinceCode: 'NW', feeCents: R(450) },
  { province: 'Free State', provinceCode: 'FS', feeCents: R(550) },
  { province: 'KwaZulu-Natal', provinceCode: 'KZN', feeCents: R(650) },
  { province: 'Eastern Cape', provinceCode: 'EC', feeCents: R(750) },
  { province: 'Northern Cape', provinceCode: 'NC', feeCents: R(950) },
  { province: 'Western Cape', provinceCode: 'WC', feeCents: R(950) },
];
