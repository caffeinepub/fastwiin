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
import {
  AlertTriangle,
  KeyRound,
  Loader2,
  Lock,
  Phone,
  RefreshCw,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
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

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 6000];

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
  const [referralCode, setReferralCode] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [otpRetries, setOtpRetries] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendingOtp, setResendingOtp] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fix: actor object is a local proxy, always available once initialized.
  // Remove !actorFetching condition -- it was keeping the button stuck on "Connecting..."

  useEffect(() => {
    if (open) {
      setStep(defaultMode === "login" && isRegistered ? "login" : "phone");
      setOtp("");
      setPassword("");
      setConfirmPassword("");
      setReferralCode("");
      setLoginPassword("");
      setOtpRetries(0);
      setOtpError(null);
      setResendingOtp(false);
    }
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [open, defaultMode, isRegistered]);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const setPasswordMutation = useSetPassword();

  // Retry OTP with delays (up to MAX_RETRIES tries)
  const sendOtpWithRetry = async (
    phoneNum: string,
    attempt = 0,
  ): Promise<void> => {
    setOtpError(null);
    try {
      const code = await requestOtp.mutateAsync(phoneNum);
      setOtpReceived(code);
      setStep("otp");
      toast.success("OTP sent!");
      setOtpRetries(0);
      setResendingOtp(false);
    } catch (err: any) {
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS[attempt];
        const retryNum = attempt + 1;
        toast.loading(`Retrying... (${retryNum}/${MAX_RETRIES})`, {
          id: "otp-retry",
        });
        setOtpRetries(retryNum);
        retryTimerRef.current = setTimeout(() => {
          sendOtpWithRetry(phoneNum, attempt + 1);
        }, delay);
      } else {
        toast.dismiss("otp-retry");
        setOtpRetries(0);
        setResendingOtp(false);
        setOtpError(
          err?.message ||
            "Could not send OTP. The server may still be waking up.",
        );
      }
    }
  };

  const handleRequestOtp = async () => {
    if (!phone.trim()) {
      toast.error("Enter a valid phone number");
      return;
    }
    setOtpError(null);
    await sendOtpWithRetry(phone.trim());
  };

  const handleResendOtp = async () => {
    if (resendingOtp || isSendingOtp) return;
    setResendingOtp(true);
    setOtp("");
    await sendOtpWithRetry(phone.trim());
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
    } catch (err: any) {
      toast.error(err?.message || "OTP verification failed");
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
      const ok = await setPasswordMutation.mutateAsync({
        password,
        referralCode: referralCode.trim() || null,
      });
      if (ok) {
        localStorage.setItem("fastwiin_logged_in", "true");
        localStorage.setItem("fastwiin_password_hash", btoa(password));
        toast.success("Welcome to Fastwiin! ₹10 credited.");
        onSuccess();
      } else {
        toast.error("Failed to set password");
      }
    } catch (err: any) {
      toast.error(err?.message || "Registration failed");
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

  const isSendingOtp = requestOtp.isPending || otpRetries > 0;

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
                    onKeyDown={(e) =>
                      e.key === "Enter" && !isSendingOtp && handleRequestOtp()
                    }
                    className="bg-input border-border"
                  />
                </div>

                {/* Retry progress indicator */}
                {otpRetries > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
                    data-ocid="auth.loading_state"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-amber-400 font-medium">
                        Retrying ({otpRetries}/{MAX_RETRIES})...
                      </p>
                      <div className="flex gap-1 mt-1">
                        <div
                          className={`h-1 flex-1 rounded-full transition-colors ${otpRetries >= 1 ? "bg-amber-400" : "bg-amber-400/20"}`}
                        />
                        <div
                          className={`h-1 flex-1 rounded-full transition-colors ${otpRetries >= 2 ? "bg-amber-400" : "bg-amber-400/20"}`}
                        />
                        <div
                          className={`h-1 flex-1 rounded-full transition-colors ${otpRetries >= 3 ? "bg-amber-400" : "bg-amber-400/20"}`}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* OTP send error card */}
                <AnimatePresence>
                  {otpError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 space-y-2.5"
                      data-ocid="auth.error_state"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-red-400">
                            Could not send OTP
                          </p>
                          <p className="text-xs text-red-300/80 mt-0.5">
                            The server may still be waking up.
                          </p>
                        </div>
                      </div>
                      <Button
                        data-ocid="auth.secondary_button"
                        size="sm"
                        onClick={() => {
                          setOtpError(null);
                          sendOtpWithRetry(phone.trim());
                        }}
                        disabled={isSendingOtp}
                        className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-semibold h-8"
                        variant="ghost"
                      >
                        <RefreshCw className="w-3 h-3 mr-1.5" />
                        Try Again
                      </Button>
                      <p className="text-[11px] text-muted-foreground text-center">
                        If this keeps failing, wait 15 seconds and try again
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  data-ocid="auth.primary_button"
                  onClick={handleRequestOtp}
                  disabled={isSendingOtp}
                  className="w-full bg-cta text-cta-foreground hover:bg-cta/90 font-bold"
                >
                  {isSendingOtp && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  {isSendingOtp ? "Sending OTP..." : "Send OTP"}
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

                {/* Resend OTP retry indicator while resending */}
                <AnimatePresence>
                  {resendingOtp && isSendingOtp && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
                      data-ocid="auth.loading_state"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                      <p className="text-xs text-amber-400">
                        {otpRetries > 0
                          ? `Retrying (${otpRetries}/${MAX_RETRIES})...`
                          : "Sending new OTP..."}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setOtpRetries(0);
                      setOtpError(null);
                      setResendingOtp(false);
                    }}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Change number
                  </button>
                  <button
                    type="button"
                    data-ocid="auth.secondary_button"
                    onClick={handleResendOtp}
                    disabled={isSendingOtp}
                    className="w-full text-center text-xs text-cta hover:text-cta/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    {isSendingOtp && resendingOtp ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Resend OTP
                  </button>
                </div>
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
                <div className="space-y-1.5">
                  <Label htmlFor="set-ref">
                    Referral Code{" "}
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="set-ref"
                    data-ocid="auth.input"
                    type="text"
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="bg-input border-border uppercase"
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
