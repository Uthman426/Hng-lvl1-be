const limits = new Map();

export function rateLimit(key, max = 60) {
  const now = Date.now();
  const arr = limits.get(key) || [];

  const valid = arr.filter(t => now - t < 60000);

  valid.push(now);

  if (valid.length > max) {
    throw new Error("Too many requests");
  }

  limits.set(key, valid);
}