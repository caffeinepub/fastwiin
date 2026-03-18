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
import { useDeposit } from "@/hooks/useQueries";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DepositModal() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("100");
  const deposit = useDeposit();

  const handleDeposit = async () => {
    const n = Number.parseInt(amount, 10);
    if (Number.isNaN(n) || n < 10) {
      toast.error("Minimum deposit is ₹10");
      return;
    }
    if (n > 10000) {
      toast.error("Maximum balance is ₹10,000");
      return;
    }
    try {
      await deposit.mutateAsync(n);
      toast.success(`₹${n} deposited!`);
      setOpen(false);
    } catch {
      toast.error("Deposit failed");
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
                min={10}
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
            disabled={deposit.isPending}
            className="w-full bg-cta text-cta-foreground hover:bg-cta/90 font-bold"
          >
            {deposit.isPending && (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            )}
            Deposit ₹{amount || 0}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
