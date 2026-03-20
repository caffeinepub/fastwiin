import type { ReferralRecord } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import {
  useAuthStatus,
  useBalance,
  useChangePassword,
  useRequestDeposit,
  useRequestWithdrawal,
} from "@/hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Camera,
  Check,
  Copy,
  Gift,
  HeadphonesIcon,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Phone,
  Shield,
  Smartphone,
  TrendingUp,
  User,
  Users,
  Wallet,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// ── Local deposit/withdrawal history helpers ──────────────────────────────────

export type LocalDepositRecord = {
  id: string;
  amount: number;
  method: "upi";
  ref: string;
  status: "success" | "pending";
  timestamp: number;
};

export type LocalWithdrawalRecord = {
  id: string;
  amount: number;
  upiId: string;
  status: "pending" | "approved" | "rejected";
  timestamp: number;
};

function getDepositHistory(phone: string): LocalDepositRecord[] {
  try {
    const raw = localStorage.getItem(`fastwiin_deposits_${phone}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDepositRecord(phone: string, record: LocalDepositRecord) {
  const history = getDepositHistory(phone);
  history.unshift(record);
  localStorage.setItem(`fastwiin_deposits_${phone}`, JSON.stringify(history));
}

function getWithdrawalHistory(phone: string): LocalWithdrawalRecord[] {
  try {
    const raw = localStorage.getItem(`fastwiin_withdrawals_${phone}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWithdrawalRecord(phone: string, record: LocalWithdrawalRecord) {
  const history = getWithdrawalHistory(phone);
  history.unshift(record);
  localStorage.setItem(
    `fastwiin_withdrawals_${phone}`,
    JSON.stringify(history),
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Must contain uppercase";
  if (!/[0-9]/.test(pw)) return "Must contain a number";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Must contain a special character";
  return null;
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "success" || status === "approved"
      ? "oklch(0.62 0.19 145)"
      : status === "pending"
        ? "oklch(0.84 0.16 89)"
        : "oklch(0.57 0.22 28)";
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest"
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {status}
    </span>
  );
}

const PLATFORM_UPI = "ankitzapda7@okicici";

function getAvatarUrl(phone: string): string {
  return localStorage.getItem(`fastwiin_avatar_${phone}`) ?? "";
}

function setAvatarUrl(phone: string, url: string) {
  localStorage.setItem(`fastwiin_avatar_${phone}`, url);
}

function getDisplayName(phone: string): string {
  return localStorage.getItem(`fastwiin_name_${phone}`) ?? "";
}

function setDisplayName(phone: string, name: string) {
  localStorage.setItem(`fastwiin_name_${phone}`, name);
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AccountPage({
  onLogout,
  phone,
}: { onLogout: () => void; phone: string }) {
  const { data: authStatus } = useAuthStatus();
  const { data: balance } = useBalance();
  const { identity } = useInternetIdentity();
  const changePassword = useChangePassword();
  const requestDeposit = useRequestDeposit();
  const requestWithdrawal = useRequestWithdrawal();
  const { t } = useLanguage();
  const { betHistory } = useLocalHistory(phone);
  const qc = useQueryClient();

  const [historyVersion, setHistoryVersion] = useState(0);
  const depositHistory = getDepositHistory(phone);
  const withdrawHistory = getWithdrawalHistory(phone);

  const [showChangePw, setShowChangePw] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [copied, setCopied] = useState(false);
  const [upiIdCopied, setUpiIdCopied] = useState(false);

  const [depAmount, setDepAmount] = useState("");
  const [depLoading, setDepLoading] = useState(false);
  const [utrRef, setUtrRef] = useState("");

  const [wthAmount, setWthAmount] = useState("");
  const [wthUpiId, setWthUpiId] = useState("");

  // Bet history filters
  const [betModeFilter, setBetModeFilter] = useState<
    "all" | "30s" | "1min" | "3min"
  >("all");
  const [betDateFilter, setBetDateFilter] = useState<"today" | "week" | "all">(
    "all",
  );

  // Withdrawal status change detection
  const prevWithdrawRef = useRef<Record<string, string>>({});
  useEffect(() => {
    const currentStatuses: Record<string, string> = {};
    for (const w of withdrawHistory) {
      currentStatuses[w.id] = w.status;
      const prev = prevWithdrawRef.current[w.id];
      if (prev && prev !== w.status) {
        if (w.status === "approved") {
          toast.success(
            `₹${w.amount.toLocaleString("en-IN")} निकासी स्वीकृत हुई! Your withdrawal of ₹${w.amount.toLocaleString("en-IN")} has been approved`,
          );
        } else if (w.status === "rejected") {
          toast.error(
            `₹${w.amount.toLocaleString("en-IN")} निकासी अस्वीकृत. Your withdrawal of ₹${w.amount.toLocaleString("en-IN")} has been rejected`,
          );
        }
      }
    }
    prevWithdrawRef.current = currentStatuses;
  }, [withdrawHistory]);

  // Filtered bet history
  const filteredBetHistory = useMemo(() => {
    let result = betHistory;
    if (betModeFilter !== "all") {
      result = result.filter((b) => b.mode === betModeFilter);
    }
    if (betDateFilter !== "all") {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const oneWeekMs = 7 * oneDayMs;
      result = result.filter((b) => {
        // Try to parse date from b.date string
        const ts = new Date(b.date).getTime();
        if (Number.isNaN(ts)) return true;
        if (betDateFilter === "today") return now - ts < oneDayMs;
        if (betDateFilter === "week") return now - ts < oneWeekMs;
        return true;
      });
    }
    return result;
  }, [betHistory, betModeFilter, betDateFilter]);

  const principalId = identity?.getPrincipal().toString() ?? null;
  const shortPrincipal = principalId
    ? `${principalId.slice(0, 8)}...${principalId.slice(-4)}`
    : "Not connected";

  const handleCopy = () => {
    if (!principalId) return;
    navigator.clipboard.writeText(principalId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Principal ID copied!");
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(PLATFORM_UPI);
    setUpiIdCopied(true);
    setTimeout(() => setUpiIdCopied(false), 2000);
    toast.success("UPI ID copied!");
  };

  const handleChangePassword = async () => {
    if (!oldPw) {
      toast.error("Enter your current password");
      return;
    }
    const err = validatePassword(newPw);
    if (err) {
      toast.error(err);
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      const ok = await changePassword.mutateAsync({
        oldPassword: oldPw,
        newPassword: newPw,
      });
      if (ok) {
        toast.success("Password changed successfully!");
        localStorage.setItem("fastwiin_password_hash", btoa(newPw));
        setShowChangePw(false);
        setOldPw("");
        setNewPw("");
        setConfirmPw("");
      } else {
        toast.error("Incorrect current password");
      }
    } catch {
      toast.error("Failed to change password");
    }
  };

  const handleUpiDeposit = async () => {
    const amt = Number.parseInt(depAmount, 10);
    if (Number.isNaN(amt) || amt < 100) {
      toast.error("Minimum deposit is ₹100");
      return;
    }
    if (amt > 10000) {
      toast.error("Maximum deposit is ₹10,000");
      return;
    }
    if (!utrRef.trim()) {
      toast.error("Enter UTR / Transaction ID");
      return;
    }
    setDepLoading(true);
    try {
      await requestDeposit.mutateAsync({
        phone,
        amount: amt,
        upiRef: utrRef.trim(),
      });
      saveDepositRecord(phone, {
        id: `dep_upi_${Date.now()}`,
        amount: amt,
        method: "upi",
        ref: utrRef.trim(),
        status: "pending",
        timestamp: Date.now(),
      });
      setHistoryVersion((v) => v + 1);
      toast.success("Deposit request submitted! Awaiting admin approval.");
      qc.invalidateQueries({ queryKey: ["myDeposits"] });
      setDepAmount("");
      setUtrRef("");
    } catch {
      toast.error("Deposit failed. Please try again.");
    } finally {
      setDepLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = Number.parseInt(wthAmount, 10);
    if (Number.isNaN(amt) || amt < 100) {
      toast.error("Minimum withdrawal is ₹100");
      return;
    }
    if (amt > 10000) {
      toast.error("Maximum withdrawal is ₹10,000");
      return;
    }
    if (!wthUpiId.trim()) {
      toast.error("Enter UPI ID");
      return;
    }
    try {
      await requestWithdrawal.mutateAsync({
        phone,
        amount: amt,
        upiId: wthUpiId.trim(),
      });
      saveWithdrawalRecord(phone, {
        id: `wth_${Date.now()}`,
        amount: amt,
        upiId: wthUpiId.trim(),
        status: "pending",
        timestamp: Date.now(),
      });
      setHistoryVersion((v) => v + 1);
      toast.success("Withdrawal request submitted! Awaiting admin approval.");
      setWthAmount("");
      setWthUpiId("");
    } catch {
      saveWithdrawalRecord(phone, {
        id: `wth_${Date.now()}`,
        amount: amt,
        upiId: wthUpiId.trim(),
        status: "pending",
        timestamp: Date.now(),
      });
      setHistoryVersion((v) => v + 1);
      toast.success("Withdrawal request submitted! Awaiting admin approval.");
      setWthAmount("");
      setWthUpiId("");
    }
  };

  void historyVersion;

  // Account stats from local bet history
  const totalBetsPlaced = betHistory.length;
  const totalWagered = betHistory.reduce((s, b) => s + b.amount, 0);
  const biggestBet = betHistory.length
    ? Math.max(...betHistory.map((b) => b.amount))
    : 0;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-28">
      <h1
        className="text-xl font-black uppercase tracking-widest mb-5"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.96 0 0), oklch(0.84 0.16 89))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {t("myAccount")}
      </h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList
          className="w-full grid grid-cols-7 mb-5 h-auto p-1 rounded-xl"
          style={{
            background: "oklch(0.09 0 0)",
            border: "1px solid oklch(0.20 0 0)",
            boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.04)",
          }}
        >
          {[
            { value: "profile", label: t("profile") },
            { value: "deposit", label: t("deposit") },
            { value: "withdraw", label: t("withdraw") },
            { value: "bets", label: t("betHistory") },
            { value: "guide", label: t("beginnerGuide") },
            { value: "referral", label: "Invite" },
            { value: "support", label: "Support" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              data-ocid={`account.${tab.value}.tab`}
              className="text-[9px] font-bold uppercase tracking-wide py-2 px-0.5 rounded-lg data-[state=active]:bg-cta data-[state=active]:text-cta-foreground data-[state=active]:shadow-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── PROFILE TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="profile" className="space-y-4 mt-0">
          <ProfileTab
            phone={phone}
            authStatus={authStatus}
            balance={balance ?? 0}
            shortPrincipal={shortPrincipal}
            copied={copied}
            onCopy={handleCopy}
            showChangePw={showChangePw}
            setShowChangePw={setShowChangePw}
            oldPw={oldPw}
            setOldPw={setOldPw}
            newPw={newPw}
            setNewPw={setNewPw}
            confirmPw={confirmPw}
            setConfirmPw={setConfirmPw}
            onChangePassword={handleChangePassword}
            isPendingPw={changePassword.isPending}
            onLogout={onLogout}
            totalBetsPlaced={totalBetsPlaced}
            totalWagered={totalWagered}
            biggestBet={biggestBet}
          />
        </TabsContent>

        {/* ── DEPOSIT TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="deposit" className="space-y-4 mt-0">
          <div className="card-surface p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone
                className="w-4 h-4"
                style={{ color: "oklch(0.84 0.16 89)" }}
              />
              <h2 className="font-black uppercase tracking-widest text-sm">
                UPI {t("deposit")}
              </h2>
            </div>

            <div
              className="rounded-xl px-4 py-3 text-xs leading-relaxed"
              style={{
                background: "oklch(0.50 0.22 296 / 0.10)",
                border: "1px solid oklch(0.50 0.22 296 / 0.25)",
                color: "oklch(0.72 0.18 296)",
              }}
            >
              Send payment to the UPI ID below, enter your UTR, and submit. Your
              balance will be credited after admin confirms the payment.
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Send to UPI ID
              </Label>
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-3"
                style={{
                  background: "oklch(0.08 0 0)",
                  border: "1px solid oklch(0.84 0.16 89 / 0.35)",
                  boxShadow: "0 0 12px oklch(0.84 0.16 89 / 0.08)",
                }}
              >
                <span
                  className="flex-1 font-mono text-sm font-bold"
                  style={{ color: "oklch(0.84 0.16 89)" }}
                >
                  {PLATFORM_UPI}
                </span>
                <button
                  type="button"
                  data-ocid="deposit.copy.button"
                  onClick={handleCopyUpi}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  {upiIdCopied ? (
                    <Check
                      className="w-4 h-4"
                      style={{ color: "oklch(0.62 0.19 145)" }}
                    />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("amount")}
              </Label>
              <Input
                data-ocid="deposit.input"
                type="number"
                min={100}
                max={10000}
                placeholder="Enter amount (₹100 – ₹10,000)"
                value={depAmount}
                onChange={(e) => setDepAmount(e.target.value)}
                className="bg-input border-border rounded-xl"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setDepAmount(String(p))}
                  className="py-2 rounded-lg text-xs font-bold border transition-all"
                  style={{
                    background:
                      depAmount === String(p)
                        ? "oklch(0.84 0.16 89 / 0.15)"
                        : "transparent",
                    borderColor:
                      depAmount === String(p)
                        ? "oklch(0.84 0.16 89 / 0.70)"
                        : "oklch(0.22 0 0)",
                    color:
                      depAmount === String(p)
                        ? "oklch(0.84 0.16 89)"
                        : "oklch(0.55 0 0)",
                  }}
                >
                  ₹{p}
                </button>
              ))}
            </div>

            {depAmount && Number(depAmount) >= 100 && (
              <div
                className="rounded-xl px-3 py-2.5 text-xs leading-relaxed"
                style={{
                  background: "oklch(0.84 0.16 89 / 0.08)",
                  border: "1px solid oklch(0.84 0.16 89 / 0.25)",
                  color: "oklch(0.84 0.16 89)",
                }}
              >
                Send <span className="font-black">₹{depAmount}</span> to{" "}
                <span className="font-black">{PLATFORM_UPI}</span> via any UPI
                app, then enter your UTR / transaction ID below.
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                UTR / Transaction ID
              </Label>
              <Input
                data-ocid="deposit.textarea"
                type="text"
                placeholder="Enter UTR / Transaction ID"
                value={utrRef}
                onChange={(e) => setUtrRef(e.target.value)}
                className="bg-input border-border rounded-xl"
              />
            </div>

            <Button
              data-ocid="deposit.submit_button"
              onClick={handleUpiDeposit}
              disabled={depLoading}
              className="w-full h-11 font-black rounded-xl glow-cta transition-all"
              style={{
                background: "oklch(0.84 0.16 89)",
                color: "oklch(0.08 0 0)",
              }}
            >
              {depLoading
                ? "Submitting..."
                : `Submit Deposit${depAmount ? ` ₹${depAmount}` : ""}`}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              Balance credited after admin confirms payment
            </p>
          </div>

          <div className="card-surface p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
              {t("depositHistory")}
            </h3>
            {depositHistory.length === 0 ? (
              <p
                className="text-xs text-muted-foreground text-center py-6"
                data-ocid="deposit.empty_state"
              >
                {t("noHistory")}
              </p>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {depositHistory.map((d, i) => (
                    <div
                      key={d.id}
                      data-ocid={`deposit.item.${i + 1}`}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5"
                      style={{
                        background:
                          i % 2 === 0 ? "oklch(0.08 0 0)" : "oklch(0.10 0 0)",
                        border: "1px solid oklch(0.16 0 0)",
                      }}
                    >
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          ₹{d.amount.toLocaleString("en-IN")}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {d.method} · {d.ref}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(d.timestamp).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <StatusBadge status={d.status} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* ── WITHDRAW TAB ────────────────────────────────────────────────── */}
        <TabsContent value="withdraw" className="space-y-4 mt-0">
          <div className="card-surface p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet
                className="w-4 h-4"
                style={{ color: "oklch(0.84 0.16 89)" }}
              />
              <h2 className="font-black uppercase tracking-widest text-sm">
                {t("withdraw")}
              </h2>
            </div>
            <div
              className="rounded-xl px-3 py-2.5 text-xs"
              style={{
                background: "oklch(0.84 0.16 89 / 0.08)",
                border: "1px solid oklch(0.84 0.16 89 / 0.25)",
                color: "oklch(0.84 0.16 89)",
              }}
              data-ocid="withdraw.panel"
            >
              {t("withdrawNote")}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("amount")}
              </Label>
              <Input
                data-ocid="withdraw.input"
                type="number"
                min={100}
                max={10000}
                placeholder={t("enterAmount")}
                value={wthAmount}
                onChange={(e) => setWthAmount(e.target.value)}
                className="bg-input border-border rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("upiId")}
              </Label>
              <Input
                data-ocid="withdraw.input"
                type="text"
                placeholder={t("enterUpiId")}
                value={wthUpiId}
                onChange={(e) => setWthUpiId(e.target.value)}
                className="bg-input border-border rounded-xl"
              />
            </div>
            <Button
              data-ocid="withdraw.submit_button"
              onClick={handleWithdraw}
              className="w-full h-11 font-black rounded-xl"
              style={{
                background: "oklch(0.84 0.16 89)",
                color: "oklch(0.08 0 0)",
              }}
            >
              {t("submit")}
            </Button>
          </div>

          <div className="card-surface p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
              {t("withdrawHistory")}
            </h3>
            {withdrawHistory.length === 0 ? (
              <p
                className="text-xs text-muted-foreground text-center py-6"
                data-ocid="withdraw.empty_state"
              >
                {t("noHistory")}
              </p>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {withdrawHistory.map((w, i) => (
                    <div
                      key={w.id}
                      data-ocid={`withdraw.item.${i + 1}`}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5"
                      style={{
                        background:
                          i % 2 === 0 ? "oklch(0.08 0 0)" : "oklch(0.10 0 0)",
                        border: "1px solid oklch(0.16 0 0)",
                      }}
                    >
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          ₹{w.amount.toLocaleString("en-IN")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {w.upiId}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(w.timestamp).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <StatusBadge status={w.status} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* ── BETS TAB ────────────────────────────────────────────────────── */}
        <TabsContent value="bets" className="mt-0">
          <div className="card-surface p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              {t("betHistory")}
            </h3>

            {/* Mode filter */}
            <div className="flex gap-1 flex-wrap" data-ocid="bets.filter.tab">
              {(["all", "30s", "1min", "3min"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  data-ocid={`bets.${m}.tab`}
                  onClick={() => setBetModeFilter(m)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all"
                  style={{
                    background:
                      betModeFilter === m
                        ? "oklch(0.98 0 0)"
                        : "oklch(0.14 0 0)",
                    color:
                      betModeFilter === m
                        ? "oklch(0.06 0 0)"
                        : "oklch(0.55 0 0)",
                    border: `1px solid ${betModeFilter === m ? "oklch(0.98 0 0)" : "oklch(0.22 0 0)"}`,
                  }}
                >
                  {m === "all" ? t("allModes") : m.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Date filter */}
            <div className="flex gap-1 flex-wrap">
              {(
                [
                  { key: "today", label: t("today") },
                  { key: "week", label: t("thisWeek") },
                  { key: "all", label: t("allTime2") },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  data-ocid={`bets.date.${key}.tab`}
                  onClick={() => setBetDateFilter(key)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all"
                  style={{
                    background:
                      betDateFilter === key
                        ? "oklch(0.84 0.16 89)"
                        : "oklch(0.14 0 0)",
                    color:
                      betDateFilter === key
                        ? "oklch(0.06 0 0)"
                        : "oklch(0.55 0 0)",
                    border: `1px solid ${betDateFilter === key ? "oklch(0.84 0.16 89)" : "oklch(0.22 0 0)"}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {filteredBetHistory.length === 0 ? (
              <p
                className="text-xs text-muted-foreground text-center py-6"
                data-ocid="bets.empty_state"
              >
                {t("noHistory")}
              </p>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {filteredBetHistory.map((b, i) => (
                    <div
                      key={b.id}
                      data-ocid={`bets.item.${i + 1}`}
                      className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                      style={{
                        background:
                          i % 2 === 0 ? "oklch(0.08 0 0)" : "oklch(0.10 0 0)",
                        border: "1px solid oklch(0.16 0 0)",
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                            style={{
                              background: "oklch(0.18 0 0)",
                              color: "oklch(0.80 0 0)",
                              border: "1px solid oklch(0.24 0 0)",
                            }}
                          >
                            {b.mode}
                          </span>
                          <span className="text-xs font-bold">{b.target}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Period: {b.periodId}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {b.date}
                        </p>
                      </div>
                      <p
                        className="text-sm font-black"
                        style={{ color: "oklch(0.84 0.16 89)" }}
                      >
                        ₹{Math.round(b.amount).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* ── GUIDE TAB ───────────────────────────────────────────────────── */}
        <TabsContent value="guide" className="mt-0">
          <div className="card-surface p-5 space-y-5">
            <div className="flex items-center gap-2">
              <BookOpen
                className="w-4 h-4"
                style={{ color: "oklch(0.84 0.16 89)" }}
              />
              <h2 className="font-black uppercase tracking-widest text-sm">
                {t("beginnerGuide")}
              </h2>
            </div>

            <div className="space-y-2">
              <h3
                className="text-xs font-black uppercase tracking-widest"
                style={{ color: "oklch(0.84 0.16 89)" }}
              >
                {t("howToPlay")}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pick a color (Green, Red, Purple) or a number (0–9) before the
                countdown hits 5 seconds. If your prediction matches the result,
                you win!
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Color Mapping
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    nums: "1, 3, 7, 9",
                    color: "Green",
                    bg: "oklch(0.62 0.19 145)",
                  },
                  {
                    nums: "2, 4, 6, 8",
                    color: "Red",
                    bg: "oklch(0.57 0.22 28)",
                  },
                  {
                    nums: "0",
                    color: "Purple + Red",
                    bg: "linear-gradient(135deg,oklch(0.50 0.22 296) 50%,oklch(0.57 0.22 28) 50%)",
                  },
                  {
                    nums: "5",
                    color: "Green + Purple",
                    bg: "linear-gradient(135deg,oklch(0.62 0.19 145) 50%,oklch(0.50 0.22 296) 50%)",
                  },
                ].map((c) => (
                  <div
                    key={c.nums}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                    style={{
                      background: "oklch(0.10 0 0)",
                      border: "1px solid oklch(0.18 0 0)",
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex-shrink-0"
                      style={{ background: c.bg }}
                    />
                    <div>
                      <p className="text-xs font-bold">{c.nums}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.color}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Payouts
              </h3>
              <div className="space-y-1.5">
                {[
                  {
                    label: "Number bet",
                    value: "9×",
                    color: "oklch(0.84 0.16 89)",
                  },
                  {
                    label: "Green / Red",
                    value: "2×",
                    color: "oklch(0.62 0.19 145)",
                  },
                  {
                    label: "Purple",
                    value: "5×",
                    color: "oklch(0.50 0.22 296)",
                  },
                  {
                    label: "Split (0 or 5)",
                    value: "Half payout",
                    color: "oklch(0.55 0 0)",
                  },
                ].map((p) => (
                  <div
                    key={p.label}
                    className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{
                      background: "oklch(0.10 0 0)",
                      border: "1px solid oklch(0.17 0 0)",
                    }}
                  >
                    <span className="text-xs text-muted-foreground">
                      {p.label}
                    </span>
                    <span
                      className="text-sm font-black"
                      style={{ color: p.color }}
                    >
                      {p.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                How to Bet
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("howToBet")}
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{
                background: "oklch(0.57 0.22 28 / 0.10)",
                border: "1px solid oklch(0.57 0.22 28 / 0.30)",
              }}
              data-ocid="guide.panel"
            >
              <p
                className="text-xs font-bold"
                style={{ color: "oklch(0.75 0.20 28)" }}
              >
                {t("disclaimer")}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ── REFERRAL TAB ────────────────────────────────────────────────── */}
        <TabsContent value="referral" className="mt-0">
          <ReferralTab phone={phone} />
        </TabsContent>

        {/* ── SUPPORT TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="support" className="mt-0">
          <SupportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({
  phone,
  authStatus,
  balance,
  shortPrincipal,
  copied,
  onCopy,
  showChangePw,
  setShowChangePw,
  oldPw,
  setOldPw,
  newPw,
  setNewPw,
  confirmPw,
  setConfirmPw,
  onChangePassword,
  isPendingPw,
  onLogout,
  totalBetsPlaced,
  totalWagered,
  biggestBet,
}: {
  phone: string;
  authStatus: { phone: string } | null | undefined;
  balance: number;
  shortPrincipal: string;
  copied: boolean;
  onCopy: () => void;
  showChangePw: boolean;
  setShowChangePw: (v: boolean) => void;
  oldPw: string;
  setOldPw: (v: string) => void;
  newPw: string;
  setNewPw: (v: string) => void;
  confirmPw: string;
  setConfirmPw: (v: string) => void;
  onChangePassword: () => void;
  isPendingPw: boolean;
  onLogout: () => void;
  totalBetsPlaced: number;
  totalWagered: number;
  biggestBet: number;
}) {
  const { actor } = useActor();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(() => getDisplayName(phone));
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(name);
  const [avatarUrl, setAvatarUrlState] = useState(() => getAvatarUrl(phone));
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Sync profile name from backend on mount
  useQuery({
    queryKey: ["userProfile", phone],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const profile = await (actor as any).getCallerUserProfile();
        if (profile?.name) {
          setName(profile.name);
          setNameInput(profile.name);
          setDisplayName(phone, profile.name);
        }
        return profile;
      } catch {
        return null;
      }
    },
    enabled: !!actor,
  });

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSavingName(true);
    try {
      if (actor) {
        await (actor as any).saveCallerUserProfile({
          name: nameInput.trim(),
          phone,
        });
      }
      setDisplayName(phone, nameInput.trim());
      setName(nameInput.trim());
      setEditingName(false);
      toast.success("Name updated!");
    } catch {
      // Save locally even if backend fails
      setDisplayName(phone, nameInput.trim());
      setName(nameInput.trim());
      setEditingName(false);
      toast.success("Name updated!");
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarUrl(phone, dataUrl);
      setAvatarUrlState(dataUrl);
      setUploadingAvatar(false);
      toast.success("Avatar updated!");
    };
    reader.onerror = () => {
      setUploadingAvatar(false);
      toast.error("Failed to read image");
    };
    reader.readAsDataURL(file);
  };

  const initials = (name || authStatus?.phone || phone || "P")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    if (editingName) setNameInput(name);
  }, [editingName, name]);

  return (
    <div className="space-y-4">
      {/* Avatar + Name card */}
      <div className="card-surface p-5 space-y-4">
        {/* Avatar upload */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div
              className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center font-black text-xl avatar-ring"
              style={{
                background: avatarUrl
                  ? "transparent"
                  : "linear-gradient(135deg, oklch(0.18 0 0), oklch(0.24 0.03 89))",
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span style={{ color: "oklch(0.84 0.16 89)" }}>{initials}</span>
              )}
            </div>
            <button
              type="button"
              data-ocid="account.upload_button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{
                background: "oklch(0.84 0.16 89)",
                border: "2px solid oklch(0.07 0 0)",
              }}
            >
              <Camera
                className="w-3 h-3"
                style={{ color: "oklch(0.08 0 0)" }}
              />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your name"
                  className="h-8 text-sm bg-input border-border rounded-lg flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  autoFocus
                />
                <button
                  type="button"
                  data-ocid="account.save_button"
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
                  style={{
                    background: "oklch(0.84 0.16 89)",
                    color: "oklch(0.08 0 0)",
                  }}
                >
                  {savingName ? "..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-bold text-base truncate">
                  {name || authStatus?.phone || "Player"}
                </p>
                <button
                  type="button"
                  data-ocid="account.edit_button"
                  onClick={() => setEditingName(true)}
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  style={{
                    background: "oklch(0.16 0 0)",
                    border: "1px solid oklch(0.22 0 0)",
                  }}
                >
                  Edit
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              Fastwiin Member
            </p>
          </div>
        </div>

        {/* Balance */}
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.84 0.16 89 / 0.10), oklch(0.84 0.16 89 / 0.04))",
            border: "1px solid oklch(0.84 0.16 89 / 0.25)",
          }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Balance
            </p>
            <p
              className="text-2xl font-black mt-0.5"
              style={{ color: "oklch(0.84 0.16 89)" }}
            >
              ₹{(balance ?? 0).toLocaleString("en-IN")}
            </p>
          </div>
          <Wallet
            className="w-8 h-8 opacity-20"
            style={{ color: "oklch(0.84 0.16 89)" }}
          />
        </div>

        {/* User ID */}
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> User ID
          </Label>
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{
              background: "oklch(0.08 0 0)",
              border: "1px solid oklch(0.18 0 0)",
            }}
          >
            <code className="text-xs font-mono flex-1 text-muted-foreground">
              {shortPrincipal}
            </code>
            <button
              type="button"
              data-ocid="account.copy.button"
              onClick={onCopy}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? (
                <Check
                  className="w-3.5 h-3.5"
                  style={{ color: "oklch(0.62 0.19 145)" }}
                />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Phone className="w-3 h-3" /> Phone Number
          </Label>
          <div
            className="rounded-xl px-3 py-2"
            style={{
              background: "oklch(0.08 0 0)",
              border: "1px solid oklch(0.18 0 0)",
            }}
          >
            <p className="text-sm font-mono">{authStatus?.phone || "—"}</p>
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <KeyRound className="w-3 h-3" /> Password
          </Label>
          <div className="flex items-center gap-2">
            <div
              className="rounded-xl px-3 py-2 flex-1"
              style={{
                background: "oklch(0.08 0 0)",
                border: "1px solid oklch(0.18 0 0)",
              }}
            >
              <p className="text-sm font-mono tracking-widest">••••••••</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              data-ocid="account.edit_button"
              onClick={() => setShowChangePw(!showChangePw)}
              className="border-border text-foreground hover:bg-accent text-xs rounded-xl"
            >
              {showChangePw ? "Cancel" : "Change"}
            </Button>
          </div>
        </div>

        {showChangePw && (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "oklch(0.08 0 0)",
              border: "1px solid oklch(0.22 0 0)",
            }}
            data-ocid="account.panel"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Change Password
            </p>
            {[
              ["old-pw", "Current Password", oldPw, setOldPw] as const,
              ["new-pw", "New Password", newPw, setNewPw] as const,
              [
                "confirm-pw",
                "Confirm New Password",
                confirmPw,
                setConfirmPw,
              ] as const,
            ].map(([id, label, val, setter]) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id} className="text-xs">
                  {label}
                </Label>
                <Input
                  id={id}
                  data-ocid="account.input"
                  type="password"
                  placeholder="••••••••"
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  className="bg-input border-border rounded-xl"
                />
              </div>
            ))}
            <div className="grid grid-cols-4 gap-1 text-xs">
              {[
                { label: "8+", ok: newPw.length >= 8 },
                { label: "A-Z", ok: /[A-Z]/.test(newPw) },
                { label: "0-9", ok: /[0-9]/.test(newPw) },
                { label: "!@#", ok: /[^A-Za-z0-9]/.test(newPw) },
              ].map((r) => (
                <span
                  key={r.label}
                  className="px-2 py-1 rounded text-center font-medium"
                  style={{
                    background: r.ok
                      ? "oklch(0.62 0.19 145 / 0.20)"
                      : "oklch(0.14 0 0)",
                    color: r.ok ? "oklch(0.62 0.19 145)" : "oklch(0.45 0 0)",
                  }}
                >
                  {r.label}
                </span>
              ))}
            </div>
            <Button
              data-ocid="account.save_button"
              onClick={onChangePassword}
              disabled={isPendingPw}
              className="w-full font-bold rounded-xl"
              style={{
                background: "oklch(0.84 0.16 89)",
                color: "oklch(0.08 0 0)",
              }}
            >
              {isPendingPw ? "Saving..." : "Save New Password"}
            </Button>
          </div>
        )}
      </div>

      {/* Account stats */}
      <div className="card-surface p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp
            className="w-4 h-4"
            style={{ color: "oklch(0.84 0.16 89)" }}
          />
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Account Stats
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Bets Placed",
              value: totalBetsPlaced.toLocaleString("en-IN"),
              color: "oklch(0.84 0.16 89)",
            },
            {
              label: "Total Wagered",
              value: `₹${Math.round(totalWagered).toLocaleString("en-IN")}`,
              color: "oklch(0.62 0.19 145)",
            },
            {
              label: "Biggest Bet",
              value:
                biggestBet > 0
                  ? `₹${Math.round(biggestBet).toLocaleString("en-IN")}`
                  : "—",
              color: "oklch(0.50 0.22 296)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-3 text-center"
              style={{
                background: "oklch(0.08 0 0)",
                border: "1px solid oklch(0.17 0 0)",
              }}
            >
              <p className="text-lg font-black" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        data-ocid="account.delete_button"
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors"
        style={{
          border: "1px solid oklch(0.57 0.22 28 / 0.50)",
          color: "oklch(0.57 0.22 28)",
        }}
      >
        <LogOut className="w-4 h-4" /> Logout
      </button>
    </div>
  );
}

// ── Support Tab ───────────────────────────────────────────────────────────────
function SupportTab() {
  return (
    <div className="space-y-4" data-ocid="support.card">
      {/* Header */}
      <div className="card-surface p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "oklch(0.84 0.16 89 / 0.12)",
              border: "1px solid oklch(0.84 0.16 89 / 0.30)",
            }}
          >
            <HeadphonesIcon
              className="w-5 h-5"
              style={{ color: "oklch(0.84 0.16 89)" }}
            />
          </div>
          <div>
            <h2 className="font-black text-base uppercase tracking-wide">
              Support
            </h2>
            <p className="text-xs text-muted-foreground">We're here to help</p>
          </div>
        </div>

        <div
          className="rounded-xl p-4 space-y-4"
          style={{
            background: "oklch(0.08 0 0)",
            border: "1px solid oklch(0.20 0 0)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "oklch(0.50 0.22 296 / 0.15)",
                border: "1px solid oklch(0.50 0.22 296 / 0.30)",
              }}
            >
              <Mail
                className="w-4 h-4"
                style={{ color: "oklch(0.70 0.18 296)" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">
                Email Support
              </p>
              <a
                href="mailto:ankitzapda7@gmail.com"
                data-ocid="support.link"
                className="text-sm font-bold transition-colors hover:opacity-80"
                style={{ color: "oklch(0.84 0.16 89)" }}
              >
                ankitzapda7@gmail.com
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Response Time
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Our support team typically responds within 24 hours. For urgent
            deposit/withdrawal issues, please include your phone number and
            transaction details in your email.
          </p>
        </div>

        <div
          className="rounded-xl p-3 space-y-2 text-xs"
          style={{
            background: "oklch(0.10 0 0)",
            border: "1px solid oklch(0.18 0 0)",
          }}
        >
          <p className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
            When contacting support, please include:
          </p>
          {[
            "Your registered phone number",
            "Transaction ID / UTR for payment issues",
            "Screenshot of any error you encountered",
            "Date and time of the issue",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <span style={{ color: "oklch(0.84 0.16 89)" }}>•</span>
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="card-surface p-5 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Common Questions
        </h3>
        {[
          {
            q: "How long does deposit take?",
            a: "After submitting your UTR, admin typically approves within 1–2 hours.",
          },
          {
            q: "When will I receive my withdrawal?",
            a: "Withdrawals are processed manually within 24 hours after admin approval.",
          },
          {
            q: "Minimum deposit & withdrawal?",
            a: "Minimum ₹100 and maximum ₹10,000 for both deposits and withdrawals.",
          },
        ].map((faq) => (
          <div
            key={faq.q}
            className="rounded-xl p-3"
            style={{
              background: "oklch(0.08 0 0)",
              border: "1px solid oklch(0.17 0 0)",
            }}
          >
            <p className="text-xs font-bold mb-1">{faq.q}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {faq.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Referral Tab ──────────────────────────────────────────────────────────────
function ReferralTab({ phone }: { phone: string }) {
  const { actor } = useActor();
  const [copied, setCopied] = useState(false);

  const { data: referralCode, isLoading: codeLoading } = useQuery<string>({
    queryKey: ["referralCode", phone],
    queryFn: async () => {
      if (!actor) return "";
      return actor.getReferralCode(phone);
    },
    enabled: !!actor && !!phone,
  });

  const { data: referralHistory, isLoading: histLoading } = useQuery<
    ReferralRecord[]
  >({
    queryKey: ["referralHistory", phone],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getReferralHistory(phone);
    },
    enabled: !!actor && !!phone,
  });

  const copyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Referral code copied!");
  };

  const maskPhone = (p: string) => `****${p.slice(-4)}`;

  const formatDate = (ts: bigint) => {
    return new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN");
  };

  return (
    <div className="space-y-4">
      <div className="card-surface p-5 space-y-4" data-ocid="referral.card">
        <div className="flex items-center gap-2 mb-1">
          <Gift className="w-5 h-5" style={{ color: "oklch(0.84 0.16 89)" }} />
          <h3 className="font-black text-base uppercase tracking-wide">
            Invite Friends
          </h3>
        </div>
        <div
          className="rounded-xl p-4 text-center space-y-1"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.08 0 0), oklch(0.10 0.005 89))",
            border: "1px solid oklch(0.84 0.16 89 / 0.20)",
          }}
        >
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            Your Referral Code
          </p>
          {codeLoading ? (
            <div
              className="h-8 w-32 mx-auto rounded animate-pulse"
              style={{ background: "oklch(0.18 0 0)" }}
            />
          ) : (
            <p
              className="text-2xl font-black tracking-widest"
              style={{
                color: "oklch(0.84 0.16 89)",
                textShadow: "0 0 20px oklch(0.84 0.16 89 / 0.4)",
              }}
            >
              {referralCode || "—"}
            </p>
          )}
        </div>
        <Button
          data-ocid="referral.copy_button"
          onClick={copyCode}
          disabled={!referralCode || codeLoading}
          className="w-full font-bold rounded-xl"
          style={{
            background: "oklch(0.16 0 0)",
            color: "oklch(0.90 0 0)",
            border: "1px solid oklch(0.28 0 0)",
          }}
        >
          {copied ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          {copied ? "Copied!" : "Copy Code"}
        </Button>
        <div
          className="rounded-xl p-3 space-y-2 text-sm"
          style={{
            background: "oklch(0.08 0 0)",
            border: "1px solid oklch(0.18 0 0)",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="font-bold"
              style={{ color: "oklch(0.62 0.19 145)" }}
            >
              ₹20
            </span>
            <span className="text-muted-foreground">
              — Your friend gets ₹20 bonus on signup
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="font-bold"
              style={{ color: "oklch(0.62 0.19 145)" }}
            >
              ₹100
            </span>
            <span className="text-muted-foreground">
              — You get ₹100 when they make their first deposit
            </span>
          </div>
        </div>
      </div>

      <div className="card-surface p-5 space-y-3" data-ocid="referral.table">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-bold text-sm uppercase tracking-wide">
            Referral History
          </h4>
        </div>
        {histLoading ? (
          <div className="space-y-2" data-ocid="referral.loading_state">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-10 rounded animate-pulse"
                style={{ background: "oklch(0.12 0 0)" }}
              />
            ))}
          </div>
        ) : !referralHistory || referralHistory.length === 0 ? (
          <div
            className="text-center py-8 text-muted-foreground text-sm"
            data-ocid="referral.empty_state"
          >
            <Gift className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No referrals yet. Share your code to start earning!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(0.18 0 0)" }}>
                  <th className="text-left py-2 text-muted-foreground font-medium">
                    Phone
                  </th>
                  <th className="text-center py-2 text-muted-foreground font-medium">
                    Signup
                  </th>
                  <th className="text-center py-2 text-muted-foreground font-medium">
                    Deposit
                  </th>
                  <th className="text-right py-2 text-muted-foreground font-medium">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {referralHistory.map((r, i) => (
                  <tr
                    key={`${r.referredPhone}-${String(r.timestamp)}`}
                    data-ocid={`referral.item.${i + 1}`}
                    style={{ borderBottom: "1px solid oklch(0.12 0 0)" }}
                  >
                    <td className="py-2 font-mono font-bold">
                      {maskPhone(r.referredPhone)}
                    </td>
                    <td className="py-2 text-center">
                      {r.signupBonusPaid ? (
                        <span
                          className="font-bold"
                          style={{ color: "oklch(0.62 0.19 145)" }}
                        >
                          ✓ ₹20
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      {r.depositBonusPaid ? (
                        <span
                          className="font-bold"
                          style={{ color: "oklch(0.62 0.19 145)" }}
                        >
                          ✓ ₹100
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {formatDate(r.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
