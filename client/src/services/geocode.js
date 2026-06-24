export async function reverseGeocode(lat, lon) {
  const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
  }
  return data;
}
