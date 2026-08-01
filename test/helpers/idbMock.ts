/**
 * In-memory replacement for idb-keyval so storage logic can be tested without a
 * real IndexedDB (jsdom has none) and without adding a dependency (BUILD.md §3).
 * It models the small slice of the API the app uses.
 */
export function idbMock() {
  const dbs = new Map<string, Map<string, unknown>>();
  const storeFor = (token: string) => {
    let m = dbs.get(token);
    if (!m) {
      m = new Map();
      dbs.set(token, m);
    }
    return m;
  };

  return {
    createStore: (dbName: string, storeName: string) => `${dbName}::${storeName}`,
    get: async (key: string, token = "__default__") =>
      storeFor(token).get(key),
    set: async (key: string, value: unknown, token = "__default__") => {
      storeFor(token).set(key, value);
    },
    del: async (key: string, token = "__default__") => {
      storeFor(token).delete(key);
    },
    keys: async (token = "__default__") => [...storeFor(token).keys()],
  };
}
