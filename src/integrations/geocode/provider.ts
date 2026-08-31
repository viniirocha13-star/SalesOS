export type GeocodeInput = {
  address?: string;
  zipCode?: string;
  city?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
};

export type GeoPoint = {
  latitude: number;
  longitude: number;
  label?: string;
  source: string;
};

function queryFrom(input: GeocodeInput) {
  return [input.address, input.neighborhood, input.city, input.zipCode, "Brasil"].filter(Boolean).join(", ");
}

export function parseLatLng(text?: string | null): GeoPoint | null {
  if (!text) return null;
  const m = text.match(/(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)/);
  if (!m) return null;
  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude, source: "provided" };
}

export async function geocodeAddress(input: GeocodeInput): Promise<GeoPoint | null> {
  if (input.latitude != null && input.longitude != null) {
    return { latitude: input.latitude, longitude: input.longitude, source: "provided" };
  }
  const fromText = parseLatLng([input.address, input.city].filter(Boolean).join(" "));
  if (fromText) return fromText;

  const q = queryFrom(input);
  if (!q.replace(/Brasil|,/g, "").trim()) return null;

  const mode = process.env.GEOCODE_PROVIDER || (process.env.VITEST === "true" || process.env.NODE_ENV === "test" ? "mock" : "nominatim");
  if (mode === "mock") {
    return { latitude: -3.7319, longitude: -38.5267, label: q, source: "geocode_mock" };
  }
  if (mode === "google" || process.env.GOOGLE_GEOCODE_API_KEY) {
    return geocodeGoogle(q);
  }
  return geocodeNominatim(q);
}

async function geocodeNominatim(q: string): Promise<GeoPoint | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "SalesOS-Viability/1.0 (operacao comercial)" },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
  const first = rows[0];
  if (!first?.lat || !first?.lon) return null;
  return {
    latitude: Number(first.lat),
    longitude: Number(first.lon),
    label: first.display_name,
    source: "nominatim",
  };
}

async function geocodeGoogle(q: string): Promise<GeoPoint | null> {
  const key = process.env.GOOGLE_GEOCODE_API_KEY;
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: { formatted_address?: string; geometry?: { location?: { lat: number; lng: number } } }[];
  };
  const loc = data.results?.[0]?.geometry?.location;
  if (!loc) return null;
  return {
    latitude: loc.lat,
    longitude: loc.lng,
    label: data.results?.[0]?.formatted_address,
    source: "google_geocode",
  };
}
