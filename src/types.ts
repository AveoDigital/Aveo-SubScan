export interface Subscription {
  id?: string;
  userId: string;
  serviceName: string;
  amount: number;
  currency: string;
  billingCycle: string; // "weekly" | "monthly" | "yearly" | "one-time"
  nextPaymentDate: string; // YYYY-MM-DD
  alertEnabled: boolean;
  priceIncreased: boolean;
  renewalIncreaseAmount: number;
  previousPrice: number;
  category: string; // "Stream", "Productivity", "Utility", "Entertainment", "Finance", "Other"
  source: 'gmail' | 'manual';
  status: 'active' | 'cancelled' | 'paused';
  emailSubject?: string;
  emailDate?: string;
  notes?: string;
  createdAt?: string;
}

export interface UserSettings {
  email: string;
  lastScannedAt?: string;
  currency: string; // "USD" | "SEK" | "EUR"
  theme: string;
}

export interface GeminiScanResult {
  isSubscriptionEmail: boolean;
  serviceName: string;
  amount: number;
  currency: string;
  billingCycle: string;
  nextPaymentDate: string; // YYYY-MM-DD
  priceIncreased: boolean;
  renewalIncreaseAmount: number;
  previousPrice: number;
  category: string;
  confidenceScore: number;
  explanation: string;
}

export interface SavingsTip {
  title: string;
  description: string;
  potentialSavingAmount: number;
  currency: string;
  confidenceScore: number;
}

export interface AlternativeAppSetup {
  currentSetups: string[];
  recommendedReplacement: string;
  replacementDescription: string;
  monthlySavings: number;
  techAdvancement: string;
}

export interface GeminiInsights {
  analysisText: string;
  tips: SavingsTip[];
  alternatives: AlternativeAppSetup[];
}
