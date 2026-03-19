/**
 * Keep-alive hook: pings the backend every 25 seconds so the canister
 * stays warm and OTP requests don't fail due to a cold start.
 */
import { useEffect } from "react";
import { useActor } from "./useActor";

export function useKeepAlive() {
  const { actor } = useActor();

  useEffect(() => {
    if (!actor) return;

    // Ping immediately, then every 25 seconds
    const ping = () => {
      actor.getAuthStatus().catch(() => {
        // Silently ignore errors — this is just a warm-up call
      });
    };

    ping();
    const id = setInterval(ping, 25_000);
    return () => clearInterval(id);
  }, [actor]);
}
