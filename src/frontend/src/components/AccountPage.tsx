import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useAuthStatus,
  useBalance,
  useChangePassword,
} from "@/hooks/useQueries";
import {
  Check,
  Copy,
  KeyRound,
  LogOut,
  Phone,
  Shield,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Must contain uppercase";
  if (!/[0-9]/.test(pw)) return "Must contain a number";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Must contain a special character";
  return null;
}

export default function AccountPage({ onLogout }: { onLogout: () => void }) {
  const { data: authStatus } = useAuthStatus();
  const { data: balance } = useBalance();
  const { identity } = useInternetIdentity();
  const changePassword = useChangePassword();

  const [showChangePw, setShowChangePw] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 space-y-4">
      <h1 className="text-lg font-black uppercase tracking-widest mb-4">
        My Account
      </h1>

      {/* Profile card */}
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

        {/* Balance */}
        <div className="bg-secondary rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            Balance
          </span>
          <span className="text-xl font-black text-cta">
            ₹{(balance ?? 0).toLocaleString("en-IN")}
          </span>
        </div>

        {/* User ID */}
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

        {/* Phone */}
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Phone className="w-3 h-3" /> Phone Number
          </Label>
          <div className="bg-input rounded-lg px-3 py-2">
            <p className="text-sm font-mono">{authStatus?.phone || "—"}</p>
          </div>
        </div>

        {/* Password */}
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

        {/* Change password form */}
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
                  className={`px-2 py-1 rounded text-center font-medium ${
                    r.ok
                      ? "bg-game-green/20 text-game-green"
                      : "bg-muted text-muted-foreground"
                  }`}
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

      {/* Logout */}
      <button
        type="button"
        data-ocid="account.delete_button"
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 border border-destructive/50 text-destructive rounded-lg py-3 text-sm font-bold hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Logout
      </button>
    </div>
  );
}
