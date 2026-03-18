import { useNotifications } from "@/contexts/NotificationContext";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead, clearAll } =
    useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        data-ocid="nav.notifications.button"
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-accent"
        aria-label="Notifications"
      >
        <Bell className="w-4.5 h-4.5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="notification-panel"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            data-ocid="nav.popover"
            className="absolute right-0 top-11 w-80 rounded-xl border border-border shadow-2xl z-50"
            style={{ background: "oklch(0.13 0 0)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-bold">Notifications</span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    data-ocid="nav.notifications.toggle"
                    onClick={markAllRead}
                    title="Mark all read"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearAll}
                  title="Clear all"
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div
                  data-ocid="nav.notifications.empty_state"
                  className="py-8 text-center"
                >
                  <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {notifications.map((n, i) => (
                    <div
                      key={n.id}
                      data-ocid={`nav.notifications.item.${i + 1}`}
                      className={`px-4 py-3 flex gap-3 ${
                        !n.read ? "bg-accent/30" : ""
                      }`}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                        style={{
                          background:
                            n.type === "win"
                              ? "oklch(0.60 0.18 145)"
                              : n.type === "loss"
                                ? "oklch(0.55 0.22 28)"
                                : n.type === "result"
                                  ? "oklch(0.48 0.22 296)"
                                  : "oklch(0.45 0 0)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs leading-relaxed ${
                            n.type === "win"
                              ? "text-green-400"
                              : "text-foreground/90"
                          }`}
                        >
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(n.timestamp).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
