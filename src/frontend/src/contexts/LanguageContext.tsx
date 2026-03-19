import { createContext, useContext, useState } from "react";

type Lang = "en" | "hi";

const translations: Record<string, Record<Lang, string>> = {
  myAccount: { en: "My Account", hi: "मेरा खाता" },
  deposit: { en: "Deposit", hi: "जमा करें" },
  withdraw: { en: "Withdraw", hi: "निकालें" },
  depositHistory: { en: "Deposit History", hi: "जमा इतिहास" },
  withdrawHistory: { en: "Withdraw History", hi: "निकासी इतिहास" },
  betHistory: { en: "Bet History", hi: "बेट इतिहास" },
  beginnerGuide: { en: "Guide", hi: "गाइड" },
  balance: { en: "Balance", hi: "शेष राशि" },
  amount: { en: "Amount (₹)", hi: "राशि (₹)" },
  upiRef: { en: "UPI Reference / Transaction ID", hi: "UPI संदर्भ / लेन-देन ID" },
  upiId: { en: "Your UPI ID", hi: "आपकी UPI ID" },
  submit: { en: "Submit", hi: "जमा करें" },
  noHistory: { en: "No records found", hi: "कोई रिकॉर्ड नहीं" },
  howToPlay: { en: "How to Play", hi: "कैसे खेलें" },
  disclaimer: {
    en: "⚠️ Play at your own risk. This is a real-money game. Only bet what you can afford to lose.",
    hi: "⚠️ अपने जोखिम पर खेलें। यह असली पैसों का गेम है। केवल उतना ही लगाएं जो आप खो सकते हों।",
  },
  profile: { en: "Profile", hi: "प्रोफ़ाइल" },
  language: { en: "Language", hi: "भाषा" },
  withdrawNote: {
    en: "Withdrawals are processed within 24 hours.",
    hi: "निकासी 24 घंटों के भीतर संसाधित की जाती है।",
  },
  enterAmount: { en: "Enter amount", hi: "राशि दर्ज करें" },
  enterUpiRef: { en: "e.g. TXN123456", hi: "जैसे TXN123456" },
  enterUpiId: { en: "e.g. name@upi", hi: "जैसे name@upi" },
  depositSuccess: { en: "Deposit successful!", hi: "जमा सफल रहा!" },
  withdrawSuccess: {
    en: "Withdraw request submitted!",
    hi: "निकासी अनुरोध सबमिट हुआ!",
  },
  date: { en: "Date", hi: "तारीख" },
  status: { en: "Status", hi: "स्थिति" },
  mode: { en: "Mode", hi: "मोड" },
  target: { en: "Selection", hi: "चयन" },
  period: { en: "Period", hi: "दौर" },
  colorMapping: {
    en: "1,3,7,9 = Green | 2,4,6,8 = Red | 0 = Purple+Red split | 5 = Green+Purple split",
    hi: "1,3,7,9 = हरा | 2,4,6,8 = लाल | 0 = बैंगनी+लाल | 5 = हरा+बैंगनी",
  },
  payouts: {
    en: "Number: 9× | Green/Red: 2× | Purple: 5× | Split numbers (0,5): half payout",
    hi: "नंबर: 9× | हरा/लाल: 2× | बैंगनी: 5× | स्प्लिट (0,5): आधा पेआउट",
  },
  howToBet: {
    en: "Pick a color or number, enter amount (min ₹10), and submit before the 5-second countdown ends.",
    hi: "एक रंग या नंबर चुनें, राशि दर्ज करें (न्यूनतम ₹10), और 5-सेकंड काउंटडाउन से पहले सबमिट करें।",
  },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const t = (key: string) => translations[key]?.[lang] ?? key;
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
