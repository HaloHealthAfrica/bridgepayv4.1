// Extremely small in-memory metrics store
const g = globalThis;
if (!g.__metrics) {
  g.__metrics = {
    routes: new Map(),
  };
}

function rec(route) {
  if (!g.__metrics.routes.has(route)) {
    g.__metrics.routes.set(route, {
      count: 0,
      durations: [],
      lastErrorAt: null,
    });
  }
  return g.__metrics.routes.get(route);
}

export function recordMetric({ route, durationMs, error = false }) {
  const r = rec(route);
  r.count += 1;
  r.durations.push(durationMs);
  if (r.durations.length > 200) r.durations.shift();
  if (error) r.lastErrorAt = new Date().toISOString();
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

export function snapshot() {
  const out = [];
  for (const [route, r] of g.__metrics.routes.entries()) {
    out.push({
      route,
      count: r.count,
      p50: percentile(r.durations, 50),
      p95: percentile(r.durations, 95),
      lastErrorAt: r.lastErrorAt,
    });
  }
  return out;
}

export default { recordMetric, snapshot };
