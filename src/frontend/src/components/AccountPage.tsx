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
  Check,
  Copy,
  Gift,
  KeyRound,
  Lock,
  LogOut,
  Phone,
  Shield,
  Smartphone,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
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
      ? "oklch(0.60 0.18 145)"
      : status === "pending"
        ? "oklch(0.84 0.16 89)"
        : "oklch(0.55 0.22 28)";
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest"
      style={{ background: `${color}20`, color }}
    >
      {status}
    </span>
  );
}

const PLATFORM_UPI = "ankitzapda7@okicici";

// ── Component ─────────────────────────────────────────────────────────────────

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

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <h1 className="text-lg font-black uppercase tracking-widest mb-4">
        {t("myAccount")}
      </h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList
          className="w-full grid grid-cols-6 mb-4 h-auto"
          style={{
            background: "oklch(0.10 0 0)",
            border: "1px solid oklch(0.18 0 0)",
          }}
        >
          {[
            { value: "profile", label: t("profile") },
            { value: "deposit", label: t("deposit") },
            { value: "withdraw", label: t("withdraw") },
            { value: "bets", label: t("betHistory") },
            { value: "guide", label: t("beginnerGuide") },
            { value: "referral", label: "Invite" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              data-ocid={`account.${tab.value}.tab`}
              className="text-[10px] font-bold uppercase tracking-wide py-2 px-1 data-[state=active]:bg-cta data-[state=active]:text-cta-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="space-y-4 mt-0">
          <div className="card-surface p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl"
                style={{ background: "oklch(0.20 0 0)" }}
              >
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-bold">{authStatus?.phone || "Player"}</p>
                <p className="text-xs text-muted-foreground">Fastwiin Member</p>
              </div>
            </div>

            <div className="bg-secondary rounded-lg p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                {t("balance")}
              </span>
              <span className="text-xl font-black text-cta">
                ₹{(balance ?? 0).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> User ID
              </Label>
              <div className="flex items-center gap-2 bg-input rounded-lg px-3 py-2">
                <code className="text-xs font-mono flex-1 text-muted-foreground">
                  {shortPrincipal}
                </code>
                <button
                  type="button"
                  data-ocid="account.copy.button"
                  onClick={handleCopy}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-game-green" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> Phone Number
              </Label>
              <div className="bg-input rounded-lg px-3 py-2">
                <p className="text-sm font-mono">{authStatus?.phone || "—"}</p>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <KeyRound className="w-3 h-3" /> Password
              </Label>
              <div className="flex items-center gap-2">
                <div className="bg-input rounded-lg px-3 py-2 flex-1">
                  <p className="text-sm font-mono tracking-widest">••••••••</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  data-ocid="account.edit_button"
                  onClick={() => setShowChangePw((v) => !v)}
                  className="border-border text-foreground hover:bg-accent text-xs"
                >
                  {showChangePw ? "Cancel" : "Change"}
                </Button>
              </div>
            </div>

            {showChangePw && (
              <div
                className="border border-border rounded-lg p-4 space-y-3"
                data-ocid="account.panel"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Change Password
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="old-pw" className="text-xs">
                    Current Password
                  </Label>
                  <Input
                    id="old-pw"
                    data-ocid="account.input"
                    type="password"
                    placeholder="••••••••"
                    value={oldPw}
                    onChange={(e) => setOldPw(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-pw" className="text-xs">
                    New Password
                  </Label>
                  <Input
                    id="new-pw"
                    data-ocid="account.input"
                    type="password"
                    placeholder="••••••••"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pw" className="text-xs">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirm-pw"
                    data-ocid="account.input"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  {[
                    { label: "8+", ok: newPw.length >= 8 },
                    { label: "A-Z", ok: /[A-Z]/.test(newPw) },
                    { label: "0-9", ok: /[0-9]/.test(newPw) },
                    { label: "!@#", ok: /[^A-Za-z0-9]/.test(newPw) },
                  ].map((r) => (
                    <span
                      key={r.label}
                      className={`px-2 py-1 rounded text-center font-medium ${r.ok ? "bg-game-green/20 text-game-green" : "bg-muted text-muted-foreground"}`}
                    >
                      {r.label}
                    </span>
                  ))}
                </div>
                <Button
                  data-ocid="account.save_button"
                  onClick={handleChangePassword}
                  disabled={changePassword.isPending}
                  className="w-full bg-cta text-cta-foreground hover:bg-cta/90 font-bold"
                >
                  {changePassword.isPending ? "Saving..." : "Save New Password"}
                </Button>
              </div>
            )}
          </div>

          <button
            type="button"
            data-ocid="account.delete_button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 border border-destructive/50 text-destructive rounded-lg py-3 text-sm font-bold hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </TabsContent>

        {/* DEPOSIT TAB */}
        <TabsContent value="deposit" className="space-y-4 mt-0">
          <div className="card-surface p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="w-4 h-4 text-cta" />
              <h2 className="font-black uppercase tracking-widest text-sm">
                UPI {t("deposit")}
              </h2>
            </div>

            {/* Info note */}
            <div
              className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
              style={{
                background: "oklch(0.48 0.22 296 / 0.10)",
                color: "oklch(0.70 0.18 296)",
              }}
            >
              Send payment to the UPI ID below, enter your UTR, and submit. Your
              balance will be credited after admin confirms the payment.
            </div>

            {/* Platform UPI ID */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Send to UPI ID
              </Label>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 border border-border bg-input">
                <span className="flex-1 font-mono text-sm font-bold text-cta">
                  {PLATFORM_UPI}
                </span>
                <button
                  type="button"
                  data-ocid="deposit.copy.button"
                  onClick={handleCopyUpi}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  {upiIdCopied ? (
                    <Check className="w-4 h-4 text-game-green" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Amount input */}
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
                className="bg-input border-border"
              />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[100, 500, 1000, 5000].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setDepAmount(String(p))}
                  className="py-1.5 rounded text-xs font-bold border border-border text-muted-foreground hover:border-cta hover:text-cta transition-colors"
                >
                  ₹{p}
                </button>
              ))}
            </div>

            {depAmount && Number(depAmount) >= 100 && (
              <div
                className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
                style={{
                  background: "oklch(0.84 0.16 89 / 0.10)",
                  color: "oklch(0.84 0.16 89)",
                }}
              >
                Send <span className="font-black">₹{depAmount}</span> to{" "}
                <span className="font-black">{PLATFORM_UPI}</span> via any UPI
                app, then enter your UTR / transaction ID below.
              </div>
            )}

            {/* UTR Reference */}
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
                className="bg-input border-border"
              />
            </div>

            <Button
              data-ocid="deposit.submit_button"
              onClick={handleUpiDeposit}
              disabled={depLoading}
              className="w-full bg-cta text-cta-foreground hover:bg-cta/90 font-bold"
            >
              {depLoading
                ? "Submitting..."
                : `Submit Deposit Request${depAmount ? ` ₹${depAmount}` : ""}`}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              Balance credited after admin confirms payment
            </p>
          </div>

          {/* Deposit History */}
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
                      className="flex items-center justify-between rounded-lg px-3 py-2.5"
                      style={{ background: "oklch(0.10 0 0)" }}
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

        {/* WITHDRAW TAB */}
        <TabsContent value="withdraw" className="space-y-4 mt-0">
          <div className="card-surface p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-cta" />
              <h2 className="font-black uppercase tracking-widest text-sm">
                {t("withdraw")}
              </h2>
            </div>
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                background: "oklch(0.84 0.16 89 / 0.10)",
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
                className="bg-input border-border"
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
                className="bg-input border-border"
              />
            </div>
            <Button
              data-ocid="withdraw.submit_button"
              onClick={handleWithdraw}
              className="w-full bg-cta text-cta-foreground hover:bg-cta/90 font-bold"
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
                      className="flex items-center justify-between rounded-lg px-3 py-2.5"
                      style={{ background: "oklch(0.10 0 0)" }}
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

        {/* BETS TAB */}
        <TabsContent value="bets" className="mt-0">
          <div className="card-surface p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
              {t("betHistory")}
            </h3>
            {betHistory.length === 0 ? (
              <p
                className="text-xs text-muted-foreground text-center py-6"
                data-ocid="bets.empty_state"
              >
                {t("noHistory")}
              </p>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {betHistory.map((b, i) => (
                    <div
                      key={b.id}
                      data-ocid={`bets.item.${i + 1}`}
                      className="rounded-lg px-3 py-2.5 flex items-center justify-between"
                      style={{ background: "oklch(0.10 0 0)" }}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                            style={{
                              background: "oklch(0.20 0 0)",
                              color: "oklch(0.80 0 0)",
                            }}
                          >
                            {b.mode}
                          </span>
                          <span className="text-xs font-bold">{b.target}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Period: {b.periodId.slice(-6)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {b.date}
                        </p>
                      </div>
                      <p className="text-sm font-black text-cta">
                        ₹{b.amount.toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* GUIDE TAB */}
        <TabsContent value="guide" className="mt-0">
          <div className="card-surface p-5 space-y-5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cta" />
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
                    bg: "oklch(0.60 0.18 145)",
                  },
                  {
                    nums: "2, 4, 6, 8",
                    color: "Red",
                    bg: "oklch(0.55 0.22 28)",
                  },
                  {
                    nums: "0",
                    color: "Purple + Red",
                    bg: "linear-gradient(135deg,oklch(0.48 0.22 296) 50%,oklch(0.55 0.22 28) 50%)",
                  },
                  {
                    nums: "5",
                    color: "Green + Purple",
                    bg: "linear-gradient(135deg,oklch(0.60 0.18 145) 50%,oklch(0.48 0.22 296) 50%)",
                  },
                ].map((c) => (
                  <div
                    key={c.nums}
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: "oklch(0.10 0 0)" }}
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
                    color: "oklch(0.60 0.18 145)",
                  },
                  {
                    label: "Purple",
                    value: "5×",
                    color: "oklch(0.48 0.22 296)",
                  },
                  {
                    label: "Split (0 or 5)",
                    value: "Half payout",
                    color: "oklch(0.65 0 0)",
                  },
                ].map((p) => (
                  <div
                    key={p.label}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: "oklch(0.10 0 0)" }}
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
              className="rounded-lg p-4"
              style={{
                background: "oklch(0.55 0.22 28 / 0.12)",
                border: "1px solid oklch(0.55 0.22 28 / 0.30)",
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

        {/* REFERRAL TAB */}
        <TabsContent value="referral" className="mt-0">
          <ReferralTab phone={phone} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Referral Tab Component ────────────────────────────────────────────────────
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
      {/* Header card */}
      <div className="card-surface p-5 space-y-4" data-ocid="referral.card">
        <div className="flex items-center gap-2 mb-1">
          <Gift className="w-5 h-5 text-cta" />
          <h3 className="font-black text-base uppercase tracking-wide">
            Invite Friends
          </h3>
        </div>
        <div
          className="rounded-lg p-3 text-center space-y-1"
          style={{
            background: "oklch(0.10 0 0)",
            border: "1px solid oklch(0.22 0 0)",
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
            <p className="text-2xl font-black tracking-widest text-cta">
              {referralCode || "—"}
            </p>
          )}
        </div>
        <Button
          data-ocid="referral.copy_button"
          onClick={copyCode}
          disabled={!referralCode || codeLoading}
          className="w-full font-bold"
          style={{
            background: "oklch(0.20 0 0)",
            color: "oklch(0.90 0 0)",
            border: "1px solid oklch(0.30 0 0)",
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
          className="rounded-lg p-3 space-y-1 text-sm"
          style={{
            background: "oklch(0.08 0 0)",
            border: "1px solid oklch(0.18 0 0)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-game-green font-bold">₹20</span>
            <span className="text-muted-foreground">
              — Your friend gets ₹20 bonus on signup
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-game-green font-bold">₹100</span>
            <span className="text-muted-foreground">
              — You get ₹100 when they make their first deposit
            </span>
          </div>
        </div>
      </div>

      {/* Referral history */}
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
                        <span className="text-game-green font-bold">✓ ₹20</span>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      {r.depositBonusPaid ? (
                        <span className="text-game-green font-bold">
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
