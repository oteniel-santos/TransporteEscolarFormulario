const store = new Map<string, unknown>();

export function setItem(id: string, data: unknown) {
  store.set(id, data);
}

export function getItem(id: string) {
  return store.get(id);
}
