import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActor } from "@/hooks/useActor";
import {
  useApproveDeposit,
  useAuthStatus,
  useRequestDeposit,
} from "@/hooks/useQueries";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DepositModal() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("500");
  const [loading, setLoading] = useState(false);

  const { data: authStatus } = useAuthStatus();
  const phone = authStatus?.phone ?? "";

  const requestDeposit = useRequestDeposit();
  const approveDeposit = useApproveDeposit();
  const qc = useQueryClient();

  const handleDeposit = async () => {
    const n = Number.parseInt(amount, 10);
    if (Number.isNaN(n) || n < 100) {
      toast.error("Minimum deposit is ₹100");
      return;
    }
    if (n > 10000) {
      toast.error("Maximum deposit is ₹10,000");
      return;
    }
    setLoading(true);
    let depositId: string | null = null;
    try {
      depositId = await requestDeposit.mutateAsync({
        phone,
        amount: n,
        upiRef: "razorpay",
      });
      await openRazorpayCheckout(n, phone);
      await approveDeposit.mutateAsync(depositId);
      toast.success(`₹${n} deposited successfully!`);
      qc.invalidateQueries({ queryKey: ["balance"] });
      qc.invalidateQueries({ queryKey: ["myDeposits"] });
      setOpen(false);
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg === "Payment cancelled") {
        toast.error("Payment cancelled");
      } else {
        toast.error("Deposit failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          data-ocid="deposit.open_modal_button"
          size="sm"
          variant="outline"
          className="border-cta/50 text-cta hover:bg-cta/10 hover:border-cta font-bold h-8"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Deposit
        </Button>
      </DialogTrigger>
      <DialogContent
        className="bg-card border-border max-w-xs"
        data-ocid="deposit.dialog"
      >
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="dep-amount">Amount (₹)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                ₹
              </span>
              <Input
                id="dep-amount"
                data-ocid="deposit.input"
                type="number"
                min={100}
                max={10000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 bg-input border-border"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[100, 500, 1000, 5000].map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setAmount(String(p))}
                className="py-1.5 rounded text-xs font-bold border border-border text-muted-foreground hover:border-cta hover:text-cta transition-colors"
              >
                ₹{p}
              </button>
            ))}
          </div>
          <Button
            data-ocid="deposit.submit_button"
            onClick={handleDeposit}
            disabled={loading}
            className="w-full bg-cta text-cta-foreground hover:bg-cta/90 font-bold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? "Processing..." : `Pay ₹${amount || 0} via Razorpay`}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            Powered by Razorpay · Test Mode
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
