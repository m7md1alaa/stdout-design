const levenshteinDistance = (a: string, b: string): number => {
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) {
    return bLen;
  }
  if (bLen === 0) {
    return aLen;
  }

  let prev = Array.from({ length: aLen + 1 }, (_, j) => j);
  let curr = Array.from<number>({ length: aLen + 1 }).fill(0);

  for (let j = 1; j <= bLen; j += 1) {
    curr[0] = j;

    for (let i = 1; i <= aLen; i += 1) {
      const cost = b[j - 1] === a[i - 1] ? 0 : 1;

      curr[i] = Math.min(
        (prev[i] ?? 0) + 1,
        (curr[i - 1] ?? 0) + 1,
        (prev[i - 1] ?? 0) + cost
      );
    }

    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[aLen] ?? 0;
};

export const suggestClosest = (
  input: string,
  candidates: readonly string[],
  maxDistance = 3
): string | undefined => {
  let best: string | undefined;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const dist = levenshteinDistance(
      input.toLowerCase(),
      candidate.toLowerCase()
    );

    if (dist < bestDistance && dist <= maxDistance) {
      bestDistance = dist;
      best = candidate;
    }
  }

  return best;
};
