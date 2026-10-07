import { useAuthStore } from "@/stores/auth-store";

let revision = 0;
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) revision += 1;
});
export function invalidateCacheContext() { revision += 1; }

/** Async store results may only publish into the identity and tenant that started them. */
export function captureCacheContext() {
  const capturedRevision = revision;
  const actorId = useAuthStore.getState().user?.id ?? null;
  const organizationId = typeof window === "undefined" ? null : localStorage.getItem("selected_org_id");
  return () => capturedRevision === revision && actorId === (useAuthStore.getState().user?.id ?? null) && organizationId === (typeof window === "undefined" ? null : localStorage.getItem("selected_org_id"));
}
