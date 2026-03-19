import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getRecordStatus,
  useAdjustBalance,
  useAllDeposits,
  useAllUsers,
  useAllWithdrawals,
  useApproveDeposit,
  useApproveWithdrawal,
  useBlockUser,
  useRejectDeposit,
  useRejectWithdrawal,
  useUnblockUser,
} from "@/hooks/useQueries";
import {
  CheckCircle,
  Loader2,
  Shield,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    pending: {
      bg: "oklch(0.84 0.16 89 / 0.15)",
      color: "oklch(0.84 0.16 89)",
      label: "Pending",
    },
    approved: {
      bg: "oklch(0.60 0.18 145 / 0.15)",
      color: "oklch(0.60 0.18 145)",
      label: "Approved",
    },
    rejected: {
      bg: "oklch(0.55 0.22 28 / 0.15)",
      color: "oklch(0.55 0.22 28)",
      label: "Rejected",
    },
  };
  const s = styles[status] ?? styles.pending;
  return (
    <span
      className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function formatTs(ts: bigint): string {
  try {
    return new Date(Number(ts / 1_000_000n)).toLocaleString("en-IN");
  } catch {
    return "-";
  }
}

function fmt(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function UsersTab() {
  const { data: users, isLoading } = useAllUsers();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const adjustBalance = useAdjustBalance();
  const [balanceInputs, setBalanceInputs] = useState<Record<string, string>>(
    {},
  );

  const handleToggleBlock = async (phone: string, blocked: boolean) => {
    try {
      if (blocked) {
        await unblockUser.mutateAsync(phone);
        toast.success(`User ${phone} unblocked`);
      } else {
        await blockUser.mutateAsync(phone);
        toast.success(`User ${phone} blocked`);
      }
    } catch {
      toast.error("Action failed");
    }
  };

  const handleAdjustBalance = async (phone: string) => {
    const val = Number.parseFloat(balanceInputs[phone] ?? "");
    if (Number.isNaN(val) || val < 0) {
      toast.error("Enter a valid balance amount");
      return;
    }
    try {
      await adjustBalance.mutateAsync({ phone, newBalance: val });
      toast.success(`Balance updated for ${phone}`);
      setBalanceInputs((prev) => ({ ...prev, [phone]: "" }));
    } catch {
      toast.error("Balance update failed");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 py-4" data-ocid="admin.users.loading_state">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div
        className="text-center py-12 text-muted-foreground text-sm"
        data-ocid="admin.users.empty_state"
      >
        No users registered yet.
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <Table data-ocid="admin.users.table">
        <TableHeader>
          <TableRow style={{ borderColor: "oklch(0.18 0 0)" }}>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Phone
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Balance
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Registered
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user, i) => (
            <TableRow
              key={user.phone}
              data-ocid={`admin.users.item.${i + 1}`}
              style={{ borderColor: "oklch(0.13 0 0)" }}
            >
              <TableCell className="font-mono text-xs">{user.phone}</TableCell>
              <TableCell className="font-bold text-cta">
                {fmt(user.balance)}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatTs(user.registeredAt)}
              </TableCell>
              <TableCell>
                {user.blocked ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-red-500/40 text-red-400"
                  >
                    Blocked
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-green-500/40 text-green-400"
                  >
                    Active
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    data-ocid={`admin.users.toggle.${i + 1}`}
                    onClick={() => handleToggleBlock(user.phone, user.blocked)}
                    disabled={blockUser.isPending || unblockUser.isPending}
                    className="text-[10px] h-7 px-2 border-border"
                  >
                    {user.blocked ? "Unblock" : "Block"}
                  </Button>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder="New ₹"
                      value={balanceInputs[user.phone] ?? ""}
                      onChange={(e) =>
                        setBalanceInputs((prev) => ({
                          ...prev,
                          [user.phone]: e.target.value,
                        }))
                      }
                      className="h-7 w-20 text-xs bg-input border-border"
                      data-ocid={`admin.balance.input.${i + 1}`}
                    />
                    <Button
                      size="sm"
                      data-ocid={`admin.balance.save_button.${i + 1}`}
                      onClick={() => handleAdjustBalance(user.phone)}
                      disabled={adjustBalance.isPending}
                      className="h-7 px-2 text-[10px] bg-cta text-cta-foreground hover:bg-cta/90"
                    >
                      Set
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function WithdrawalsTab() {
  const { data: withdrawals, isLoading } = useAllWithdrawals();
  const approve = useApproveWithdrawal();
  const reject = useRejectWithdrawal();

  const handleApprove = async (id: string) => {
    try {
      await approve.mutateAsync(id);
      toast.success("Withdrawal approved");
    } catch {
      toast.error("Failed to approve withdrawal");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await reject.mutateAsync(id);
      toast.success("Withdrawal rejected & balance refunded");
    } catch {
      toast.error("Failed to reject withdrawal");
    }
  };

  if (isLoading) {
    return (
      <div
        className="space-y-2 py-4"
        data-ocid="admin.withdrawals.loading_state"
      >
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!withdrawals || withdrawals.length === 0) {
    return (
      <div
        className="text-center py-12 text-muted-foreground text-sm"
        data-ocid="admin.withdrawals.empty_state"
      >
        No withdrawal requests yet.
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <Table data-ocid="admin.withdrawals.table">
        <TableHeader>
          <TableRow style={{ borderColor: "oklch(0.18 0 0)" }}>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              ID
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Phone
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Amount
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              UPI ID
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Date
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withdrawals.map((w, i) => {
            const status = getRecordStatus(w.status);
            return (
              <TableRow
                key={w.id}
                data-ocid={`admin.withdrawals.item.${i + 1}`}
                style={{ borderColor: "oklch(0.13 0 0)" }}
              >
                <TableCell className="font-mono text-[10px] text-muted-foreground">
                  {w.id.slice(0, 8)}...
                </TableCell>
                <TableCell className="font-mono text-xs">{w.phone}</TableCell>
                <TableCell className="font-bold text-cta">
                  {fmt(w.amount)}
                </TableCell>
                <TableCell className="text-xs">{w.upiId}</TableCell>
                <TableCell>
                  <StatusBadge status={status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatTs(w.timestamp)}
                </TableCell>
                <TableCell>
                  {status === "pending" ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        data-ocid={`admin.withdrawals.confirm_button.${i + 1}`}
                        onClick={() => handleApprove(w.id)}
                        disabled={approve.isPending || reject.isPending}
                        className="h-7 px-2 text-[10px] bg-green-600 hover:bg-green-700 text-white"
                      >
                        {approve.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        <span className="ml-1">Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        data-ocid={`admin.withdrawals.delete_button.${i + 1}`}
                        onClick={() => handleReject(w.id)}
                        disabled={approve.isPending || reject.isPending}
                        className="h-7 px-2 text-[10px] bg-red-600 hover:bg-red-700 text-white"
                      >
                        {reject.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span className="ml-1">Reject</span>
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function DepositsTab() {
  const { data: deposits, isLoading } = useAllDeposits();
  const approve = useApproveDeposit();
  const reject = useRejectDeposit();

  const handleApprove = async (id: string) => {
    try {
      await approve.mutateAsync(id);
      toast.success("Deposit approved & balance credited");
    } catch {
      toast.error("Failed to approve deposit");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await reject.mutateAsync(id);
      toast.success("Deposit rejected");
    } catch {
      toast.error("Failed to reject deposit");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 py-4" data-ocid="admin.deposits.loading_state">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!deposits || deposits.length === 0) {
    return (
      <div
        className="text-center py-12 text-muted-foreground text-sm"
        data-ocid="admin.deposits.empty_state"
      >
        No deposit requests yet.
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <Table data-ocid="admin.deposits.table">
        <TableHeader>
          <TableRow style={{ borderColor: "oklch(0.18 0 0)" }}>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              ID
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Phone
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Amount
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              UPI Ref
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Date
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deposits.map((d, i) => {
            const status = getRecordStatus(d.status);
            return (
              <TableRow
                key={d.id}
                data-ocid={`admin.deposits.item.${i + 1}`}
                style={{ borderColor: "oklch(0.13 0 0)" }}
              >
                <TableCell className="font-mono text-[10px] text-muted-foreground">
                  {d.id.slice(0, 8)}...
                </TableCell>
                <TableCell className="font-mono text-xs">{d.phone}</TableCell>
                <TableCell className="font-bold text-cta">
                  {fmt(d.amount)}
                </TableCell>
                <TableCell className="text-xs">{d.upiRef}</TableCell>
                <TableCell>
                  <StatusBadge status={status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatTs(d.timestamp)}
                </TableCell>
                <TableCell>
                  {status === "pending" ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        data-ocid={`admin.deposits.confirm_button.${i + 1}`}
                        onClick={() => handleApprove(d.id)}
                        disabled={approve.isPending || reject.isPending}
                        className="h-7 px-2 text-[10px] bg-green-600 hover:bg-green-700 text-white"
                      >
                        {approve.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        <span className="ml-1">Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        data-ocid={`admin.deposits.delete_button.${i + 1}`}
                        onClick={() => handleReject(d.id)}
                        disabled={approve.isPending || reject.isPending}
                        className="h-7 px-2 text-[10px] bg-red-600 hover:bg-red-700 text-white"
                      >
                        {reject.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span className="ml-1">Reject</span>
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

export default function AdminPanel() {
  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-28">
      {/* Admin Header Banner */}
      <div
        className="rounded-xl p-4 mb-5 flex items-center gap-3"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.10 0 0) 0%, oklch(0.14 0.02 280) 100%)",
          border: "1px solid oklch(0.48 0.22 296 / 0.40)",
        }}
        data-ocid="admin.panel"
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: "oklch(0.48 0.22 296 / 0.20)",
            border: "1px solid oklch(0.48 0.22 296 / 0.40)",
          }}
        >
          <Shield
            className="w-5 h-5"
            style={{ color: "oklch(0.70 0.18 296)" }}
          />
        </div>
        <div>
          <h1
            className="text-sm font-black uppercase tracking-widest"
            style={{ color: "oklch(0.70 0.18 296)" }}
          >
            Admin Panel
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Manage users, deposits, and withdrawals
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList
          className="w-full grid grid-cols-3 mb-5 h-auto"
          style={{
            background: "oklch(0.10 0 0)",
            border: "1px solid oklch(0.18 0 0)",
          }}
        >
          <TabsTrigger
            value="users"
            data-ocid="admin.users.tab"
            className="py-2.5 text-[11px] font-bold uppercase tracking-wide data-[state=active]:bg-cta data-[state=active]:text-cta-foreground"
          >
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Users
          </TabsTrigger>
          <TabsTrigger
            value="withdrawals"
            data-ocid="admin.withdrawals.tab"
            className="py-2.5 text-[11px] font-bold uppercase tracking-wide data-[state=active]:bg-cta data-[state=active]:text-cta-foreground"
          >
            <Wallet className="w-3.5 h-3.5 mr-1.5" />
            Withdrawals
          </TabsTrigger>
          <TabsTrigger
            value="deposits"
            data-ocid="admin.deposits.tab"
            className="py-2.5 text-[11px] font-bold uppercase tracking-wide data-[state=active]:bg-cta data-[state=active]:text-cta-foreground"
          >
            <Wallet className="w-3.5 h-3.5 mr-1.5" />
            Deposits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-0">
          <div
            className="rounded-xl p-4"
            style={{
              background: "oklch(0.09 0 0)",
              border: "1px solid oklch(0.15 0 0)",
            }}
          >
            <UsersTab />
          </div>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-0">
          <div
            className="rounded-xl p-4"
            style={{
              background: "oklch(0.09 0 0)",
              border: "1px solid oklch(0.15 0 0)",
            }}
          >
            <WithdrawalsTab />
          </div>
        </TabsContent>

        <TabsContent value="deposits" className="mt-0">
          <div
            className="rounded-xl p-4"
            style={{
              background: "oklch(0.09 0 0)",
              border: "1px solid oklch(0.15 0 0)",
            }}
          >
            <DepositsTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
