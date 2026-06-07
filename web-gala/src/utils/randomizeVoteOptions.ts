export type RandomizedVoteOption = {
  name: string;
  photoPath: string;
  originalIndex: number;
};

const getCrypto = () => {
  if (globalThis.crypto !== undefined) {
    return globalThis.crypto;
  }

  throw new Error("Secure random number generation is not available.");
};

const randomIndex = (maxExclusive: number) => {
  const maxUint32 = 2 ** 32;
  const limit = maxUint32 - (maxUint32 % maxExclusive);
  const values = new Uint32Array(1);
  const cryptoApi = getCrypto();

  do {
    cryptoApi.getRandomValues(values);
  } while (values[0] >= limit);

  return values[0] % maxExclusive;
};

export function shuffleItems<T>(items: readonly T[]) {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export function getRandomizedVoteOptions(vote: Vote): RandomizedVoteOption[] {
  return shuffleItems(
    vote.options.map((name, originalIndex) => ({
      name,
      photoPath: vote.photo_paths[originalIndex] ?? "",
      originalIndex,
    })),
  );
}
