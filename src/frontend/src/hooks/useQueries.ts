import type { AuthStatus, GameState, RoundResult } from "@/backend";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";

export function useAuthStatus() {
  const { actor, isFetching } = useActor();
  return useQuery<AuthStatus>({
    queryKey: ["authStatus"],
    queryFn: async () => {
      if (!actor) return { registered: false, otpVerified: false, phone: "" };
      return actor.getAuthStatus();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000,
  });
}

export function useBalance() {
  const { actor, isFetching } = useActor();
  return useQuery<number>({
    queryKey: ["balance"],
    queryFn: async () => {
      if (!actor) return 0;
      return actor.getBalance();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useGameState(mode: string) {
  const { actor, isFetching } = useActor();
  return useQuery<GameState>({
    queryKey: ["gameState", mode],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getGameState(mode);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 2000,
  });
}

export function useRequestOtp() {
  const { actor } = useActor();
  return useMutation<string, Error, string>({
    mutationFn: async (phone: string) => {
      if (!actor) throw new Error("No actor");
      return actor.requestOtp(phone);
    },
  });
}

export function useVerifyOtp() {
  const { actor } = useActor();
  return useMutation<boolean, Error, string>({
    mutationFn: async (otp: string) => {
      if (!actor) throw new Error("No actor");
      return actor.verifyOtp(otp);
    },
  });
}

export function useSetPassword() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (password: string) => {
      if (!actor) throw new Error("No actor");
      return actor.setPassword(password);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["authStatus"] });
    },
  });
}

export function useDeposit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (amount: number) => {
      if (!actor) throw new Error("No actor");
      return actor.deposit(amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balance"] });
    },
  });
}

export function usePlaceBet() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mode,
      target,
      amount,
    }: { mode: string; target: any; amount: number }) => {
      if (!actor) throw new Error("No actor");
      return actor.placeBet(mode, target, amount);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["balance"] });
      qc.invalidateQueries({ queryKey: ["gameState", variables.mode] });
    },
  });
}

export function useLockRound() {
  const { actor } = useActor();
  return useMutation<void, Error, string>({
    mutationFn: async (mode: string) => {
      if (!actor) throw new Error("No actor");
      return actor.lockRound(mode);
    },
  });
}

export function useSettleRound() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<RoundResult, Error, string>({
    mutationFn: async (mode: string) => {
      if (!actor) throw new Error("No actor");
      return actor.settleRound(mode);
    },
    onSuccess: (_data, mode) => {
      qc.invalidateQueries({ queryKey: ["gameState", mode] });
      qc.invalidateQueries({ queryKey: ["balance"] });
    },
  });
}

export function useChangePassword() {
  const { actor } = useActor();
  return useMutation<
    boolean,
    Error,
    { oldPassword: string; newPassword: string }
  >({
    mutationFn: async ({ oldPassword, newPassword }) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).changePassword(oldPassword, newPassword);
    },
  });
}
