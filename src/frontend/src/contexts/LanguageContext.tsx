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
  // Navigation
  home: { en: "Home", hi: "होम" },
  game30s: { en: "30 SEC", hi: "30 सेकंड" },
  game1min: { en: "1 MIN", hi: "1 मिनट" },
  game3min: { en: "3 MIN", hi: "3 मिनट" },
  account: { en: "Account", hi: "खाता" },
  admin: { en: "Admin", hi: "एडमिन" },
  // Game UI
  timeRemaining: { en: "Time remaining", hi: "शेष समय" },
  bettingClosed: { en: "Betting Closed", hi: "बेटिंग बंद" },
  placeBet: { en: "Confirm Bet", hi: "बेट लगाएं" },
  loginToBet: { en: "Login to Bet", hi: "बेट के लिए लॉगिन करें" },
  selectColor: { en: "Select Color", hi: "रंग चुनें" },
  selectNumber: { en: "Select Number", hi: "नंबर चुनें" },
  green: { en: "Green", hi: "हरा" },
  red: { en: "Red", hi: "लाल" },
  purple: { en: "Purple", hi: "बैंगनी" },
  potentialWin: { en: "Potential win", hi: "संभावित जीत" },
  minBet: { en: "Min ₹10", hi: "न्यूनतम ₹10" },
  maxBet: { en: "Max ₹10,000", hi: "अधिकतम ₹10,000" },
  betPlaced: { en: "Bet placed", hi: "बेट लगाई गई" },
  insufficient: { en: "Insufficient balance", hi: "पर्याप्त शेष राशि नहीं" },
  // Game result notifications
  roundResult: { en: "Round Result", hi: "राउंड परिणाम" },
  youWon: { en: "You Won!", hi: "आप जीत गए!" },
  youLost: { en: "Better luck next time", hi: "अगली बार किस्मत साथ दे" },
  // Auth
  login: { en: "Login", hi: "लॉगिन" },
  signup: { en: "Sign Up", hi: "साइन अप" },
  logout: { en: "Logout", hi: "लॉगआउट" },
  mobileNumber: { en: "Mobile Number", hi: "मोबाइल नंबर" },
  sendOtp: { en: "Send OTP", hi: "OTP भेजें" },
  verifyOtp: { en: "Verify OTP", hi: "OTP सत्यापित करें" },
  password: { en: "Password", hi: "पासवर्ड" },
  confirmPassword: { en: "Confirm Password", hi: "पासवर्ड पुष्टि करें" },
  referralCode: { en: "Referral Code", hi: "रेफरल कोड" },
  optional: { en: "optional", hi: "वैकल्पिक" },
  createAccount: { en: "Create Account", hi: "खाता बनाएं" },
  welcomeBack: { en: "Welcome Back", hi: "वापस स्वागत है" },
  // Deposit
  sendToUpi: { en: "Send to UPI ID", hi: "UPI ID पर भेजें" },
  utrId: { en: "UTR / Transaction ID", hi: "UTR / ट्रांजेक्शन ID" },
  depositRequest: { en: "Submit Deposit Request", hi: "जमा अनुरोध सबमिट करें" },
  depositPending: {
    en: "Balance credited after admin confirms payment",
    hi: "एडमिन पुष्टि के बाद बैलेंस जुड़ेगा",
  },
  // Withdraw
  withdrawRequest: {
    en: "Submit Withdrawal Request",
    hi: "निकासी अनुरोध सबमिट करें",
  },
  withdrawApproved: { en: "Withdrawal approved!", hi: "निकासी स्वीकृत!" },
  withdrawRejected: { en: "Withdrawal rejected", hi: "निकासी अस्वीकृत" },
  // Leaderboard
  leaderboard: { en: "Leaderboard", hi: "लीडरबोर्ड" },
  totalWinnings: { en: "Total Winnings", hi: "कुल जीत" },
  totalBets: { en: "Total Bets", hi: "कुल बेट" },
  biggestWin: { en: "Biggest Win", hi: "सबसे बड़ी जीत" },
  allTime: { en: "All Time", hi: "सभी समय" },
  daily: { en: "Daily", hi: "दैनिक" },
  weekly: { en: "Weekly", hi: "साप्ताहिक" },
  // Profile
  editProfile: { en: "Edit Profile", hi: "प्रोफ़ाइल संपादित करें" },
  displayName: { en: "Display Name", hi: "प्रदर्शन नाम" },
  totalBetsPlaced: { en: "Total Bets Placed", hi: "कुल बेट लगाई गईं" },
  totalWagered: { en: "Total Wagered", hi: "कुल दांव" },
  changePassword: { en: "Change Password", hi: "पासवर्ड बदलें" },
  // Referral
  referral: { en: "Referral", hi: "रेफरल" },
  yourReferralCode: { en: "Your Referral Code", hi: "आपका रेफरल कोड" },
  referFriend: { en: "Refer a Friend", hi: "दोस्त को रेफर करें" },
  referralBonus: {
    en: "Earn ₹100 when your friend makes their first deposit",
    hi: "दोस्त की पहली जमा पर ₹100 कमाएं",
  },
  // Support
  support: { en: "Support", hi: "सहायता" },
  contactSupport: { en: "Contact Support", hi: "सहायता से संपर्क करें" },
  // Filter
  filterMode: { en: "Filter by Mode", hi: "मोड से फ़िल्टर" },
  filterDate: { en: "Filter by Date", hi: "तारीख से फ़िल्टर" },
  allModes: { en: "All", hi: "सभी" },
  today: { en: "Today", hi: "आज" },
  thisWeek: { en: "This Week", hi: "इस सप्ताह" },
  allTime2: { en: "All Time", hi: "सभी समय" },
  // Admin
  adminPanel: { en: "Admin Panel", hi: "एडमिन पैनल" },
  users: { en: "Users", hi: "उपयोगकर्ता" },
  deposits: { en: "Deposits", hi: "जमा" },
  withdrawals: { en: "Withdrawals", hi: "निकासी" },
  approve: { en: "Approve", hi: "स्वीकृत" },
  reject: { en: "Reject", hi: "अस्वीकृत" },
  block: { en: "Block", hi: "ब्लॉक" },
  unblock: { en: "Unblock", hi: "अनब्लॉक" },
  pending: { en: "Pending", hi: "प्रतीक्षारत" },
  approved: { en: "Approved", hi: "स्वीकृत" },
  rejected: { en: "Rejected", hi: "अस्वीकृत" },
  // Misc
  invite: { en: "Invite", hi: "आमंत्रित" },
  howToWin: { en: "How to Win", hi: "कैसे जीतें" },
  playNow: { en: "Play Now", hi: "अभी खेलें" },
  liveNow: { en: "LIVE", hi: "लाइव" },
  betCloses: { en: "Bet closes at 5s", hi: "5 सेकंड पर बेट बंद" },
  yourBalance: { en: "Your Balance", hi: "आपकी शेष राशि" },
  chooseGame: { en: "Choose Your Game", hi: "अपना गेम चुनें" },
  noHistory2: { en: "No history yet", hi: "अभी कोई इतिहास नहीं" },
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
