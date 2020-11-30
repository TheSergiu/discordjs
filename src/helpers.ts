export function splitOnFirst (s: string, delimiter: string): [string, string|undefined] {
  const [a, ...b] = s.split(delimiter);

  return [a, b ? b.join(delimiter) : undefined];
}
