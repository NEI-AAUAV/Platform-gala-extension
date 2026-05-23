export type RandomizedVoteOption = {
  name: string;
  photoPath: string;
  originalIndex: number;
};

const randomValue = () => {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 2 ** 32;
  }

  return Math.random();
};

export function shuffleItems<T>(items: readonly T[]) {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomValue() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export function getRandomizedVoteOptions(vote: Vote): RandomizedVoteOption[] {
  return shuffleItems(
    vote.options.map((name, originalIndex) => ({
      name,
      photoPath: vote.photo_paths[originalIndex],
      originalIndex,
    })),
  );
}
