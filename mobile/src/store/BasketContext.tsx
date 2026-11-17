import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { lineFromProduct } from '../lib/catalog';
import { KEYS, readJSON, writeJSON } from '../services/storage';
import type { BasketLine, BasketPackage, BasketState, PackageDef, Product, Variant } from '../types';

const EMPTY: BasketState = { lines: [], packages: [] };
const MAX_QTY = 99;

type Action =
  | { type: 'hydrate'; state: BasketState }
  | { type: 'addLine'; line: BasketLine }
  | { type: 'setQty'; key: string; quantity: number }
  | { type: 'addPackage'; pkg: BasketPackage; lines: BasketLine[] }
  | { type: 'removePackage'; instanceId: string }
  | { type: 'setNotes'; notes: string }
  | { type: 'clear' };

function reducer(state: BasketState, a: Action): BasketState {
  switch (a.type) {
    case 'hydrate':
      return a.state;
    case 'addLine': {
      const existing = state.lines.find((l) => l.key === a.line.key);
      const lines = existing
        ? state.lines.map((l) => (l.key === a.line.key ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + a.line.quantity) } : l))
        : [...state.lines, a.line];
      return { ...state, lines };
    }
    case 'setQty': {
      const lines = state.lines
        .map((l) => (l.key === a.key ? { ...l, quantity: Math.min(MAX_QTY, a.quantity) } : l))
        .filter((l) => l.quantity > 0);
      const live = new Set(lines.map((l) => l.packageInstanceId).filter(Boolean));
      return { ...state, lines, packages: state.packages.filter((p) => live.has(p.instanceId)) };
    }
    case 'addPackage':
      return { ...state, packages: [...state.packages, a.pkg], lines: [...state.lines, ...a.lines.filter((l) => l.quantity > 0)] };
    case 'removePackage':
      return {
        ...state,
        packages: state.packages.filter((p) => p.instanceId !== a.instanceId),
        lines: state.lines.filter((l) => l.packageInstanceId !== a.instanceId),
      };
    case 'setNotes':
      return { ...state, notes: a.notes };
    case 'clear':
      return EMPTY;
  }
}

interface BasketApi {
  basket: BasketState;
  count: number;
  addProduct: (p: Product, o?: { variant?: Variant; optionIds?: string[]; quantity?: number }) => void;
  setQuantity: (key: string, quantity: number) => void;
  addPackage: (def: PackageDef, lines: BasketLine[], instructions?: string) => void;
  removePackage: (instanceId: string) => void;
  setNotes: (notes: string) => void;
  clear: () => void;
}

const Ctx = createContext<BasketApi | null>(null);

export function BasketProvider({ children }: { children: ReactNode }) {
  const [basket, dispatch] = useReducer(reducer, EMPTY);
  const hydrated = useRef(false);

  useEffect(() => {
    readJSON<BasketState>(KEYS.basket, EMPTY).then((s) => {
      dispatch({ type: 'hydrate', state: s });
      hydrated.current = true;
    });
  }, []);

  useEffect(() => {
    if (hydrated.current) writeJSON(KEYS.basket, basket);
  }, [basket]);

  const addProduct = useCallback<BasketApi['addProduct']>((p, o) => dispatch({ type: 'addLine', line: lineFromProduct(p, o) }), []);
  const setQuantity = useCallback((key: string, quantity: number) => dispatch({ type: 'setQty', key, quantity }), []);
  const addPackage = useCallback((def: PackageDef, lines: BasketLine[], instructions?: string) => {
    const instanceId = lines[0]?.packageInstanceId ?? `${def.id}-${Date.now()}`;
    dispatch({
      type: 'addPackage',
      pkg: { instanceId, packageId: def.id, name: def.name, discountBps: def.discountBps, instructions },
      lines,
    });
  }, []);
  const removePackage = useCallback((instanceId: string) => dispatch({ type: 'removePackage', instanceId }), []);
  const setNotes = useCallback((notes: string) => dispatch({ type: 'setNotes', notes }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  const count = useMemo(() => basket.lines.reduce((s, l) => s + l.quantity, 0), [basket.lines]);
  const value = useMemo(
    () => ({ basket, count, addProduct, setQuantity, addPackage, removePackage, setNotes, clear }),
    [basket, count, addProduct, setQuantity, addPackage, removePackage, setNotes, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBasket() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBasket must be used inside BasketProvider');
  return v;
}
