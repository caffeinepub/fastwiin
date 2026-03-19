import type { AuthStatus, GameState, RoundResult } from "@/backend";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";

export type WithdrawalRecord = {
  id: string;
  phone: string;
  amount: number;
  upiId: string;
  status: { pending: null } | { approved: null } | { rejected: null };
  timestamp: bigint;
};

export type DepositRecord = {
  id: string;
  phone: string;
  amount: number;
  upiRef: string;
  status: { pending: null } | { approved: null } | { rejected: null };
  timestamp: bigint;
};

export type UserSummary = {
  phone: string;
  balance: number;
  registeredAt: bigint;
  blocked: boolean;
};

export function getRecordStatus(
  status: { pending: null } | { approved: null } | { rejected: null },
): string {
  if ("pending" in status) return "pending";
  if ("approved" in status) return "approved";
  return "rejected";
}

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
    refetchInterval: 25000,
    retry: 1,
    retryDelay: 1000,
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
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();
  const mutation = useMutation<string, Error, string>({
    mutationFn: async (phone: string) => {
      const a =
        actor ||
        (queryClient.getQueryData(["actor"]) as any) ||
        (queryClient
          .getQueryCache()
          .findAll({ type: "active" })
          .find((q) => q.queryKey[0] === "actor")?.state.data as any);
      if (!a)
        throw new Error("App is still loading. Please wait and try again.");
      return a.requestOtp(phone);
    },
  });
  return { ...mutation, actorLoading: isFetching || !actor };
}

export function useVerifyOtp() {
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();
  const mutation = useMutation<boolean, Error, string>({
    mutationFn: async (otp: string) => {
      const a =
        actor ||
        (queryClient
          .getQueryCache()
          .findAll({ type: "active" })
          .find((q) => q.queryKey[0] === "actor")?.state.data as any);
      if (!a)
        throw new Error("App is still loading. Please wait and try again.");
      return a.verifyOtp(otp);
    },
  });
  return { ...mutation, actorLoading: isFetching || !actor };
}

export function useSetPassword() {
  const { actor, isFetching } = useActor();
  const qc = useQueryClient();
  const mutation = useMutation<boolean, Error, string>({
    mutationFn: async (password: string) => {
      const a =
        actor ||
        (qc
          .getQueryCache()
          .findAll({ type: "active" })
          .find((q) => q.queryKey[0] === "actor")?.state.data as any);
      if (!a)
        throw new Error("App is still loading. Please wait and try again.");
      return a.setPassword(password);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["authStatus"] });
    },
  });
  return { ...mutation, actorLoading: isFetching || !actor };
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

export function useRequestDeposit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<
    string,
    Error,
    { phone: string; amount: number; upiRef: string }
  >({
    mutationFn: async ({ phone, amount, upiRef }) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).requestDeposit(phone, amount, upiRef);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myDeposits"] });
    },
  });
}

export function useRequestWithdrawal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<
    string,
    Error,
    { phone: string; amount: number; upiId: string }
  >({
    mutationFn: async ({ phone, amount, upiId }) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).requestWithdrawal(phone, amount, upiId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myWithdrawals"] });
      qc.invalidateQueries({ queryKey: ["balance"] });
    },
  });
}

export function useMyDeposits(phone: string) {
  const { actor, isFetching } = useActor();
  return useQuery<DepositRecord[]>({
    queryKey: ["myDeposits", phone],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getMyDeposits(phone);
    },
    enabled: !!actor && !isFetching && !!phone,
    refetchInterval: 10000,
  });
}

export function useMyWithdrawals(phone: string) {
  const { actor, isFetching } = useActor();
  return useQuery<WithdrawalRecord[]>({
    queryKey: ["myWithdrawals", phone],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getMyWithdrawals(phone);
    },
    enabled: !!actor && !isFetching && !!phone,
    refetchInterval: 10000,
  });
}

export function useAllUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<UserSummary[]>({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllUsers();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15000,
  });
}

export function useAllWithdrawals() {
  const { actor, isFetching } = useActor();
  return useQuery<WithdrawalRecord[]>({
    queryKey: ["allWithdrawals"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllWithdrawals();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useAllDeposits() {
  const { actor, isFetching } = useActor();
  return useQuery<DepositRecord[]>({
    queryKey: ["allDeposits"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllDeposits();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useBlockUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (phone: string) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).blockUser(phone);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
    },
  });
}

export function useUnblockUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (phone: string) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).unblockUser(phone);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
    },
  });
}

export function useAdjustBalance() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<boolean, Error, { phone: string; newBalance: number }>({
    mutationFn: async ({ phone, newBalance }) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).adjustBalance(phone, newBalance);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
      qc.invalidateQueries({ queryKey: ["balance"] });
    },
  });
}

export function useApproveWithdrawal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).approveWithdrawal(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allWithdrawals"] });
      qc.invalidateQueries({ queryKey: ["allUsers"] });
    },
  });
}

export function useRejectWithdrawal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).rejectWithdrawal(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allWithdrawals"] });
      qc.invalidateQueries({ queryKey: ["allUsers"] });
      qc.invalidateQueries({ queryKey: ["balance"] });
    },
  });
}

export function useApproveDeposit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).approveDeposit(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allDeposits"] });
      qc.invalidateQueries({ queryKey: ["allUsers"] });
    },
  });
}

export function useRejectDeposit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).rejectDeposit(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allDeposits"] });
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
