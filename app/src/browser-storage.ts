// localStorage itself can throw (blocked site data); callers then just do
// not persist.
export function browserStorage(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return localStorage;
  } catch (error: unknown) {
    console.warn("localStorage is not available:", error);
    return null;
  }
}
