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
import { useAuthStatus, useRequestDeposit } from "@/hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Lock, Plus, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PLATFORM_UPI = "ankitzapda7@okicici";

export default function DepositModal() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("500");
  const [utrRef, setUtrRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: authStatus } = useAuthStatus();
  const phone = authStatus?.phone ?? "";

  const requestDeposit = useRequestDeposit();
  const qc = useQueryClient();

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(PLATFORM_UPI);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("UPI ID copied!");
  };

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
    if (!utrRef.trim()) {
      toast.error("Enter UTR / Transaction ID");
      return;
    }
    setLoading(true);
    try {
      await requestDeposit.mutateAsync({
        phone,
        amount: n,
        upiRef: utrRef.trim(),
      });
      toast.success("Deposit request submitted! Awaiting admin approval.");
      qc.invalidateQueries({ queryKey: ["myDeposits"] });
      setAmount("500");
      setUtrRef("");
      setOpen(false);
    } catch {
      toast.error("Deposit failed. Please try again.");
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
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cta" /> UPI Deposit
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div
            className="rounded-lg px-3 py-2 text-xs leading-relaxed"
            style={{
              background: "oklch(0.48 0.22 296 / 0.10)",
              color: "oklch(0.70 0.18 296)",
            }}
          >
            Balance is credited after admin confirms your payment.
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Send to UPI ID
            </Label>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 border border-border bg-input">
              <span className="flex-1 font-mono text-sm font-bold text-cta">
                {PLATFORM_UPI}
              </span>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-game-green" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

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

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              UTR / Transaction ID
            </Label>
            <Input
              data-ocid="deposit.textarea"
              type="text"
              placeholder="Enter UTR / Transaction ID"
              value={utrRef}
              onChange={(e) => setUtrRef(e.target.value)}
              className="bg-input border-border"
            />
          </div>

          <Button
            data-ocid="deposit.submit_button"
            onClick={handleDeposit}
            disabled={loading}
            className="w-full bg-cta text-cta-foreground hover:bg-cta/90 font-bold"
          >
            {loading
              ? "Submitting..."
              : `Submit Deposit Request ₹${amount || 0}`}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            Balance credited after admin confirms payment
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
