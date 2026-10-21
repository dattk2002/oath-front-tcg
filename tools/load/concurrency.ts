export function parseConcurrency(argv: readonly string[]): number {
  const optionIndex = argv.indexOf("--concurrency");
  if (optionIndex === -1) return 20;
  const concurrency = Number(argv[optionIndex + 1]);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 20)
    throw Error("--concurrency requires an integer from 1 to 20");
  return concurrency;
}
