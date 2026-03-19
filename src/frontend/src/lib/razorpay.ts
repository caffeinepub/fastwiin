// Razorpay key — rzp_test_* for test mode, rzp_live_* for production
export const RAZORPAY_KEY = "rzp_test_ST4yWyBdlBRbrR";

interface RazorpayOptions {
  key: string;
  amount: number; // in paise (multiply ₹ by 100)
  currency: string;
  name: string;
  description: string;
  prefill?: { contact?: string };
  theme?: { color: string };
  handler: (response: { razorpay_payment_id: string }) => void;
  modal?: { ondismiss: () => void };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

export function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(
  amountRupees: number,
  phone: string,
): Promise<{ razorpay_payment_id: string }> {
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: RAZORPAY_KEY,
      amount: amountRupees * 100, // paise
      currency: "INR",
      name: "Fastwiin",
      description: `Deposit ₹${amountRupees}`,
      prefill: { contact: phone },
      theme: { color: "#ffffff" },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.open();
  });
}
