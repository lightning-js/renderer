export async function setupMathRandom() {
  const mt19937 = await import('@stdlib/random-base-mt19937');

  const factory = mt19937.factory || mt19937.default.factory;
  const rand = factory({ seed: 1234 });
  Math.random = function () {
    return rand() / rand.MAX;
  };
  console.log('Math.random overridden with mt19937');
}
