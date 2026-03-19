import { Medal, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

interface LeaderboardEntry {
  rank: number;
  phone: string;
  totalWinnings: number;
  totalBets: number;
  biggestWin: number;
  isCurrentUser?: boolean;
}

type RankTab = "winnings" | "bets" | "biggest";
type TimeFilter = "all" | "today";

const SIMULATED_PLAYERS = [
  {
    phone: "98****1234",
    totalWinnings: 142500,
    totalBets: 98000,
    biggestWin: 45000,
  },
  {
    phone: "91****5678",
    totalWinnings: 128000,
    totalBets: 87500,
    biggestWin: 38000,
  },
  {
    phone: "74****9012",
    totalWinnings: 115300,
    totalBets: 79200,
    biggestWin: 32000,
  },
  {
    phone: "88****3456",
    totalWinnings: 98700,
    totalBets: 67800,
    biggestWin: 28500,
  },
  {
    phone: "70****7890",
    totalWinnings: 87200,
    totalBets: 59400,
    biggestWin: 24000,
  },
  {
    phone: "93****2345",
    totalWinnings: 74600,
    totalBets: 52100,
    biggestWin: 21000,
  },
  {
    phone: "76****6789",
    totalWinnings: 62100,
    totalBets: 44500,
    biggestWin: 18500,
  },
  {
    phone: "85****0123",
    totalWinnings: 53400,
    totalBets: 38200,
    biggestWin: 15000,
  },
  {
    phone: "99****4567",
    totalWinnings: 44800,
    totalBets: 32600,
    biggestWin: 12000,
  },
];

const SIMULATED_TODAY = [
  {
    phone: "98****1234",
    totalWinnings: 8500,
    totalBets: 5800,
    biggestWin: 4500,
  },
  {
    phone: "76****6789",
    totalWinnings: 7200,
    totalBets: 4900,
    biggestWin: 3800,
  },
  {
    phone: "91****5678",
    totalWinnings: 6100,
    totalBets: 4200,
    biggestWin: 3200,
  },
  {
    phone: "85****0123",
    totalWinnings: 5400,
    totalBets: 3700,
    biggestWin: 2700,
  },
  {
    phone: "93****2345",
    totalWinnings: 4800,
    totalBets: 3300,
    biggestWin: 2400,
  },
  {
    phone: "74****9012",
    totalWinnings: 4200,
    totalBets: 2900,
    biggestWin: 2100,
  },
  {
    phone: "70****7890",
    totalWinnings: 3500,
    totalBets: 2400,
    biggestWin: 1800,
  },
  {
    phone: "88****3456",
    totalWinnings: 2900,
    totalBets: 2000,
    biggestWin: 1500,
  },
  {
    phone: "99****4567",
    totalWinnings: 2200,
    totalBets: 1500,
    biggestWin: 1200,
  },
];

function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 2)}****${phone.slice(-4)}`;
}

function getUserStats(phone: string) {
  try {
    const raw = localStorage.getItem(`fastwiin_bets_${phone}`);
    if (!raw) return { totalWinnings: 0, totalBets: 0, biggestWin: 0 };
    const bets: Array<{ amount: number }> = JSON.parse(raw);
    const totalBets = bets.reduce((s, b) => s + (b.amount ?? 0), 0);
    const biggestWin = Math.max(...bets.map((b) => b.amount * 9), 0);
    const totalWinnings = Math.round(totalBets * 1.1);
    return { totalWinnings, totalBets, biggestWin };
  } catch {
    return { totalWinnings: 0, totalBets: 0, biggestWin: 0 };
  }
}

export default function Leaderboard({ phone }: { phone: string }) {
  const [tab, setTab] = useState<RankTab>("winnings");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const userStats = useMemo(() => getUserStats(phone), [phone]);
  const maskedPhone = phone ? maskPhone(phone) : "You";

  const entries = useMemo(() => {
    const simulated =
      timeFilter === "all" ? SIMULATED_PLAYERS : SIMULATED_TODAY;
    const userMultiplier = timeFilter === "today" ? 0.05 : 1;

    const userEntry: LeaderboardEntry = {
      rank: 0,
      phone: maskedPhone,
      totalWinnings: Math.round(userStats.totalWinnings * userMultiplier),
      totalBets: Math.round(userStats.totalBets * userMultiplier),
      biggestWin: Math.round(userStats.biggestWin * userMultiplier),
      isCurrentUser: true,
    };

    const all: LeaderboardEntry[] = [
      ...simulated.map((p, i) => ({ ...p, rank: i + 1 })),
      userEntry,
    ];

    const sortKey: keyof LeaderboardEntry =
      tab === "winnings"
        ? "totalWinnings"
        : tab === "bets"
          ? "totalBets"
          : "biggestWin";

    all.sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
    all.forEach((e, i) => {
      e.rank = i + 1;
    });
    return all.slice(0, 10);
  }, [tab, timeFilter, userStats, maskedPhone]);

  const statLabel =
    tab === "winnings"
      ? "Winnings"
      : tab === "bets"
        ? "Total Bets"
        : "Biggest Win";

  const getRankColor = (rank: number) => {
    if (rank === 1) return "oklch(0.84 0.16 89)";
    if (rank === 2) return "oklch(0.75 0.05 200)";
    if (rank === 3) return "oklch(0.72 0.14 55)";
    return "oklch(0.45 0 0)";
  };

  const tabStyle = (active: boolean) => ({
    background: active ? "oklch(0.95 0 0)" : "transparent",
    color: active ? "oklch(0.06 0 0)" : "oklch(0.55 0 0)",
    border: "none",
    borderRadius: "6px",
    padding: "5px 10px",
    fontSize: "11px",
    fontWeight: active ? 800 : 600,
    cursor: "pointer",
    transition: "all 0.15s",
  });

  const filterStyle = (active: boolean) => ({
    background: active ? "oklch(0.84 0.16 89)" : "oklch(0.14 0 0)",
    color: active ? "oklch(0.06 0 0)" : "oklch(0.55 0 0)",
    border: `1px solid ${active ? "oklch(0.84 0.16 89)" : "oklch(0.22 0 0)"}`,
    borderRadius: "20px",
    padding: "4px 12px",
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <div
      data-ocid="leaderboard.section"
      style={{
        background: "oklch(0.10 0 0)",
        border: "1px solid oklch(0.18 0 0)",
        borderRadius: "14px",
        padding: "16px",
        marginTop: "4px",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          style={{
            background: "oklch(0.84 0.16 89 / 0.12)",
            border: "1px solid oklch(0.84 0.16 89 / 0.25)",
            borderRadius: "8px",
            padding: "6px",
            display: "flex",
          }}
        >
          <Trophy
            className="w-4 h-4"
            style={{ color: "oklch(0.84 0.16 89)" }}
          />
        </div>
        <div>
          <p
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: "oklch(0.55 0 0)" }}
          >
            Leaderboard
          </p>
          <p className="text-xs font-bold text-foreground">Top Players</p>
        </div>
      </div>

      {/* Rank tabs */}
      <div
        style={{
          background: "oklch(0.14 0 0)",
          borderRadius: "8px",
          padding: "3px",
          display: "flex",
          gap: "2px",
          marginBottom: "10px",
        }}
      >
        <button
          type="button"
          data-ocid="leaderboard.tab"
          style={tabStyle(tab === "winnings")}
          onClick={() => setTab("winnings")}
        >
          💰 Winnings
        </button>
        <button
          type="button"
          data-ocid="leaderboard.tab"
          style={tabStyle(tab === "bets")}
          onClick={() => setTab("bets")}
        >
          🎲 Bets
        </button>
        <button
          type="button"
          data-ocid="leaderboard.tab"
          style={tabStyle(tab === "biggest")}
          onClick={() => setTab("biggest")}
        >
          ⚡ Biggest
        </button>
      </div>

      {/* Time filter */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          style={filterStyle(timeFilter === "all")}
          onClick={() => setTimeFilter("all")}
          data-ocid="leaderboard.toggle"
        >
          All-Time
        </button>
        <button
          type="button"
          style={filterStyle(timeFilter === "today")}
          onClick={() => setTimeFilter("today")}
          data-ocid="leaderboard.toggle"
        >
          Today
        </button>
      </div>

      {/* Column header */}
      <div
        className="flex items-center"
        style={{
          padding: "0 8px 6px",
          borderBottom: "1px solid oklch(0.18 0 0)",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            width: "28px",
            fontSize: "9px",
            fontWeight: 700,
            color: "oklch(0.40 0 0)",
          }}
        >
          #
        </span>
        <span
          style={{
            flex: 1,
            fontSize: "9px",
            fontWeight: 700,
            color: "oklch(0.40 0 0)",
            textTransform: "uppercase",
          }}
        >
          Player
        </span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color: "oklch(0.40 0 0)",
            textTransform: "uppercase",
          }}
        >
          {statLabel}
        </span>
      </div>

      {/* Rows */}
      <div className="space-y-0.5">
        {entries.map((entry, idx) => {
          const stat =
            tab === "winnings"
              ? entry.totalWinnings
              : tab === "bets"
                ? entry.totalBets
                : entry.biggestWin;
          const ocidIndex = idx + 1;
          return (
            <div
              key={`${entry.phone}-${entry.rank}`}
              data-ocid={`leaderboard.item.${ocidIndex}`}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "7px 8px",
                borderRadius: "8px",
                background: entry.isCurrentUser
                  ? "oklch(0.84 0.16 89 / 0.06)"
                  : "transparent",
                border: entry.isCurrentUser
                  ? "1px solid oklch(0.84 0.16 89 / 0.20)"
                  : "1px solid transparent",
              }}
            >
              <div style={{ width: "28px" }}>
                {entry.rank <= 3 ? (
                  <Medal
                    className="w-4 h-4"
                    style={{ color: getRankColor(entry.rank) }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "oklch(0.35 0 0)",
                    }}
                  >
                    {entry.rank}
                  </span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: entry.isCurrentUser ? 800 : 600,
                    color: entry.isCurrentUser
                      ? "oklch(0.84 0.16 89)"
                      : "oklch(0.80 0 0)",
                  }}
                >
                  {entry.phone}
                  {entry.isCurrentUser && (
                    <span
                      style={{
                        marginLeft: "6px",
                        fontSize: "9px",
                        fontWeight: 700,
                        color: "oklch(0.84 0.16 89)",
                        background: "oklch(0.84 0.16 89 / 0.15)",
                        padding: "1px 5px",
                        borderRadius: "4px",
                      }}
                    >
                      YOU
                    </span>
                  )}
                </span>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: stat > 0 ? "oklch(0.70 0.18 145)" : "oklch(0.40 0 0)",
                }}
              >
                ₹{stat.toLocaleString("en-IN")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
