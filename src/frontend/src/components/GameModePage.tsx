import { Color } from "@/backend";
import type { BetTarget, RoundResult } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/contexts/NotificationContext";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import {
  useBalance,
  useGameState,
  useLockRound,
  usePlaceBet,
  useSettleRound,
} from "@/hooks/useQueries";
import { Clock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Color constants ──────────────────────────────────────────────────────────
const GREEN = "oklch(0.60 0.18 145)";
const RED = "oklch(0.55 0.22 28)";
const PURPLE = "oklch(0.48 0.22 296)";

// New number-to-color mapping
type NumberColor = "green" | "red" | "split_purple_red" | "split_green_purple";
const NUMBER_COLORS: Record<number, NumberColor> = {
  0: "split_purple_red",
  1: "green",
  2: "red",
  3: "green",
  4: "red",
  5: "split_green_purple",
  6: "red",
  7: "green",
  8: "red",
  9: "green",
};

function getNumberBg(n: number): string {
  const c = NUMBER_COLORS[n];
  if (c === "green") return GREEN;
  if (c === "red") return RED;
  if (c === "split_purple_red") {
    return `linear-gradient(135deg, ${PURPLE} 50%, ${RED} 50%)`;
  }
  return `linear-gradient(135deg, ${GREEN} 50%, ${PURPLE} 50%)`;
}

function getColorBg(c: Color): string {
  if (c === Color.green) return GREEN;
  if (c === Color.red) return RED;
  return PURPLE;
}

function getResultDotBg(winningNumber: number): string {
  return getNumberBg(winningNumber);
}

const COLOR_MULTIPLIER: Record<Color, number> = {
  [Color.green]: 2,
  [Color.red]: 2,
  [Color.purple]: 5,
};

export function getTimeLeft(durationSec: number): number {
  const now = new Date();
  const istOffset = 5 * 60 + 30;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + istOffset * 60000;
  const istSec = Math.floor(istMs / 1000);
  return durationSec - (istSec % durationSec);
}

function DigitTimer({
  timeLeft,
  durationSec,
}: { timeLeft: number; durationSec: number }) {
  const isUrgent = timeLeft <= 5;
  const boxStyle = {
    background: "oklch(0.08 0 0)",
    border: "1px solid oklch(0.22 0 0)",
    color: isUrgent ? RED : "oklch(0.98 0 0)",
  };

  const DigitBox = ({ value }: { value: string }) => (
    <div
      className="w-8 h-10 rounded flex items-center justify-center font-mono font-black text-xl"
      style={boxStyle}
    >
      {value}
    </div>
  );

  const ColonSep = () => (
    <span className="text-white/60 font-mono text-xl font-black mx-0.5">:</span>
  );

  if (durationSec >= 60) {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    const [m0, m1] = String(m).padStart(2, "0").split("");
    const [s0, s1] = String(s).padStart(2, "0").split("");
    return (
      <div className="flex items-center gap-1">
        <DigitBox value={m0} />
        <DigitBox value={m1} />
        <ColonSep />
        <DigitBox value={s0} />
        <DigitBox value={s1} />
      </div>
    );
  }

  const [d0, d1] = String(timeLeft).padStart(2, "0").split("");
  return (
    <div className="flex items-center gap-1">
      <DigitBox value={d0} />
      <DigitBox value={d1} />
      <span className="text-white/60 font-mono text-xl font-black mx-0.5">
        s
      </span>
    </div>
  );
}

interface ModeOption {
  key: string;
  shortLabel: string;
  durationSec: number;
}

function ModeTabBar({
  modeKey,
  allModes,
  onModeChange,
}: {
  modeKey: string;
  allModes: ModeOption[];
  onModeChange: (key: string) => void;
}) {
  return (
    <div
      className="flex"
      style={{
        background: "oklch(0.06 0 0)",
        borderBottom: "1px solid oklch(0.18 0 0)",
      }}
    >
      {allModes.map((m) => {
        const isActive = m.key === modeKey;
        return (
          <button
            key={m.key}
            type="button"
            data-ocid={`game.${m.key}.tab`}
            onClick={() => onModeChange(m.key)}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-all"
            style={{
              background: isActive ? "oklch(0.98 0 0)" : "transparent",
              color: isActive ? "oklch(0.06 0 0)" : "oklch(0.55 0 0)",
            }}
          >
            <Clock className="w-4 h-4" />
            <span className="text-[11px] font-black tracking-wider">
              {m.shortLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ResultBall({ result }: { result: RoundResult }) {
  const n = Number(result.winningNumber);
  const bg = getResultDotBg(n);
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
      style={{ background: bg, border: "1px solid oklch(0.3 0 0)" }}
    >
      {n}
    </div>
  );
}

function InfoCard({
  modeLabel,
  timeLeft,
  durationSec,
  periodId,
  results,
  balance,
}: {
  modeLabel: string;
  timeLeft: number;
  durationSec: number;
  periodId: string;
  results: RoundResult[];
  balance: number;
}) {
  const last5 = [...results].reverse().slice(0, 5);
  return (
    <div
      className="flex gap-0"
      style={{
        background: "oklch(0.10 0 0)",
        borderBottom: "1px solid oklch(0.18 0 0)",
      }}
    >
      <div
        className="flex-1 p-4 flex flex-col gap-3"
        style={{ borderRight: "1px solid oklch(0.18 0 0)" }}
      >
        <div
          className="self-start text-[10px] font-bold px-3 py-1 rounded-full"
          style={{ background: "oklch(0.18 0 0)", color: "oklch(0.65 0 0)" }}
        >
          How to play
        </div>
        <p className="text-xs font-bold text-white">{modeLabel}</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {last5.length === 0 ? (
            <span className="text-[10px] text-white/40">No results yet</span>
          ) : (
            last5.map((r, i) => (
              <ResultBall key={`${String(r.roundId)}-${i}`} result={r} />
            ))
          )}
        </div>
      </div>
      <div className="flex-1 p-4 flex flex-col items-end justify-between gap-2">
        {/* Balance */}
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-[10px]" style={{ color: "oklch(0.55 0 0)" }}>
            Balance
          </p>
          <p className="text-sm font-black text-white">
            ₹{balance.toLocaleString("en-IN")}
          </p>
        </div>
        {/* Timer */}
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-[10px]" style={{ color: "oklch(0.55 0 0)" }}>
            Time remaining
          </p>
          <DigitTimer timeLeft={timeLeft} durationSec={durationSec} />
        </div>
        {/* Period */}
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-[10px]" style={{ color: "oklch(0.45 0 0)" }}>
            Period
          </p>
          <p
            className="text-xs font-mono font-bold"
            style={{ color: "oklch(0.85 0 0)" }}
          >
            {periodId}
          </p>
        </div>
      </div>
    </div>
  );
}

function CountdownPopup({ timeLeft }: { timeLeft: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-x-0 z-[60] flex flex-col items-center justify-center"
      style={{
        top: "35%",
        height: "30%",
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(6px)",
      }}
      data-ocid="game.countdown.modal"
    >
      <p
        className="text-[11px] font-black uppercase tracking-[0.25em] mb-4"
        style={{ color: "rgba(255,200,200,0.9)" }}
      >
        BETTING CLOSES IN
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={timeLeft}
          initial={{ scale: 1.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="font-black leading-none"
          style={{ fontSize: "5rem", color: "#fff", lineHeight: 1 }}
        >
          {timeLeft}
        </motion.div>
      </AnimatePresence>
      <p
        className="mt-6 text-xs font-bold uppercase tracking-widest"
        style={{ color: "rgba(255,200,200,0.75)" }}
      >
        seconds
      </p>
    </motion.div>
  );
}

function ColorBetRow({
  bettingClosed,
  selectedColor,
  onSelectColor,
}: {
  bettingClosed: boolean;
  selectedColor: Color | null;
  onSelectColor: (c: Color) => void;
}) {
  const colors: { color: Color; label: string; mult: number; bg: string }[] = [
    { color: Color.green, label: "Green", mult: 2, bg: GREEN },
    { color: Color.purple, label: "Purple", mult: 5, bg: PURPLE },
    { color: Color.red, label: "Red", mult: 2, bg: RED },
  ];

  return (
    <div className="px-4 py-3">
      <p
        className="text-[10px] font-black uppercase tracking-widest mb-2"
        style={{ color: "oklch(0.55 0 0)" }}
      >
        Bet on Colour
      </p>
      <div className="grid grid-cols-3 gap-2">
        {colors.map(({ color, label, mult, bg }) => {
          const isSelected = selectedColor === color;
          return (
            <button
              key={color}
              type="button"
              data-ocid={`game.${color}.button`}
              onClick={() => !bettingClosed && onSelectColor(color)}
              disabled={bettingClosed}
              className="h-14 rounded-xl flex flex-col items-center justify-center font-bold transition-all"
              style={{
                background: bg,
                color: "#fff",
                border: isSelected
                  ? "2px solid rgba(255,255,255,0.85)"
                  : "2px solid transparent",
                boxShadow: isSelected ? `0 0 18px ${bg}` : "none",
                opacity: bettingClosed ? 0.4 : 1,
                transform: isSelected ? "scale(1.04)" : "scale(1)",
              }}
            >
              <span className="text-sm font-black">{label}</span>
              <span className="text-[10px] opacity-75">{mult}×</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NumberGrid({
  bettingClosed,
  selectedNumber,
  onSelectNumber,
}: {
  bettingClosed: boolean;
  selectedNumber: number | null;
  onSelectNumber: (n: number) => void;
}) {
  return (
    <div className="px-4 pb-3">
      <p
        className="text-[10px] font-black uppercase tracking-widest mb-2"
        style={{ color: "oklch(0.55 0 0)" }}
      >
        Bet on Number (9×)
      </p>
      <div className="grid grid-cols-5 gap-2">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const bg = getNumberBg(n);
          const isSelected = selectedNumber === n;
          return (
            <button
              key={n}
              type="button"
              data-ocid={`game.number.item.${n + 1}`}
              onClick={() => !bettingClosed && onSelectNumber(n)}
              disabled={bettingClosed}
              className="h-14 rounded-full flex flex-col items-center justify-center transition-all relative overflow-hidden"
              style={{
                background: bg,
                border: isSelected
                  ? "2px solid rgba(255,255,255,0.9)"
                  : "2px solid transparent",
                boxShadow: isSelected
                  ? "0 0 14px rgba(255,255,255,0.4)"
                  : "none",
                opacity: bettingClosed ? 0.4 : 1,
                transform: isSelected ? "scale(1.08)" : "scale(1)",
              }}
            >
              <span
                className="text-lg font-black text-white"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
              >
                {n}
              </span>
              <span className="text-[8px] text-white/60">9×</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BetAmountPanel({
  mode,
  bettingClosed,
  selectedColor,
  selectedNumber,
  balance,
  isLoggedIn,
  onClearSelection,
  onBetPlaced,
  onLoginRequired,
}: {
  mode: string;
  bettingClosed: boolean;
  selectedColor: Color | null;
  selectedNumber: number | null;
  balance: number;
  isLoggedIn: boolean;
  onClearSelection: () => void;
  onBetPlaced: (
    target: { color?: Color; number?: number },
    amount: number,
  ) => void;
  onLoginRequired: () => void;
}) {
  const [betAmount, setBetAmount] = useState(10);
  const [betInput, setBetInput] = useState("10");
  const placeBet = usePlaceBet();

  const hasSelection = selectedColor !== null || selectedNumber !== null;

  const handleBetInput = (v: string) => {
    setBetInput(v);
    const n = Number.parseInt(v, 10);
    if (!Number.isNaN(n)) setBetAmount(n);
  };

  const payout =
    selectedColor !== null
      ? betAmount * COLOR_MULTIPLIER[selectedColor]
      : selectedNumber !== null
        ? betAmount * 9
        : 0;

  const selectionLabel =
    selectedColor !== null
      ? `${selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1)} (${COLOR_MULTIPLIER[selectedColor]}×)`
      : selectedNumber !== null
        ? `Number ${selectedNumber} (9×)`
        : "";

  const handlePlaceBet = useCallback(async () => {
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    if (!hasSelection) {
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
      toast.error("Betting is closed for this round");
      return;
    }

    const target: BetTarget =
      selectedColor !== null
        ? { __kind__: "color" as const, color: selectedColor }
        : { __kind__: "number" as const, number: BigInt(selectedNumber!) };

    try {
      await placeBet.mutateAsync({ mode, target, amount: betAmount });
      toast.success(`Bet placed: ₹${betAmount}`);
      onBetPlaced(
        selectedColor !== null
          ? { color: selectedColor }
          : { number: selectedNumber! },
        betAmount,
      );
      onClearSelection();
    } catch {
      toast.error("Failed to place bet");
    }
  }, [
    isLoggedIn,
    hasSelection,
    betAmount,
    bettingClosed,
    mode,
    placeBet,
    balance,
    selectedColor,
    selectedNumber,
    onClearSelection,
    onBetPlaced,
    onLoginRequired,
  ]);

  if (!hasSelection) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="mx-4 rounded-2xl overflow-hidden"
      style={{
        background: "oklch(0.12 0 0)",
        border: "1px solid oklch(0.2 0 0)",
      }}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{
              background:
                selectedColor !== null
                  ? `${getColorBg(selectedColor)}22`
                  : "oklch(0.18 0 0)",
              color:
                selectedColor !== null
                  ? getColorBg(selectedColor)
                  : "oklch(0.8 0 0)",
              border: `1px solid ${
                selectedColor !== null
                  ? `${getColorBg(selectedColor)}55`
                  : "oklch(0.28 0 0)"
              }`,
            }}
          >
            {selectionLabel}
          </span>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-xs font-bold"
            style={{ color: "oklch(0.5 0 0)" }}
          >
            ✕ Clear
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[10, 50, 100, 500].map((preset) => (
            <button
              key={preset}
              type="button"
              data-ocid={`game.amount.item.${preset}`}
              onClick={() => {
                setBetAmount(preset);
                setBetInput(String(preset));
              }}
              className="py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background:
                  betAmount === preset ? "oklch(0.98 0 0)" : "oklch(0.16 0 0)",
                color:
                  betAmount === preset ? "oklch(0.06 0 0)" : "oklch(0.65 0 0)",
                border: `1px solid ${
                  betAmount === preset ? "oklch(0.98 0 0)" : "oklch(0.22 0 0)"
                }`,
              }}
            >
              ₹{preset}
            </button>
          ))}
        </div>

        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: "oklch(0.55 0 0)" }}
          >
            ₹
          </span>
          <Input
            data-ocid="game.input"
            type="number"
            min={10}
            max={10000}
            value={betInput}
            onChange={(e) => handleBetInput(e.target.value)}
            className="pl-7 font-mono"
            style={{
              background: "oklch(0.08 0 0)",
              borderColor: "oklch(0.22 0 0)",
            }}
          />
        </div>

        {betAmount >= 10 && (
          <div className="flex justify-between text-xs">
            <span style={{ color: "oklch(0.55 0 0)" }}>Potential win</span>
            <span className="font-bold" style={{ color: GREEN }}>
              ₹{payout.toLocaleString("en-IN")}
            </span>
          </div>
        )}

        <Button
          data-ocid="game.primary_button"
          onClick={handlePlaceBet}
          disabled={bettingClosed || placeBet.isPending}
          className="w-full h-11 font-black text-sm rounded-xl"
          style={{
            background: bettingClosed ? "oklch(0.22 0 0)" : "oklch(0.98 0 0)",
            color: bettingClosed ? "oklch(0.45 0 0)" : "oklch(0.06 0 0)",
          }}
        >
          {placeBet.isPending
            ? "Placing..."
            : !isLoggedIn
              ? "Login to Bet"
              : bettingClosed
                ? "🔒 Betting Closed"
                : "Confirm Bet"}
        </Button>
      </div>
    </motion.div>
  );
}

interface BetRecord {
  id: string;
  roundId: string;
  target: string;
  result: "win" | "loss" | "pending";
  amount: number;
}

function GameHistoryTable({
  results,
  betHistory,
}: {
  results: RoundResult[];
  betHistory: BetRecord[];
}) {
  const last10 = [...results].reverse().slice(0, 10);
  const last10Bets = [...betHistory].reverse().slice(0, 10);
  const [activeHistoryTab, setActiveHistoryTab] = useState<
    "history" | "chart" | "bets"
  >("history");

  const tabs: { key: "history" | "chart" | "bets"; label: string }[] = [
    { key: "history", label: "Game History" },
    { key: "chart", label: "Chart" },
    { key: "bets", label: "My Bets" },
  ];

  return (
    <div
      className="mx-4 mb-28 rounded-2xl overflow-hidden"
      style={{
        background: "oklch(0.10 0 0)",
        border: "1px solid oklch(0.18 0 0)",
      }}
    >
      <div
        className="flex"
        style={{ borderBottom: "1px solid oklch(0.18 0 0)" }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            data-ocid={`history.${t.key}.tab`}
            onClick={() => setActiveHistoryTab(t.key)}
            className="px-4 py-2.5 text-xs font-bold capitalize transition-all"
            style={{
              background:
                activeHistoryTab === t.key ? "oklch(0.98 0 0)" : "transparent",
              color:
                activeHistoryTab === t.key
                  ? "oklch(0.06 0 0)"
                  : "oklch(0.45 0 0)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeHistoryTab === "history" && (
        <div>
          <div
            className="grid grid-cols-3 px-4 py-2 text-[10px] font-black uppercase tracking-widest"
            style={{
              color: "oklch(0.45 0 0)",
              borderBottom: "1px solid oklch(0.15 0 0)",
            }}
          >
            <span>Period</span>
            <span className="text-center">Number</span>
            <span className="text-right">Color</span>
          </div>

          {last10.length === 0 ? (
            <div
              data-ocid="history.empty_state"
              className="py-8 text-center text-xs"
              style={{ color: "oklch(0.4 0 0)" }}
            >
              No results yet
            </div>
          ) : (
            last10.map((r, i) => {
              const n = Number(r.winningNumber);
              const bg = getResultDotBg(n);
              const isEvenRow = i % 2 === 0;
              return (
                <div
                  key={`${String(r.roundId)}-${i}`}
                  data-ocid={`history.item.${i + 1}`}
                  className="grid grid-cols-3 items-center px-4 py-2.5"
                  style={{
                    background: isEvenRow ? "oklch(0.08 0 0)" : "transparent",
                    borderBottom: "1px solid oklch(0.13 0 0)",
                  }}
                >
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: "oklch(0.50 0 0)" }}
                  >
                    ...{String(r.roundId).slice(-6)}
                  </span>
                  <div className="flex justify-center">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                      style={{
                        background: bg,
                        boxShadow: `0 0 6px ${
                          n === 0 || n === 5 ? "oklch(0.48 0.22 296)" : bg
                        }40`,
                      }}
                    >
                      {n}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ background: bg }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeHistoryTab === "chart" && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs" style={{ color: "oklch(0.4 0 0)" }}>
            Chart coming soon
          </p>
        </div>
      )}

      {activeHistoryTab === "bets" && (
        <div>
          <div
            className="grid grid-cols-4 px-4 py-2 text-[10px] font-black uppercase tracking-widest"
            style={{
              color: "oklch(0.45 0 0)",
              borderBottom: "1px solid oklch(0.15 0 0)",
            }}
          >
            <span>Round</span>
            <span className="text-center">Bet</span>
            <span className="text-center">Amount</span>
            <span className="text-right">Result</span>
          </div>

          {last10Bets.length === 0 ? (
            <div
              data-ocid="bets.empty_state"
              className="py-8 text-center text-xs"
              style={{ color: "oklch(0.4 0 0)" }}
            >
              No bets placed yet
            </div>
          ) : (
            last10Bets.map((b, i) => {
              const isEvenRow = i % 2 === 0;
              const resultColor =
                b.result === "win"
                  ? GREEN
                  : b.result === "loss"
                    ? RED
                    : "oklch(0.55 0 0)";
              const resultLabel =
                b.result === "win"
                  ? "Win"
                  : b.result === "loss"
                    ? "Loss"
                    : "Pending";
              return (
                <div
                  key={b.id}
                  data-ocid={`bets.item.${i + 1}`}
                  className="grid grid-cols-4 items-center px-4 py-2.5"
                  style={{
                    background: isEvenRow ? "oklch(0.08 0 0)" : "transparent",
                    borderBottom: "1px solid oklch(0.13 0 0)",
                  }}
                >
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: "oklch(0.50 0 0)" }}
                  >
                    ...{b.roundId}
                  </span>
                  <span
                    className="text-[10px] font-bold text-center truncate"
                    style={{ color: "oklch(0.75 0 0)" }}
                  >
                    {b.target}
                  </span>
                  <span
                    className="text-[10px] font-mono text-center"
                    style={{ color: "oklch(0.65 0 0)" }}
                  >
                    ₹{b.amount}
                  </span>
                  <span
                    className="text-[10px] font-black text-right"
                    style={{ color: resultColor }}
                  >
                    {resultLabel}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function ResultOverlay({
  result,
  onDismiss,
}: { result: RoundResult; onDismiss: () => void }) {
  const n = Number(result.winningNumber);
  const bg = getResultDotBg(n);

  useEffect(() => {
    const id = setTimeout(onDismiss, 3500);
    return () => clearTimeout(id);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -60 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      data-ocid="game.result_card"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-4 px-4"
      style={{
        background: "oklch(0.06 0 0 / 0.95)",
        borderBottom: "2px solid oklch(0.22 0 0)",
      }}
    >
      <div className="flex items-center gap-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black text-white border-2 border-white/20 flex-shrink-0"
          style={{
            background: bg,
            boxShadow: `0 0 28px ${n === 0 || n === 5 ? PURPLE : bg}`,
          }}
        >
          {n}
        </div>
        <div>
          <p
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: "oklch(0.5 0 0)" }}
          >
            RESULT
          </p>
          <p className="text-2xl font-black text-white">
            Number{" "}
            <span
              style={{
                color:
                  n === 0 || n === 5
                    ? PURPLE
                    : NUMBER_COLORS[n] === "green"
                      ? GREEN
                      : RED,
              }}
            >
              {n}
            </span>
          </p>
          <p className="text-xs capitalize" style={{ color: "oklch(0.6 0 0)" }}>
            Round #{String(result.roundId).slice(-6)}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-4 text-lg font-bold"
          style={{ color: "oklch(0.4 0 0)" }}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}

export default function GameModePage({
  modeKey,
  label,
  durationSec,
  isLoggedIn,
  balance,
  onLoginRequired,
  allModes,
  onModeChange,
  phone = "",
}: {
  modeKey: string;
  label: string;
  durationSec: number;
  isLoggedIn: boolean;
  balance: number;
  onLoginRequired: () => void;
  allModes: ModeOption[];
  onModeChange: (key: string) => void;
  phone?: string;
}) {
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [betHistory, setBetHistory] = useState<BetRecord[]>([]);
  const betHistoryRef = useRef<BetRecord[]>([]);
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(durationSec));
  const [bettingClosed, setBettingClosed] = useState(false);
  const [showResult, setShowResult] = useState<RoundResult | null>(null);
  const hasLockedRef = useRef(false);
  const hasSettledRef = useRef(false);
  const prevTimeRef = useRef(timeLeft);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const { data: gameState, refetch: refetchGameState } = useGameState(modeKey);
  const { addBet } = useLocalHistory(phone);
  const { refetch: refetchBalance } = useBalance();
  const lockRound = useLockRound();
  const settleRound = useSettleRound();
  const { addNotification } = useNotifications();

  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.08);
    } catch {
      // AudioContext may be unavailable in some environments; silently ignore
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: modeKey triggers reset intentionally
  useEffect(() => {
    hasLockedRef.current = false;
    hasSettledRef.current = false;
    setBettingClosed(false);
    setSelectedColor(null);
    setSelectedNumber(null);
  }, [modeKey]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: stable mutation refs/fns excluded intentionally
  useEffect(() => {
    const tick = () => {
      const t = getTimeLeft(durationSec);
      setTimeLeft(t);
      if (t <= 5 && t > 0) {
        setBettingClosed(true);
        // Play beep on each new countdown second
        if (t !== prevTimeRef.current && t >= 1 && t <= 5) {
          playBeep();
        }
        if (!hasLockedRef.current) {
          hasLockedRef.current = true;
          lockRound.mutate(modeKey);
        }
      } else if (t === durationSec) {
        setBettingClosed(false);
        hasLockedRef.current = false;
        hasSettledRef.current = false;
        setSelectedColor(null);
        setSelectedNumber(null);
      }
      if (prevTimeRef.current <= 1 && t > 5 && !hasSettledRef.current) {
        hasSettledRef.current = true;
        settleRound.mutate(modeKey, {
          onSuccess: (result) => {
            setShowResult(result);
            refetchBalance();
            refetchGameState();
            addNotification(
              `Round #${String(result.roundId).slice(-4)} result: ${Number(result.winningNumber)} (${result.winningColor})`,
              "result",
            );
            toast.info(
              `${modeKey} • #${String(result.roundId).slice(-4)} • Number ${Number(result.winningNumber)} · ${result.winningColor}`,
              { duration: 4000 },
            );
            const lastBet =
              betHistoryRef.current[betHistoryRef.current.length - 1];
            if (lastBet && lastBet.result === "pending") {
              const isColorBet = lastBet.target.startsWith("Color");
              const won = isColorBet
                ? result.winningColor.toLowerCase() ===
                  lastBet.target.split(" ")[1].toLowerCase()
                : Number(lastBet.target.slice(1)) ===
                  Number(result.winningNumber);
              let payout = lastBet.amount;
              if (won) {
                if (isColorBet) {
                  const isPurple =
                    lastBet.target.split(" ")[1].toLowerCase() === "purple";
                  payout = isPurple ? lastBet.amount * 5 : lastBet.amount * 2;
                } else {
                  payout = lastBet.amount * 9;
                }
              }
              setBetHistory((prev) => {
                const updated = prev.map((b, idx) =>
                  idx === prev.length - 1
                    ? {
                        ...b,
                        result: (won ? "win" : "loss") as "win" | "loss",
                        amount: won ? payout : lastBet.amount,
                      }
                    : b,
                );
                betHistoryRef.current = updated;
                return updated;
              });
              if (won) {
                toast.success(`🎉 You won ₹${payout}!`);
                addNotification(`You won ₹${payout}! 🎉`, "win");
              } else {
                toast.error(`Better luck next time – ₹${lastBet.amount} lost`);
                addNotification(
                  `Better luck next time - ₹${lastBet.amount} lost`,
                  "loss",
                );
              }
            }
          },
          onError: () => {
            refetchGameState();
          },
        });
      }
      prevTimeRef.current = t;
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
    // biome-ignore lint/correctness/useExhaustiveDependencies: addNotification stable context ref, refs excluded
  }, [durationSec, modeKey, playBeep]);

  const handleBetPlaced = useCallback(
    (target: { color?: Color; number?: number }, amount: number) => {
      const targetLabel =
        target.color !== undefined
          ? `Color ${target.color.charAt(0).toUpperCase() + target.color.slice(1)}`
          : `#${target.number}`;
      const roundId = gameState?.currentRound?.roundId
        ? String(gameState.currentRound.roundId).slice(-4)
        : "----";
      const fullPeriodId = gameState?.currentRound?.roundId
        ? String(gameState.currentRound.roundId)
        : "--";
      setBetHistory((prev) => {
        const updated = [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            roundId,
            target: targetLabel,
            result: "pending" as const,
            amount,
          },
        ];
        betHistoryRef.current = updated;
        return updated;
      });
      addBet(modeKey, amount, targetLabel, fullPeriodId);
      addNotification(`Bet placed: ₹${amount} on ${targetLabel}`, "info");
    },
    [gameState, addNotification, addBet, modeKey],
  );

  const results = gameState?.lastResults ?? [];
  const periodId = gameState?.currentRound?.roundId
    ? String(gameState.currentRound.roundId)
    : "------------------";

  const handleClearSelection = () => {
    setSelectedColor(null);
    setSelectedNumber(null);
  };

  const handleSelectColor = (c: Color) => {
    setSelectedColor(c);
    setSelectedNumber(null);
  };

  const handleSelectNumber = (n: number) => {
    setSelectedNumber(n);
    setSelectedColor(null);
  };

  return (
    <div>
      <AnimatePresence>
        {showResult && (
          <ResultOverlay
            result={showResult}
            onDismiss={() => setShowResult(null)}
          />
        )}
      </AnimatePresence>

      {/* Last 5-second countdown popup */}
      <AnimatePresence>
        {bettingClosed && timeLeft <= 5 && timeLeft > 0 && (
          <CountdownPopup timeLeft={timeLeft} />
        )}
      </AnimatePresence>

      <ModeTabBar
        modeKey={modeKey}
        allModes={allModes}
        onModeChange={onModeChange}
      />

      <InfoCard
        modeLabel={label}
        timeLeft={timeLeft}
        durationSec={durationSec}
        periodId={periodId}
        results={results}
        balance={balance}
      />

      {bettingClosed && (
        <div
          className="text-center py-2 text-xs font-black uppercase tracking-widest animate-pulse"
          style={{
            background: `${RED}22`,
            color: RED,
            borderBottom: `1px solid ${RED}44`,
          }}
        >
          🔒 Betting Locked — Round Ending
        </div>
      )}

      <ColorBetRow
        bettingClosed={bettingClosed}
        selectedColor={selectedColor}
        onSelectColor={handleSelectColor}
      />

      <NumberGrid
        bettingClosed={bettingClosed}
        selectedNumber={selectedNumber}
        onSelectNumber={handleSelectNumber}
      />

      <AnimatePresence>
        {(selectedColor !== null || selectedNumber !== null) && (
          <BetAmountPanel
            mode={modeKey}
            bettingClosed={bettingClosed}
            selectedColor={selectedColor}
            selectedNumber={selectedNumber}
            balance={balance}
            isLoggedIn={isLoggedIn}
            onClearSelection={handleClearSelection}
            onBetPlaced={handleBetPlaced}
            onLoginRequired={onLoginRequired}
          />
        )}
      </AnimatePresence>

      <div
        className="mx-4 my-4"
        style={{ height: "1px", background: "oklch(0.18 0 0)" }}
      />

      <GameHistoryTable results={results} betHistory={betHistory} />
    </div>
  );
}
