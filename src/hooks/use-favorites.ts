import { useSyncExternalStore } from "react";
import { FAVORITES_KEY, MAX_FAVORITES, parseFavorites } from "@/lib/favorites";
const empty: string[] = [];
let previous: string | null | undefined;
let cached = empty;
function snapshot() {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (raw !== previous) {
      previous = raw;
      cached = parseFavorites(raw);
    }
    return cached;
  } catch {
    return empty;
  }
}
function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === FAVORITES_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("vem-favorites-changed", callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("vem-favorites-changed", callback);
  };
}
export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, snapshot, () => empty);
  function toggle(id: string) {
    const current = snapshot();
    if (!current.includes(id) && current.length >= MAX_FAVORITES)
      throw new Error("Você já salvou 200 favoritos. Remova um para adicionar outro.");
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      throw new Error(
        "Não foi possível salvar neste navegador. Verifique se o armazenamento está permitido.",
      );
    }
    window.dispatchEvent(new Event("vem-favorites-changed"));
  }
  function clear() {
    try {
      window.localStorage.removeItem(FAVORITES_KEY);
    } catch {
      throw new Error("Não foi possível limpar os favoritos neste navegador.");
    }
    window.dispatchEvent(new Event("vem-favorites-changed"));
  }
  return { ids, toggle, clear };
}
