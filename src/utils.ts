export function uniq<T>(array: T[]): T[] {
  return array.filter((v, i, a) => a.indexOf(v) === i);
}
