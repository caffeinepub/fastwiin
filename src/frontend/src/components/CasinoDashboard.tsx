import { Color } from "@/backend";
import type { RoundResult } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBalance,
  useGameState,
  useLockRound,
  usePlaceBet,
  useSettleRound,
} from "@/hooks/useQueries";
import { TrendingUp, Users, Wallet } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const MODES = [
  { key: "30s", label: "30S GAME", durationSec: 30 },
  { key: "1min", label: "1MIN GAME", durationSec: 60 },
  { key: "3min", label: "3MIN GAME", durationSec: 180 },
];

const NUMBER_COLORS: Record<number, Color> = {
  0: Color.purple,
  1: Color.red,
  2: Color.green,
  3: Color.red,
  4: Color.green,
  5: Color.purple,
  6: Color.green,
  7: Color.red,
  8: Color.green,
  9: Color.red,
};

const COLOR_STYLE: Record<Color, { bg: string; text: string; border: string }> =
  {
    [Color.green]: {
      bg: "oklch(0.60 0.18 145)",
      text: "#fff",
      border: "oklch(0.60 0.18 145 / 0.5)",
    },
    [Color.red]: {
      bg: "oklch(0.55 0.22 28)",
      text: "#fff",
      border: "oklch(0.55 0.22 28 / 0.5)",
    },
    [Color.purple]: {
      bg: "oklch(0.48 0.22 296)",
      text: "#fff",
      border: "oklch(0.48 0.22 296 / 0.5)",
    },
  };

const COLOR_LABEL: Record<Color, string> = {
  [Color.green]: "Green",
  [Color.red]: "Red",
  [Color.purple]: "Purple",
};

function getTimeUntilNextRound(durationSec: number): number {
  const now = new Date();
  const istOffset = 5 * 60 + 30;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + istOffset * 60000;
  const istSec = Math.floor(istMs / 1000);
  return durationSec - (istSec % durationSec);
}

function formatTimer(sec: number, durationSec: number): string {
  if (durationSec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(sec).padStart(2, "0")}s`;
}

// ─── Mode Card ─────────────────────────────────────────────────────────────
function ModeCard({
  mode,
  label,
  durationSec,
  isActive,
  onSelect,
}: {
  mode: string;
  label: string;
  durationSec: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(() =>
    getTimeUntilNextRound(durationSec),
  );
  const isUrgent = timeLeft <= 5;

  useEffect(() => {
    const id = setInterval(
      () => setTimeLeft(getTimeUntilNextRound(durationSec)),
      500,
    );
    return () => clearInterval(id);
  }, [durationSec]);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      data-ocid={`game.${mode}.card`}
      className={`card-surface p-4 cursor-pointer transition-all select-none ${
        isActive ? "border-cta/60 ring-1 ring-cta/40" : "hover:border-border/80"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className={`text-xs font-black uppercase tracking-widest ${
            isActive ? "text-cta" : "text-muted-foreground"
          }`}
        >
          {label}
        </h3>
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 border-game-green/50 text-game-green bg-game-green/10"
        >
          Active
        </Badge>
      </div>
      <div
        className={`font-mono text-3xl font-black tabular-nums mb-3 ${
          isUrgent ? "text-game-red animate-countdown-flash" : "text-foreground"
        }`}
      >
        {formatTimer(timeLeft, durationSec)}
      </div>
      <Button
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        data-ocid={`game.${mode}.button`}
        className={`w-full text-xs font-bold ${
          isActive
            ? "bg-cta text-cta-foreground hover:bg-cta/90"
            : "bg-secondary text-foreground hover:bg-accent border border-border"
        }`}
      >
        {isActive ? "▶ Playing" : "Entry"}
      </Button>
    </motion.div>
  );
}

// ─── Prediction Grid ────────────────────────────────────────────────────────
function PredictionGrid({
  bettingClosed,
  selectedTarget,
  onSelectNumber,
  onSelectColor,
}: {
  bettingClosed: boolean;
  selectedTarget: { color?: Color; number?: number } | null;
  onSelectNumber: (n: number) => void;
  onSelectColor: (c: Color) => void;
}) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Prediction Grid
        </h3>
        {bettingClosed && (
          <span className="text-[10px] font-bold text-game-red bg-game-red/10 border border-game-red/30 px-2 py-0.5 rounded-full animate-pulse">
            LOCKED
          </span>
        )}
      </div>

      {/* Number tiles */}
      <div className="grid grid-cols-5 gap-2 mb-4" data-ocid="game.panel">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const c = NUMBER_COLORS[n];
          const style = COLOR_STYLE[c];
          const isSelected = selectedTarget?.number === n;
          return (
            <button
              type="button"
              key={n}
              data-ocid={`game.item.${n + 1}`}
              onClick={() => !bettingClosed && onSelectNumber(n)}
              disabled={bettingClosed}
              className={`h-14 rounded-lg font-black text-2xl transition-all border-2 relative overflow-hidden ${
                isSelected ? "scale-105 shadow-lg" : "hover:scale-102"
              } ${bettingClosed ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              style={{
                background: style.bg,
                color: style.text,
                borderColor: isSelected ? "#fff" : "transparent",
                boxShadow: isSelected ? `0 0 16px ${style.bg}` : "none",
              }}
            >
              {n}
              <span className="absolute bottom-0.5 right-1 text-[8px] opacity-60">
                9x
              </span>
            </button>
          );
        })}
      </div>

      {/* Color buttons */}
      <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-widest">
        Bet on Color (2×)
      </p>
      <div className="grid grid-cols-3 gap-2">
        {([Color.green, Color.red, Color.purple] as Color[]).map((c) => {
          const style = COLOR_STYLE[c];
          const isSelected = selectedTarget?.color === c;
          return (
            <button
              type="button"
              key={c}
              data-ocid={`game.${c}.button`}
              onClick={() => !bettingClosed && onSelectColor(c)}
              disabled={bettingClosed}
              className={`h-12 rounded-lg font-bold text-sm transition-all border-2 ${
                isSelected ? "scale-105" : ""
              } ${bettingClosed ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              style={{
                background: isSelected ? style.bg : `${style.bg}33`,
                color: isSelected ? style.text : style.bg,
                borderColor: isSelected ? "rgba(255,255,255,0.5)" : style.bg,
                boxShadow: isSelected ? `0 0 14px ${style.bg}` : "none",
              }}
            >
              {COLOR_LABEL[c]}
              <span className="block text-[10px] font-normal opacity-70">
                2×
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
interface BetRecord {
  roundId: string;
  bet: string;
  outcome: string;
  result: "win" | "loss" | "pending";
  amount: number;
}

const MOCK_WINNERS = [
  { name: "Arjun S.", amount: 4500, color: Color.green },
  { name: "Priya K.", amount: 9000, color: Color.purple },
  { name: "Rahul M.", amount: 2200, color: Color.red },
  { name: "Sunita D.", amount: 1800, color: Color.green },
  { name: "Vikram P.", amount: 6300, color: Color.red },
];

function Sidebar({
  balance,
  betHistory,
  results,
}: {
  balance: number;
  betHistory: BetRecord[];
  results: RoundResult[];
}) {
  return (
    <div className="space-y-4">
      {/* Balance */}
      <div className="card-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-4 h-4 text-cta" />
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            User Dashboard
          </h3>
        </div>
        <div className="text-center">
          <p className="text-3xl font-black text-foreground">
            ₹{balance.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Account Balance</p>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4 text-center">
          <div className="bg-secondary rounded-lg p-2">
            <p className="text-xs text-game-green font-bold">Win Rate</p>
            <p className="text-sm font-black">--</p>
          </div>
          <div className="bg-secondary rounded-lg p-2">
            <p className="text-xs text-muted-foreground font-bold">
              Total Bets
            </p>
            <p className="text-sm font-black">{betHistory.length}</p>
          </div>
        </div>
      </div>

      {/* Recent Winners */}
      <div className="card-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-cta" />
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Recent Winners
          </h3>
        </div>
        <div className="space-y-2">
          {MOCK_WINNERS.map((w, i) => (
            <div
              key={w.name}
              data-ocid={`winners.item.${i + 1}`}
              className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{
                    background: COLOR_STYLE[w.color].bg,
                    color: COLOR_STYLE[w.color].text,
                  }}
                >
                  {w.name[0]}
                </div>
                <span className="text-xs font-medium">{w.name}</span>
              </div>
              <span className="text-xs font-bold text-game-green">
                +₹{w.amount.toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Game History */}
      <div className="card-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-cta" />
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Your Game History
          </h3>
        </div>
        {betHistory.length === 0 ? (
          <div data-ocid="history.empty_state" className="text-center py-6">
            <p className="text-xs text-muted-foreground">
              No bets yet. Place your first bet!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-48">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-[10px] text-muted-foreground h-7">
                    Round
                  </TableHead>
                  <TableHead className="text-[10px] text-muted-foreground h-7">
                    Bet
                  </TableHead>
                  <TableHead className="text-[10px] text-muted-foreground h-7">
                    Result
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {betHistory.slice(0, 20).map((b, i) => (
                  <TableRow
                    key={`${b.roundId}-${i}`}
                    data-ocid={`history.item.${i + 1}`}
                    className="border-border/30"
                  >
                    <TableCell className="text-[10px] py-1.5 font-mono text-muted-foreground">
                      {b.roundId}
                    </TableCell>
                    <TableCell className="text-[10px] py-1.5">
                      {b.bet}
                    </TableCell>
                    <TableCell
                      className={`text-[10px] py-1.5 font-bold ${
                        b.result === "win"
                          ? "text-game-green"
                          : b.result === "loss"
                            ? "text-game-red"
                            : "text-muted-foreground"
                      }`}
                    >
                      {b.result === "win"
                        ? `+₹${b.amount}`
                        : b.result === "loss"
                          ? `-₹${b.amount}`
                          : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {/* Recent Results */}
      {results.length > 0 && (
        <div className="card-surface p-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
            Recent Results
          </h3>
          <div className="flex flex-wrap gap-2">
            {[...results]
              .reverse()
              .slice(0, 10)
              .map((r, i) => (
                <div
                  key={String(r.roundId)}
                  data-ocid={`results.item.${i + 1}`}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white border-2 border-transparent"
                  style={{ background: COLOR_STYLE[r.winningColor].bg }}
                >
                  {Number(r.winningNumber)}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Info Strip ─────────────────────────────────────────────────────────────
function InfoStrip() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
      <div className="card-surface p-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-cta mb-3">
          Top Games
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Color Prediction is our most popular game with over 10,000 active
          players daily, running 24/7.
        </p>
      </div>
      <div className="card-surface p-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-cta mb-3">
          How To Play
        </h4>
        <ol className="text-xs text-muted-foreground space-y-1.5">
          <li className="flex gap-2">
            <span className="text-cta font-bold">1.</span>Select a mode
            (30s/1min/3min)
          </li>
          <li className="flex gap-2">
            <span className="text-cta font-bold">2.</span>Pick a number (9x) or
            color (2x)
          </li>
          <li className="flex gap-2">
            <span className="text-cta font-bold">3.</span>Enter bet amount (min
            ₹10)
          </li>
          <li className="flex gap-2">
            <span className="text-cta font-bold">4.</span>Confirm before round
            locks
          </li>
        </ol>
      </div>
      <div className="card-surface p-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-cta mb-3">
          Leaderboard
        </h4>
        <div className="space-y-1.5">
          {[
            { name: "Rohit J.", wins: 142 },
            { name: "Meera S.", wins: 128 },
            { name: "Kiran P.", wins: 115 },
            { name: "Deepak R.", wins: 98 },
          ].map((p, i) => (
            <div
              key={p.name}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-muted-foreground">
                <span className="text-cta font-bold mr-1.5">{i + 1}.</span>
                {p.name}
              </span>
              <span className="text-game-green font-bold">{p.wins}w</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card-surface p-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-cta mb-3">
          Latest News
        </h4>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="leading-relaxed">
            🎉 New VIP tier unlocked — earn 3x rewards on every win.
          </p>
          <p className="leading-relaxed">
            🚀 30-second mode now running non-stop 24/7.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function CasinoDashboard({ balance }: { balance: number }) {
  const [activeMode, setActiveMode] = useState("30s");
  const [selectedTarget, setSelectedTarget] = useState<{
    color?: Color;
    number?: number;
  } | null>(null);
  const [betHistory, setBetHistory] = useState<BetRecord[]>([]);

  const activeModeData = MODES.find((m) => m.key === activeMode)!;
  const { data: gameState } = useGameState(activeMode);
  const lockRound = useLockRound();
  const settleRound = useSettleRound();
  const { refetch: refetchBalance } = useBalance();

  const [timeLeft, setTimeLeft] = useState(() =>
    getTimeUntilNextRound(activeModeData.durationSec),
  );
  const [bettingClosed, setBettingClosed] = useState(false);
  const [showResult, setShowResult] = useState<RoundResult | null>(null);
  const hasLockedRef = useRef(false);
  const hasSettledRef = useRef(false);
  const prevTimeRef = useRef(timeLeft);

  // Reset refs when mode changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on mode change
  useEffect(() => {
    hasLockedRef.current = false;
    hasSettledRef.current = false;
    setBettingClosed(false);
    setSelectedTarget(null);
  }, [activeMode]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: timer effect with stable mutate fns
  useEffect(() => {
    const tick = () => {
      const t = getTimeUntilNextRound(activeModeData.durationSec);
      setTimeLeft(t);

      if (t <= 5 && t > 0) {
        setBettingClosed(true);
        if (!hasLockedRef.current) {
          hasLockedRef.current = true;
          lockRound.mutate(activeMode);
        }
      } else if (t === activeModeData.durationSec) {
        setBettingClosed(false);
        hasLockedRef.current = false;
        hasSettledRef.current = false;
        setSelectedTarget(null);
      }

      if (prevTimeRef.current <= 1 && t > 5 && !hasSettledRef.current) {
        hasSettledRef.current = true;
        settleRound.mutate(activeMode, {
          onSuccess: (result) => {
            setShowResult(result);
            refetchBalance();
            // Check if user won
            const lastBet = betHistory[betHistory.length - 1];
            if (lastBet && lastBet.result === "pending") {
              const won =
                (lastBet.bet.startsWith("Color") &&
                  result.winningColor.toLowerCase() ===
                    lastBet.bet.split(" ")[1].toLowerCase()) ||
                (lastBet.bet.startsWith("#") &&
                  Number(lastBet.bet.slice(1)) ===
                    Number(result.winningNumber));
              const payout = won
                ? lastBet.bet.startsWith("Color")
                  ? lastBet.amount * 2
                  : lastBet.amount * 9
                : lastBet.amount;
              setBetHistory((prev) =>
                prev.map((b, idx) =>
                  idx === prev.length - 1
                    ? {
                        ...b,
                        outcome: `${Number(result.winningNumber)} (${result.winningColor})`,
                        result: won ? "win" : "loss",
                        amount: payout,
                      }
                    : b,
                ),
              );
              if (won) toast.success(`🎉 You won ₹${payout}!`);
              else toast.error(`Round ended. You lost ₹${lastBet.amount}.`);
            }
            setTimeout(() => setShowResult(null), 4000);
          },
        });
      }
      prevTimeRef.current = t;
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [
    activeModeData.durationSec,
    lockRound.mutate,
    settleRound.mutate,
    betHistory,
    refetchBalance,
  ]);

  const handleBetPlaced = useCallback(
    (target: { color?: Color; number?: number }, amount: number) => {
      const betLabel =
        target.color !== undefined
          ? `Color ${COLOR_LABEL[target.color]}`
          : `#${target.number}`;
      const roundId = gameState?.currentRound?.roundId
        ? String(gameState.currentRound.roundId).slice(-4)
        : "----";
      setBetHistory((prev) => [
        ...prev,
        { roundId, bet: betLabel, outcome: "--", result: "pending", amount },
      ]);
    },
    [gameState],
  );

  return (
    <div className="max-w-[1240px] mx-auto px-4 py-6">
      {/* Mode cards row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {MODES.map((m) => (
          <ModeCard
            key={m.key}
            mode={m.key}
            label={m.label}
            durationSec={m.durationSec}
            isActive={activeMode === m.key}
            onSelect={() => setActiveMode(m.key)}
          />
        ))}
      </div>

      {/* Result overlay */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            data-ocid="game.result_card"
            className="mb-4 card-surface-elevated p-4 flex items-center gap-4"
            style={{ borderColor: COLOR_STYLE[showResult.winningColor].bg }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white flex-shrink-0 animate-win-flash"
              style={{ background: COLOR_STYLE[showResult.winningColor].bg }}
            >
              {Number(showResult.winningNumber)}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Round Result</p>
              <p className="text-lg font-black">
                Number{" "}
                <span
                  style={{ color: COLOR_STYLE[showResult.winningColor].bg }}
                >
                  {Number(showResult.winningNumber)}
                </span>{" "}
                Wins!
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                Color: {showResult.winningColor}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: Grid + Bet panel */}
        <div className="space-y-4">
          <PredictionGrid
            bettingClosed={bettingClosed}
            selectedTarget={selectedTarget}
            onSelectNumber={(n) => setSelectedTarget({ number: n })}
            onSelectColor={(c) => setSelectedTarget({ color: c })}
          />
          <BetPanelWithTracking
            mode={activeMode}
            bettingClosed={bettingClosed}
            selectedTarget={selectedTarget}
            balance={balance}
            onClearSelection={() => setSelectedTarget(null)}
            onBetPlaced={handleBetPlaced}
          />
        </div>

        {/* Right: Sidebar */}
        <Sidebar
          balance={balance}
          betHistory={betHistory}
          results={gameState?.lastResults ?? []}
        />
      </div>

      <InfoStrip />
    </div>
  );
}

// Wrapper to intercept bet placement for history tracking
function BetPanelWithTracking({
  mode,
  bettingClosed,
  selectedTarget,
  balance,
  onClearSelection,
  onBetPlaced,
}: {
  mode: string;
  bettingClosed: boolean;
  selectedTarget: { color?: Color; number?: number } | null;
  balance: number;
  onClearSelection: () => void;
  onBetPlaced: (
    target: { color?: Color; number?: number },
    amount: number,
  ) => void;
}) {
  const [betAmount, setBetAmount] = useState(10);
  const [betInput, setBetInput] = useState("10");
  const placeBet = usePlaceBet();

  const handleBetInput = (v: string) => {
    setBetInput(v);
    const n = Number.parseInt(v, 10);
    if (!Number.isNaN(n)) setBetAmount(n);
  };

  const handlePlaceBet = useCallback(async () => {
    if (!selectedTarget) {
      toast.error("Select a number or color first");
      return;
    }
    if (betAmount < 10) {
      toast.error("Minimum bet is ₹10");
      return;
    }
    if (betAmount > 10000) {
      toast.error("Maximum bet is ₹10,000");
      return;
    }
    if (betAmount > balance) {
      toast.error("Insufficient balance");
      return;
    }
    if (bettingClosed) {
      toast.error("Betting is closed");
      return;
    }

    const target =
      selectedTarget.color !== undefined
        ? { color: selectedTarget.color }
        : { number: BigInt(selectedTarget.number!) };

    try {
      await placeBet.mutateAsync({ mode, target, amount: betAmount });
      toast.success(`Bet placed: ₹${betAmount}`);
      onBetPlaced(selectedTarget, betAmount);
      onClearSelection();
    } catch {
      toast.error("Failed to place bet");
    }
  }, [
    selectedTarget,
    betAmount,
    bettingClosed,
    mode,
    placeBet,
    balance,
    onClearSelection,
    onBetPlaced,
  ]);

  const modeLabel = MODES.find((m) => m.key === mode)?.label ?? mode;
  const payout =
    selectedTarget?.color !== undefined ? betAmount * 2 : betAmount * 9;

  return (
    <div className="card-surface p-5 space-y-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
        Bet Placement · <span className="text-cta">{modeLabel}</span>
      </h3>

      <AnimatePresence>
        {selectedTarget && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-accent/50 border border-border rounded-lg px-3 py-2.5 flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground text-xs">Selected:</span>
            <span
              className="font-bold"
              style={{
                color:
                  selectedTarget.color !== undefined
                    ? COLOR_STYLE[selectedTarget.color].bg
                    : COLOR_STYLE[NUMBER_COLORS[selectedTarget.number!]].bg,
              }}
            >
              {selectedTarget.color !== undefined
                ? `${COLOR_LABEL[selectedTarget.color]} (2×)`
                : `Number ${selectedTarget.number} (9×)`}
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              className="text-muted-foreground hover:text-foreground text-xs ml-2"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Amount
        </p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
            ₹
          </span>
          <Input
            data-ocid="game.input"
            type="number"
            min={10}
            max={10000}
            value={betInput}
            onChange={(e) => handleBetInput(e.target.value)}
            className="pl-7 bg-input border-border font-mono"
          />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[10, 50, 100, 500].map((preset) => (
            <button
              type="button"
              key={preset}
              data-ocid={`game.item.${preset}`}
              onClick={() => {
                setBetAmount(preset);
                setBetInput(String(preset));
              }}
              className={`py-1.5 rounded text-xs font-bold border transition-colors ${
                betAmount === preset
                  ? "border-cta text-cta bg-cta/10"
                  : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent"
              }`}
            >
              ₹{preset}
            </button>
          ))}
        </div>
      </div>

      {selectedTarget && betAmount >= 10 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Potential win</span>
          <span className="font-bold text-game-green">
            ₹{payout.toLocaleString("en-IN")}
          </span>
        </div>
      )}

      <Button
        data-ocid="game.primary_button"
        onClick={handlePlaceBet}
        disabled={
          !selectedTarget ||
          bettingClosed ||
          placeBet.isPending ||
          betAmount < 10 ||
          betAmount > balance
        }
        className="w-full bg-cta text-cta-foreground hover:bg-cta/90 disabled:opacity-30 h-11 font-black text-sm"
      >
        {placeBet.isPending
          ? "Placing..."
          : bettingClosed
            ? "🔒 Betting Closed"
            : "Confirm Bet"}
      </Button>
    </div>
  );
}
