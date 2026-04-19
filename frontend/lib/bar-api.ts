const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const fetcher = <T>(path: string) => apiFetch<T>(path);

// ── Types ────────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Spirit' | 'Mixer' | 'Garnish' | 'Syrup' | 'Equipment';
  unit: string;
  qtyOnHand: number;
  reorderThreshold: number;
  costPerUnit: number;
}

export interface Ingredient {
  itemId: string;
  qtyUsed: number;
}

export interface DrinkRecipe {
  id: string;
  name: string;
  price: number;
  costEstimate: number;
  ingredients: Ingredient[];
}

export interface Session {
  id: string;
  name: string;
  date: string;
  status: 'active' | 'closed';
  playerIds: string[];
}

export interface Order {
  id: string;
  sessionId: string;
  playerId: string;
  drinkId: string;
  drinkName: string;
  price: number;
  costEstimate: number;
  timestamp: string;
}

export interface CreateOrderResponse {
  order: Order;
  lowStockWarnings: string[];
}
