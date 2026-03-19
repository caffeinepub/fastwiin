import AccountPage from "@/components/AccountPage";
import AdminPanel from "@/components/AdminPanel";
import AuthModal from "@/components/AuthModal";
import BottomNav, { type TabKey } from "@/components/BottomNav";
import DepositModal from "@/components/DepositModal";
import GameModePage, { getTimeLeft } from "@/components/GameModePage";
import Leaderboard from "@/components/Leaderboard";
import NotificationPanel from "@/components/NotificationPanel";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { useKeepAlive } from "@/hooks/useKeepAlive";
import { useAuthStatus, useBalance } from "@/hooks/useQueries";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Clock, Timer, Trophy, Wallet, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

export const ADMIN_PHONE = "8200321382";

const GAME_MODES = [
  {
    key: "30s" as TabKey,
    label: "Fastwiin 30sec",
    shortLabel: "30SEC",
    durationSec: 30,
    badge: "⚡",
    Icon: Zap,
    accentColor: "oklch(0.60 0.18 145)",
    borderColor: "oklch(0.60 0.18 145)",
    desc: "Fastest rounds · High intensity",
  },
  {
    key: "1min" as TabKey,
    label: "Fastwiin 1min",
    shortLabel: "1MIN",
    durationSec: 60,
    badge: "🕐",
    Icon: Clock,
    accentColor: "oklch(0.90 0 0)",
    borderColor: "oklch(0.90 0 0)",
    desc: "Balanced pace · Classic feel",
  },
  {
    key: "3min" as TabKey,
    label: "Fastwiin 3min",
    shortLabel: "3MIN",
    durationSec: 180,
    badge: "⏱",
    Icon: Timer,
    accentColor: "oklch(0.48 0.22 296)",
    borderColor: "oklch(0.48 0.22 296)",
    desc: "Strategic play · Max rewards",
  },
];

function useLiveTimer(durationSec: number) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(durationSec));
  useEffect(() => {
    const tick = () => setTimeLeft(getTimeLeft(durationSec));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [durationSec]);
  return timeLeft;
}

function LiveCountdown({ durationSec }: { durationSec: number }) {
  const timeLeft = useLiveTimer(durationSec);
  const isUrgent = timeLeft <= 5;
  const formatted =
    durationSec >= 60
      ? `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`
      : `${String(timeLeft).padStart(2, "0")}s`;

  return (
    <span
      className="font-mono font-black tabular-nums text-2xl"
      style={{
        color: isUrgent ? "oklch(0.55 0.22 28)" : "oklch(1 0 0)",
      }}
    >
      {formatted}
    </span>
  );
}

function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <button
      type="button"
      data-ocid="nav.language.toggle"
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      className="text-[10px] font-bold px-2 py-1 rounded-full border border-border hover:bg-accent transition-colors"
      style={{ color: "oklch(0.75 0 0)" }}
    >
      {lang === "en" ? "हिं" : "EN"}
    </button>
  );
}

function AppContent() {
  const [loggedIn, setLoggedIn] = useState(
    () => localStorage.getItem("fastwiin_logged_in") === "true",
  );
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useKeepAlive();

  const { data: authStatus, isLoading: authLoading } = useAuthStatus();
  const { data: balance } = useBalance();

  // Safety timeout: if backend is slow, proceed after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => setLoadingTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const isRegistered = authStatus?.registered ?? false;
  const registeredPhone = authStatus?.phone ?? "";
  // Fix: isLoggedIn depends only on local state, not backend registration status
  // This prevents users from appearing logged out when the backend is cold/slow
  const isLoggedIn = loggedIn;
  const phone = authStatus?.phone ?? "";
  const isAdmin = isLoggedIn && phone === ADMIN_PHONE;

  const openLogin = () => {
    setAuthMode("login");
    setAuthOpen(true);
  };
  const openSignup = () => {
    setAuthMode("signup");
    setAuthOpen(true);
  };
  const handleLogout = () => {
    localStorage.removeItem("fastwiin_logged_in");
    setLoggedIn(false);
    setActiveTab("home");
  };
  const handleLoginRequired = () => {
    setAuthMode("login");
    setAuthOpen(true);
  };

  // Allow GameModePage to switch modes from its tab bar
  const handleModeChange = (key: string) => {
    setActiveTab(key as TabKey);
  };

  if (authLoading && !loadingTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-cta rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading Fastwiin...</p>
        </div>
      </div>
    );
  }

  const activeModeData = GAME_MODES.find((m) => m.key === activeTab);

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <header
        className="sticky top-0 z-50 border-b border-border"
        style={{ background: "oklch(0.09 0 0 / 0.97)" }}
      >
        <div className="max-w-[1240px] mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            data-ocid="nav.home.link"
            className="flex-shrink-0"
          >
            <span className="text-xl font-black tracking-tight">
              <span className="text-foreground">Fast</span>
              <span className="text-cta">wiin</span>
            </span>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <div className="hidden sm:flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full border border-border">
                  <Wallet className="w-3.5 h-3.5 text-cta" />
                  <span className="text-sm font-bold">
                    ₹{(balance ?? 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <DepositModal />
                <NotificationPanel />
                <LanguageToggle />
              </>
            ) : (
              <>
                <Button
                  data-ocid="nav.login.button"
                  variant="outline"
                  size="sm"
                  onClick={openLogin}
                  className="border-border text-foreground hover:bg-accent"
                >
                  Login
                </Button>
                <Button
                  data-ocid="nav.signup.button"
                  size="sm"
                  onClick={openSignup}
                  className="bg-cta text-cta-foreground hover:bg-cta/90 font-bold glow-cta"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === "home" &&
            (isLoggedIn ? (
              <motion.div
                key="home-logged"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <HomeLoggedIn
                  balance={balance ?? 0}
                  onTabChange={setActiveTab}
                  phone={phone}
                />
              </motion.div>
            ) : (
              <motion.div
                key="home-landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <LandingHero onLogin={openLogin} onSignup={openSignup} />
              </motion.div>
            ))}
        </AnimatePresence>

        {activeModeData && (
          <GameModePage
            modeKey={activeModeData.key}
            label={activeModeData.label}
            durationSec={activeModeData.durationSec}
            isLoggedIn={isLoggedIn}
            balance={balance ?? 0}
            onLoginRequired={handleLoginRequired}
            allModes={GAME_MODES.map((m) => ({
              key: m.key,
              shortLabel: m.shortLabel,
              durationSec: m.durationSec,
            }))}
            onModeChange={handleModeChange}
            phone={authStatus?.phone ?? ""}
          />
        )}

        {activeTab === "admin" && isAdmin && <AdminPanel />}

        {activeTab === "account" &&
          (isLoggedIn ? (
            <AccountPage
              onLogout={handleLogout}
              phone={authStatus?.phone ?? ""}
            />
          ) : (
            <div className="max-w-lg mx-auto px-4 pt-16 text-center">
              <p className="text-muted-foreground mb-4">
                Please log in to view your account.
              </p>
              <Button
                onClick={openLogin}
                className="bg-cta text-cta-foreground hover:bg-cta/90 font-bold"
                data-ocid="account.primary_button"
              >
                Login
              </Button>
            </div>
          ))}
      </main>

      {/* BOTTOM NAV */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAdmin={isAdmin}
      />

      <AuthModal
        open={authOpen}
        defaultMode={authMode}
        isRegistered={isRegistered}
        registeredPhone={registeredPhone}
        onSuccess={() => {
          setLoggedIn(true);
          setAuthOpen(false);
        }}
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}

function HomeLoggedIn({
  balance,
  onTabChange,
  phone = "",
}: {
  balance: number;
  onTabChange: (tab: TabKey) => void;
  phone?: string;
}) {
  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-28 space-y-5">
      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card-surface p-5 flex items-center justify-between"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Your Balance
          </p>
          <p
            className="text-3xl font-black"
            style={{ color: "oklch(0.84 0.16 89)" }}
          >
            ₹{balance.toLocaleString("en-IN")}
          </p>
        </div>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: "oklch(0.84 0.16 89 / 0.12)",
            border: "1px solid oklch(0.84 0.16 89 / 0.25)",
          }}
        >
          <Trophy
            className="w-6 h-6"
            style={{ color: "oklch(0.84 0.16 89)" }}
          />
        </div>
      </motion.div>

      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">
        Choose Your Game
      </p>

      <div className="space-y-3">
        {GAME_MODES.map((m, idx) => (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
          >
            <button
              type="button"
              data-ocid={`home.${m.key}.button`}
              onClick={() => onTabChange(m.key)}
              className="w-full text-left group relative overflow-hidden"
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.2 0 0)",
                borderLeft: `4px solid ${m.borderColor}`,
                borderRadius: "12px",
              }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `${m.accentColor}08` }}
              />
              <div className="relative flex items-center gap-4 p-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${m.accentColor}18`,
                    border: `1px solid ${m.accentColor}40`,
                  }}
                >
                  <m.Icon
                    className="w-5 h-5"
                    style={{ color: m.accentColor }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-black text-base text-foreground">
                      {m.shortLabel}
                    </h3>
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{
                        background: `${m.accentColor}20`,
                        color: m.accentColor,
                      }}
                    >
                      LIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex gap-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: "oklch(0.60 0.18 145)" }}
                      />
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: "oklch(0.55 0.22 28)" }}
                      />
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: "oklch(0.48 0.22 296)" }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">
                      Bet closes at 5s
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <LiveCountdown durationSec={m.durationSec} />
                  <span
                    className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full transition-all group-hover:scale-105"
                    style={{
                      background: m.accentColor,
                      color: "oklch(0.06 0 0)",
                    }}
                  >
                    Play →
                  </span>
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      <Leaderboard phone={phone} />

      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1 pt-2">
        How to Win
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: "⚡",
            label: "30 Second Rounds",
            desc: "Ultra-fast prediction rounds",
          },
          {
            icon: "🎯",
            label: "9x Number Wins",
            desc: "Pick exact number, win 9x",
          },
          {
            icon: "🎨",
            label: "Purple 5x / Color 2x",
            desc: "Green, Red 2x · Purple 5x",
          },
          { icon: "🏆", label: "24/7 Live", desc: "All three modes running" },
        ].map((f, idx) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 + idx * 0.07 }}
            className="card-surface p-4 text-center"
          >
            <div className="text-2xl mb-1">{f.icon}</div>
            <h3 className="text-xs font-bold mb-0.5">{f.label}</h3>
            <p className="text-[10px] text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="border-t border-border pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}

function LandingHero({
  onLogin,
  onSignup,
}: { onLogin: () => void; onSignup: () => void }) {
  return (
    <div className="pb-24">
      <section className="max-w-lg mx-auto px-4 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-cta/10 border border-cta/30 text-cta text-xs px-3 py-1 rounded-full mb-6 font-medium">
            <Trophy className="w-3 h-3" /> Live 24/7 · India's #1
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-4">
            <span className="text-foreground">Fast</span>
            <span className="text-cta">wiin</span>
          </h1>
          <p className="text-base text-muted-foreground max-w-sm mx-auto mb-8">
            Color prediction games. 30-second rounds. Win up to 9× your bet.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              data-ocid="hero.signup.button"
              onClick={onSignup}
              size="lg"
              className="bg-cta text-cta-foreground hover:bg-cta/90 font-bold px-8 glow-cta"
            >
              Play Now — Free ₹10
            </Button>
            <Button
              data-ocid="hero.login.button"
              onClick={onLogin}
              size="lg"
              variant="outline"
              className="border-border text-foreground hover:bg-accent px-8"
            >
              Login
            </Button>
          </div>
        </motion.div>
      </section>

      <section className="max-w-lg mx-auto px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              icon: "⚡",
              label: "30 Second Rounds",
              desc: "Ultra-fast prediction rounds",
            },
            {
              icon: "🎯",
              label: "9x Number Wins",
              desc: "Pick exact number, win 9x",
            },
            {
              icon: "🎨",
              label: "Purple 5x / Color 2x",
              desc: "Green, Red 2x · Purple 5x",
            },
            { icon: "🏆", label: "24/7 Live", desc: "All three modes running" },
          ].map((f) => (
            <div key={f.label} className="card-surface p-4 text-center">
              <div className="text-2xl mb-1">{f.icon}</div>
              <h3 className="text-xs font-bold mb-0.5">{f.label}</h3>
              <p className="text-[10px] text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center px-4 pb-4">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <NotificationProvider>
          <AppContent />
          <Toaster richColors position="top-right" />
        </NotificationProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
