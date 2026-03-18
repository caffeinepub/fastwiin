import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useRequestOtp,
  useSetPassword,
  useVerifyOtp,
} from "@/hooks/useQueries";
import { KeyRound, Loader2, Lock, Phone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type AuthStep = "phone" | "otp" | "password" | "login";

interface AuthModalProps {
  open: boolean;
  defaultMode: "login" | "signup";
  isRegistered: boolean;
  registeredPhone: string;
  onSuccess: () => void;
  onClose: () => void;
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw))
    return "Password must contain at least 1 uppercase letter";
  if (!/[0-9]/.test(pw)) return "Password must contain at least 1 number";
  if (!/[^A-Za-z0-9]/.test(pw))
    return "Password must contain at least 1 special character";
  return null;
}

export default function AuthModal({
  open,
  defaultMode,
  isRegistered,
  registeredPhone,
  onSuccess,
  onClose,
}: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>(
    defaultMode === "login" && isRegistered ? "login" : "phone",
  );
  const [phone, setPhone] = useState(registeredPhone || "");
  const [otp, setOtp] = useState("");
  const [otpReceived, setOtpReceived] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    if (open) {
      setStep(defaultMode === "login" && isRegistered ? "login" : "phone");
      setOtp("");
      setPassword("");
      setConfirmPassword("");
      setLoginPassword("");
    }
  }, [open, defaultMode, isRegistered]);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const setPasswordMutation = useSetPassword();

  const handleRequestOtp = async () => {
    if (!phone.trim()) {
      toast.error("Enter a valid phone number");
      return;
    }
    try {
      const code = await requestOtp.mutateAsync(phone.trim());
      setOtpReceived(code);
      setStep("otp");
      toast.success("OTP sent!");
    } catch {
      toast.error("Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    try {
      const ok = await verifyOtp.mutateAsync(otp);
      if (ok) {
        setStep("password");
        toast.success("OTP verified!");
      } else {
        toast.error("Invalid OTP");
      }
    } catch {
      toast.error("OTP verification failed");
    }
  };

  const handleSetPassword = async () => {
    const err = validatePassword(password);
    if (err) {
      toast.error(err);
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      const ok = await setPasswordMutation.mutateAsync(password);
      if (ok) {
        localStorage.setItem("fastwiin_logged_in", "true");
        localStorage.setItem("fastwiin_password_hash", btoa(password));
        toast.success("Welcome to Fastwiin! ₹10 credited.");
        onSuccess();
      } else {
        toast.error("Failed to set password");
      }
    } catch {
      toast.error("Registration failed");
    }
  };

  const handleLogin = () => {
    const stored = localStorage.getItem("fastwiin_password_hash");
    if (stored && btoa(loginPassword) === stored) {
      localStorage.setItem("fastwiin_logged_in", "true");
      toast.success("Welcome back!");
      onSuccess();
    } else if (!stored) {
      localStorage.setItem("fastwiin_logged_in", "true");
      onSuccess();
    } else {
      toast.error("Incorrect password");
    }
  };

  const stepTitles: Record<AuthStep, string> = {
    phone: "Create Account",
    otp: "Verify OTP",
    password: "Set Password",
    login: "Welcome Back",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-card border-border max-w-sm"
        data-ocid="auth.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-center">
            <span className="text-2xl font-black">
              <span className="text-foreground">Fast</span>
              <span className="text-cta">wiin</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="pt-2">
          <h2 className="text-sm font-semibold text-muted-foreground text-center mb-5">
            {stepTitles[step]}
          </h2>
          <AnimatePresence mode="wait">
            {step === "phone" && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Phone className="w-4 h-4" />
                  <span className="text-xs">
                    We'll send a 6-digit OTP to verify
                  </span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-phone">Mobile Number</Label>
                  <Input
                    id="auth-phone"
                    data-ocid="auth.input"
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
                    className="bg-input border-border"
                  />
                </div>
                <Button
                  data-ocid="auth.primary_button"
                  onClick={handleRequestOtp}
                  disabled={requestOtp.isPending}
                  className="w-full bg-cta text-cta-foreground hover:bg-cta/90 font-bold"
                >
                  {requestOtp.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  Send OTP
                </Button>
                <button
                  type="button"
                  onClick={() => setStep("login")}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Already have an account? Login
                </button>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <KeyRound className="w-4 h-4" />
                  <span className="text-xs">OTP sent to {phone}</span>
                </div>
                {otpReceived && (
                  <div className="bg-cta/10 border border-cta/30 rounded-lg p-3 text-center">
                    <p className="text-cta text-xs mb-1">Demo OTP</p>
                    <p className="text-cta font-black text-2xl tracking-widest">
                      {otpReceived}
                    </p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="otp-input">6-digit OTP</Label>
                  <Input
                    id="otp-input"
                    data-ocid="auth.input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                    className="bg-input border-border tracking-widest text-center text-xl font-mono"
                  />
                </div>
                <Button
                  data-ocid="auth.primary_button"
                  onClick={handleVerifyOtp}
                  disabled={verifyOtp.isPending}
                  className="w-full bg-cta text-cta-foreground hover:bg-cta/90 font-bold"
                >
                  {verifyOtp.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  Verify OTP
                </Button>
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Change number
                </button>
              </motion.div>
            )}

            {step === "password" && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs">
                    8+ chars · uppercase · number · special char
                  </span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-pw">Password</Label>
                  <Input
                    id="set-pw"
                    data-ocid="auth.input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-cpw">Confirm Password</Label>
                  <Input
                    id="set-cpw"
                    data-ocid="auth.input"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  {[
                    { label: "8+", ok: password.length >= 8 },
                    { label: "A-Z", ok: /[A-Z]/.test(password) },
                    { label: "0-9", ok: /[0-9]/.test(password) },
                    { label: "!@#", ok: /[^A-Za-z0-9]/.test(password) },
                  ].map((r) => (
                    <span
                      key={r.label}
                      className={`px-2 py-1 rounded text-center font-medium transition-colors ${
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
                  data-ocid="auth.submit_button"
                  onClick={handleSetPassword}
                  disabled={setPasswordMutation.isPending}
                  className="w-full bg-cta text-cta-foreground hover:bg-cta/90 font-bold"
                >
                  {setPasswordMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  Create Account
                </Button>
              </motion.div>
            )}

            {step === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs">
                    {registeredPhone || "Enter your credentials"}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-pw">Password</Label>
                  <Input
                    id="login-pw"
                    data-ocid="auth.input"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="bg-input border-border"
                  />
                </div>
                <Button
                  data-ocid="auth.primary_button"
                  onClick={handleLogin}
                  className="w-full bg-cta text-cta-foreground hover:bg-cta/90 font-bold"
                >
                  Login
                </Button>
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  Use a different account
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
