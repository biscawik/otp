/**
 * 5sim.net API client
 * Docs: https://5sim.net/docs
 */

const BASE_URL = "https://5sim.net/v1";
const API_TOKEN = process.env.FIVESIM_API_TOKEN!;

const authHeaders = {
  Authorization: `Bearer ${API_TOKEN}`,
  Accept: "application/json",
};

export interface FivesimProduct {
  Category: "activation" | "hosting";
  Qty: number;
  Price: number; // in RUB
}

export interface FivesimSms {
  created_at: string;
  date: string;
  sender: string;
  text: string;
  code: string;
}

export interface FivesimOrder {
  id: number;
  phone: string;
  operator: string;
  product: string;
  price: number;
  status: "PENDING" | "RECEIVED" | "CANCELED" | "TIMEOUT" | "FINISHED" | "BANNED";
  expires: string;
  sms: FivesimSms[];
  created_at: string;
  forwarding: boolean;
  forwarding_number: string;
  country: string;
}

export interface FivesimProfile {
  id: number;
  email: string;
  vendor: string;
  balance: number;
  rating: number;
  default_country: { name: string; iso: string; prefix: string };
  default_operator: { name: string };
  frozen_balance: number;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`5sim API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<FivesimProfile> {
  return apiFetch<FivesimProfile>("/user/profile");
}

// ─── Products & Prices ────────────────────────────────────────────────────────

export async function getProducts(
  country: string,
  operator: string = "any"
): Promise<Record<string, FivesimProduct>> {
  return apiFetch<Record<string, FivesimProduct>>(
    `/guest/products/${encodeURIComponent(country)}/${encodeURIComponent(operator)}`
  );
}

export interface PriceEntry {
  cost: number;
  count: number;
  rate?: number;
}

export async function getPrices(params?: {
  country?: string;
  product?: string;
}): Promise<Record<string, Record<string, Record<string, PriceEntry>>>> {
  const qs = new URLSearchParams();
  if (params?.country) qs.set("country", params.country);
  if (params?.product) qs.set("product", params.product);
  const query = qs.toString() ? `?${qs}` : "";
  return apiFetch(`/guest/prices${query}`);
}

export async function getCountries(): Promise<Record<string, { iso: string; prefix: string; name: string }>> {
  return apiFetch("/guest/countries");
}

// ─── Number purchasing ────────────────────────────────────────────────────────

export async function buyNumber(
  country: string,
  operator: string,
  product: string
): Promise<FivesimOrder> {
  return apiFetch<FivesimOrder>(
    `/user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(operator)}/${encodeURIComponent(product)}`
  );
}

export async function checkOrder(orderId: number): Promise<FivesimOrder> {
  return apiFetch<FivesimOrder>(`/user/check/${orderId}`);
}

export async function cancelOrder(orderId: number): Promise<FivesimOrder> {
  return apiFetch<FivesimOrder>(`/user/cancel/${orderId}`);
}

export async function finishOrder(orderId: number): Promise<FivesimOrder> {
  return apiFetch<FivesimOrder>(`/user/finish/${orderId}`);
}

export async function banOrder(orderId: number): Promise<FivesimOrder> {
  return apiFetch<FivesimOrder>(`/user/ban/${orderId}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert 5sim RUB price to IDR using configured multiplier
 */
export function rubToIdr(rub: number): number {
  const multiplier = parseFloat(process.env.PRICE_MARKUP_IDR ?? "175");
  return Math.ceil(rub * multiplier / 100) * 100; // round up to nearest 100
}

/**
 * Get cheapest operator for a product in a country
 */
export async function getCheapestOption(
  country: string,
  product: string
): Promise<{ operator: string; price: number; count: number } | null> {
  try {
    const prices = await getPrices({ country, product });
    const countryData = prices[country];
    if (!countryData) return null;
    const productData = countryData[product];
    if (!productData) return null;

    let cheapest: { operator: string; price: number; count: number } | null = null;
    for (const [op, data] of Object.entries(productData)) {
      if (data.count > 0) {
        if (!cheapest || data.cost < cheapest.price) {
          cheapest = { operator: op, price: data.cost, count: data.count };
        }
      }
    }
    return cheapest;
  } catch {
    return null;
  }
}
