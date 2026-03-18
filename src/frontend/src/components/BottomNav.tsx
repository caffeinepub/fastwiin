import { Clock, Home, Timer, User, Zap } from "lucide-react";
import { motion } from "motion/react";

export type TabKey = "home" | "30s" | "1min" | "3min" | "account";

const TABS: {
  key: TabKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  isHome?: boolean;
}[] = [
  { key: "home", label: "Home", Icon: Home, isHome: true },
  { key: "30s", label: "30S", Icon: Zap },
  { key: "1min", label: "1MIN", Icon: Clock },
  { key: "3min", label: "3MIN", Icon: Timer },
  { key: "account", label: "Account", Icon: User },
];

export default function BottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "oklch(0.07 0 0)",
        borderTop: "1px solid oklch(0.18 0 0)",
      }}
      aria-label="Bottom navigation"
    >
      <div className="flex items-stretch h-[60px] max-w-[1240px] mx-auto">
        {TABS.map(({ key, label, Icon, isHome }) => {
          const isActive = activeTab === key;
          const iconSize = isHome ? "w-[18px] h-[18px]" : "w-4 h-4";
          const filter =
            isActive && isHome
              ? "drop-shadow(0 0 6px oklch(0.84 0.16 89))"
              : isActive
                ? "drop-shadow(0 0 4px oklch(1 0 0 / 0.5))"
                : "none";

          return (
            <button
              key={key}
              type="button"
              data-ocid={`nav.${key}.tab`}
              onClick={() => onTabChange(key)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200 group"
              style={{
                color: isActive
                  ? isHome
                    ? "oklch(0.84 0.16 89)"
                    : "oklch(1 0 0)"
                  : "oklch(0.42 0 0)",
              }}
            >
              {/* Active glow border top */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-2 right-2 h-[2px] rounded-b-full"
                  style={{
                    background: isHome ? "oklch(0.84 0.16 89)" : "oklch(1 0 0)",
                    boxShadow: isHome
                      ? "0 0 8px oklch(0.84 0.16 89 / 0.8)"
                      : "0 0 8px oklch(1 0 0 / 0.4)",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}

              {/* Icon wrapper */}
              <div
                className="relative flex items-center justify-center transition-all duration-200"
                style={{
                  width: isHome ? 28 : 22,
                  height: isHome ? 28 : 22,
                }}
              >
                {isActive && isHome && (
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "oklch(0.84 0.16 89 / 0.12)",
                      border: "1px solid oklch(0.84 0.16 89 / 0.25)",
                    }}
                  />
                )}
                {/* Wrap icon in a div to apply filter without passing unsupported style prop */}
                <div
                  className="relative flex items-center justify-center"
                  style={{ filter }}
                >
                  <Icon className={`${iconSize} relative`} />
                </div>
              </div>

              <span
                className="text-[9px] font-bold uppercase tracking-wider leading-none transition-all"
                style={{
                  letterSpacing: isHome ? "0.1em" : "0.08em",
                  fontSize: isHome ? "9.5px" : "9px",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* iOS-style safe area padding */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}
