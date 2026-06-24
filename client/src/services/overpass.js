export async function fetchNearbyShops(lat, lon, radius = 50000, signal) {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), radius: String(radius) });
  const res = await fetch(`/api/overpass/shops?${params.toString()}`, { signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
  }
  return data.shops || [];
}
