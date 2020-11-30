export function splitOnFirst (s: string, split: string): [string, string|undefined] {
  const [a, ...b] = s.split(split);

  return [a, b ? b.join(split) : undefined];
}
