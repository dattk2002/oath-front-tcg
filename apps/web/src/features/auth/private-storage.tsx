import { createContext, useContext } from "react";
/** Principal-scoped local data; JWTs and cookies never enter this store. */
export function privateStorage(storage: Storage, owner: string): Storage {
  const prefix = `oathfront.owner.${owner}.`;
  const keys = () =>
    Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(
      (key): key is string => !!key?.startsWith(prefix),
    );
  return {
    get length() {
      return keys().length;
    },
    key: (i) => keys()[i]?.slice(prefix.length) ?? null,
    getItem: (key) => storage.getItem(prefix + key),
    setItem: (key, value) => storage.setItem(prefix + key, value),
    removeItem: (key) => storage.removeItem(prefix + key),
    clear: () => keys().forEach((key) => storage.removeItem(key)),
  };
}
export function moveClaimDrafts(
  storage: Storage,
  source: string,
  target: string,
) {
  if (source === target) return;
  const from = privateStorage(storage, source),
    to = privateStorage(storage, target);
  // Copy the explicitly claimed guest's current local intent before removing its namespace.
  for (let i = 0; i < from.length; i++) {
    const key = from.key(i)!;
    to.setItem(key, from.getItem(key)!);
  }
  from.clear();
}
export const PrivateStorageContext = createContext<Storage | null>(null);
export function usePrivateStorage() {
  const storage = useContext(PrivateStorageContext);
  if (!storage) throw Error("Private storage requires an owner");
  return storage;
}

export const SessionRecoveryContext = createContext(false);
