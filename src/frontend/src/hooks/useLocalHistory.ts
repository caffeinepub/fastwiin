import { useCallback, useState } from "react";

export interface DepositRecord {
  id: string;
  amount: number;
  upiRef: string;
  date: string;
  status: "success";
}

export interface WithdrawRecord {
  id: string;
  amount: number;
  upiId: string;
  date: string;
  status: "pending";
}

export interface BetRecord {
  id: string;
  mode: string;
  amount: number;
  target: string;
  periodId: string;
  date: string;
}

function loadFromStorage<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useLocalHistory(phone: string) {
  const depositKey = `fastwiin_deposits_${phone}`;
  const withdrawKey = `fastwiin_withdrawals_${phone}`;
  const betKey = `fastwiin_bets_${phone}`;

  const [depositHistory, setDepositHistory] = useState<DepositRecord[]>(() =>
    loadFromStorage<DepositRecord>(depositKey),
  );
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawRecord[]>(() =>
    loadFromStorage<WithdrawRecord>(withdrawKey),
  );
  const [betHistory, setBetHistory] = useState<BetRecord[]>(() =>
    loadFromStorage<BetRecord>(betKey),
  );

  const addDeposit = useCallback(
    (amount: number, upiRef: string) => {
      const record: DepositRecord = {
        id: `dep_${Date.now()}`,
        amount,
        upiRef,
        date: new Date().toLocaleString("en-IN"),
        status: "success",
      };
      setDepositHistory((prev) => {
        const updated = [record, ...prev];
        saveToStorage(depositKey, updated);
        return updated;
      });
    },
    [depositKey],
  );

  const addWithdraw = useCallback(
    (amount: number, upiId: string) => {
      const record: WithdrawRecord = {
        id: `wth_${Date.now()}`,
        amount,
        upiId,
        date: new Date().toLocaleString("en-IN"),
        status: "pending",
      };
      setWithdrawHistory((prev) => {
        const updated = [record, ...prev];
        saveToStorage(withdrawKey, updated);
        return updated;
      });
    },
    [withdrawKey],
  );

  const addBet = useCallback(
    (mode: string, amount: number, target: string, periodId: string) => {
      const record: BetRecord = {
        id: `bet_${Date.now()}`,
        mode,
        amount,
        target,
        periodId,
        date: new Date().toLocaleString("en-IN"),
      };
      setBetHistory((prev) => {
        const updated = [record, ...prev.slice(0, 99)];
        saveToStorage(betKey, updated);
        return updated;
      });
    },
    [betKey],
  );

  return {
    depositHistory,
    withdrawHistory,
    betHistory,
    addDeposit,
    addWithdraw,
    addBet,
  };
}
