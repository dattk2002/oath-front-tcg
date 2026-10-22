import { useEffect, useState } from "react";
import type { PublicCatalog } from "@oathfront/contracts/browser";
import type { ApiClient } from "../match/api-client";

const caches = new WeakMap<ApiClient, Map<string, Promise<PublicCatalog>>>();
export function loadVersionedCatalog(
  api: ApiClient,
  version: string,
): Promise<PublicCatalog> {
  let cache = caches.get(api);
  if (!cache) {
    cache = new Map();
    caches.set(api, cache);
  }
  let pending = cache.get(version);
  if (!pending) {
    pending = api
      .catalog(version)
      .then((value) => {
        if (value.version !== version) throw Error("CATALOG_VERSION_MISMATCH");
        return value;
      })
      .catch((error) => {
        cache!.delete(version);
        throw error;
      });
    cache.set(version, pending);
  }
  return pending;
}
export function useVersionedCatalog(
  api: ApiClient,
  version: string | undefined,
  current: PublicCatalog,
) {
  const [loaded, setLoaded] = useState<PublicCatalog | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!version || version === current.version) return;
    let active = true;
    setFailed(false);
    void loadVersionedCatalog(api, version).then(
      (value) => {
        if (active) setLoaded(value);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [api, version, current.version, attempt]);
  return {
    catalog:
      version === current.version
        ? current
        : loaded?.version === version
          ? loaded
          : null,
    failed:
      failed && version !== current.version && loaded?.version !== version,
    retry: () => setAttempt((n) => n + 1),
  };
}
