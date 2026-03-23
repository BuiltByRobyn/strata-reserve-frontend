export function groupByDocumentType<T extends { documentType: { typeName: string } }>(
  items: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.documentType.typeName;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}
