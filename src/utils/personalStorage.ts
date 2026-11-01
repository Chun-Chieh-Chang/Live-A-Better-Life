export const storageKeys = (storage: Storage) =>
  Array.from({ length: storage.length }, (_, i) => storage.key(i)!).filter(
    Boolean,
  );
// Namespace personal-mode caches without migrating or deleting the original local workspace.
export class PersonalStorage implements Storage {
  constructor(
    private base: Storage,
    private prefix: string,
  ) {}
  get length() {
    return this.keys().length;
  }
  private keys() {
    return storageKeys(this.base).filter((k) => k.startsWith(this.prefix));
  }
  key(index: number) {
    return this.keys()[index]?.slice(this.prefix.length) ?? null;
  }
  getItem(key: string) {
    return this.base.getItem(this.prefix + key);
  }
  setItem(key: string, value: string) {
    this.base.setItem(this.prefix + key, value);
  }
  removeItem(key: string) {
    this.base.removeItem(this.prefix + key);
  }
  clear() {
    for (const k of this.keys()) this.base.removeItem(k);
  }
}
