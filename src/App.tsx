import { useState, useEffect, useCallback } from "react";
import { 
  auth, db, googleSignIn, initAuth, getAccessToken, logout 
} from "./firebase";
import { 
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, writeBatch 
} from "firebase/firestore";
import { User } from "firebase/auth";
import { 
  Activity, ShieldCheck, Mail, LogOut, CheckCircle, 
  ArrowUpRight, PiggyBank, Sparkles, TrendingUp, AlertTriangle, ChevronRight, HelpCircle
} from "lucide-react";
import { Subscription } from "./types";
import RadarScanner from "./components/RadarScanner";
import SubscriptionCalendar from "./components/SubscriptionCalendar";
import InsightsHub from "./components/InsightsHub";
import SubscriptionList from "./components/SubscriptionList";
import AIPilotChat from "./components/AIPilotChat";

// Aveo Digital high-contrast brand color theme helpers:
// Primary Blue: #006aa7 (Tailwind blue-700 / blue-600)
// Accent Yellow: #fecc00 (Tailwind yellow-400 / amber-400)

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Subscriptions database states
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);

  // Add system logs helper with useCallback to prevent infinite dependency loops
  const addLog = useCallback((message: string) => {
    const time = new Date().toLocaleTimeString();
    setSystemLogs((prev) => [`[${time}] ${message}`, ...prev.slice(0, 49)]);
  }, []);

  // Demo fallback state in case they choose not to login
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Initial dummy dataset for demo illustration
  const INITIAL_DEMO_SUBSCRIPTIONS: Subscription[] = [
    {
      id: "demo_1",
      userId: "demo-user",
      serviceName: "Netflix Family",
      amount: 22,
      currency: "USD",
      billingCycle: "monthly",
      nextPaymentDate: "2026-07-02",
      alertEnabled: true,
      priceIncreased: true,
      renewalIncreaseAmount: 4.5,
      previousPrice: 17.5,
      category: "Stream",
      source: "gmail",
      status: "active",
      notes: "Detected Netflix price change warning email from support. Plan rate increased."
    },
    {
      id: "demo_2",
      userId: "demo-user",
      serviceName: "Spotify Premium Family",
      amount: 15,
      currency: "USD",
      billingCycle: "monthly",
      nextPaymentDate: "2026-06-16",
      alertEnabled: true,
      priceIncreased: false,
      renewalIncreaseAmount: 0,
      previousPrice: 15,
      category: "Entertainment",
      source: "gmail",
      status: "active",
      notes: "Auto-renewal invoiced and paid."
    },
    {
      id: "demo_3",
      userId: "demo-user",
      serviceName: "iCloud+ 2TB Storage",
      amount: 10,
      currency: "USD",
      billingCycle: "monthly",
      nextPaymentDate: "2026-06-25",
      alertEnabled: true,
      priceIncreased: false,
      renewalIncreaseAmount: 0,
      previousPrice: 10,
      category: "Utility",
      source: "gmail",
      status: "active",
      notes: "Invoiced by Apple."
    },
    {
      id: "demo_4",
      userId: "demo-user",
      serviceName: "Claude Pro",
      amount: 20,
      currency: "USD",
      billingCycle: "monthly",
      nextPaymentDate: "2026-06-28",
      alertEnabled: false,
      priceIncreased: false,
      renewalIncreaseAmount: 0,
      previousPrice: 20,
      category: "Productivity",
      source: "manual",
      status: "cancelled",
      notes: "Previously cancelled. Inactive this month."
    }
  ];

  // Initialize auth state
  useEffect(() => {
    addLog("System booting up. Initializing Aveo Auth services...");
    const unsubscribe = initAuth(
      (currentUser, cachedToken) => {
        setUser(currentUser);
        setToken(cachedToken);
        setNeedsAuth(false);
        setIsDemoMode(false);
        setLoading(false);
        addLog(`Authenticated successfully as ${currentUser.email}. Logged out of Demo Mode.`);
      },
      () => {
        setNeedsAuth(true);
        setLoading(false);
        setIsDemoMode(true);
        setSubscriptions(INITIAL_DEMO_SUBSCRIPTIONS);
        addLog("Initialized under anonymous Demo Mode. Sign in with Google to query real emails.");
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch subscriptions from Firestore whenever user logins or toggles modes
  useEffect(() => {
    if (isDemoMode) {
      // Keep initial dummy ones
      return;
    }

    const loadSubscriptions = async () => {
      if (!user) return;
      addLog(`Connecting to secure Firestore database for ${user.email}...`);
      try {
        const qSub = query(collection(db, "subscriptions"), where("userId", "==", user.uid));
        const snap = await getDocs(qSub);
        
        const fetched: Subscription[] = [];
        snap.forEach((docSnap) => {
          fetched.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Subscription, "id">)
          });
        });

        if (fetched.length === 0) {
          // If Firestore is empty but they just logged in, import some baseline dummy entries to explore
          addLog("Firestore ledger holds 0 entries. Importing initial safe defaults for evaluation...");
          const batch = writeBatch(db);
          const initialSet = INITIAL_DEMO_SUBSCRIPTIONS.map(s => ({
            ...s,
            userId: user.uid,
            id: undefined // let Firestore auto-assign
          }));

          const addedList: Subscription[] = [];
          for (const item of initialSet) {
            const docRef = doc(collection(db, "subscriptions"));
            batch.set(docRef, item);
            addedList.push({ ...item, id: docRef.id });
          }
          await batch.commit();
          setSubscriptions(addedList);
          addLog(`Default baseline subscriptions successfully committed and synched!`);
        } else {
          setSubscriptions(fetched);
          addLog(`Identified ${fetched.length} existing subscriptions from secure Cloud Run storage.`);
        }
      } catch (err: any) {
        console.error("Firestore loading error:", err);
        addLog(`Database connection failed: ${err.message}. Defaulting to browser fallback storage.`);
      }
    };

    loadSubscriptions();
  }, [user, isDemoMode]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    addLog("Redirecting terminal flow to Google Passport login Popup...");
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        setIsDemoMode(false);
        addLog(`Granted access. Google profile token synced: ${result.user.email}`);
      }
    } catch (err: any) {
      addLog(`Sign In Cancelled / Aborted: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    addLog("Signing out of current secure profile...");
    await logout();
    setUser(null);
    setToken(null);
    setIsDemoMode(true);
    setSubscriptions(INITIAL_DEMO_SUBSCRIPTIONS);
    addLog("Signed out. Re-installed high-fidelity static baseline template.");
  };

  // CRUD Data Handlers
  const handleAddSubscription = async (newSub: Subscription) => {
    if (isDemoMode) {
      const mockId = "demo_" + Date.now();
      const updated = [...subscriptions, { ...newSub, id: mockId }];
      setSubscriptions(updated);
      addLog(`Manual addition committed locally: Added "${newSub.serviceName}" costing ${newSub.amount} ${newSub.currency}`);
      return;
    }

    try {
      if (!user) return;
      const subToUpload = { ...newSub, userId: user.uid };
      const docRef = await addDoc(collection(db, "subscriptions"), subToUpload);
      setSubscriptions((prev) => [...prev, { ...subToUpload, id: docRef.id }]);
      addLog(`Successfully pushed active database subscription: "${newSub.serviceName}" to Firestore.`);
    } catch (err: any) {
      addLog(`Failed database insertion: ${err.message}`);
    }
  };

  const handleUpdateSubscription = async (updatedSub: Subscription) => {
    if (!updatedSub.id) return;

    if (isDemoMode) {
      const updated = subscriptions.map((s) => (s.id === updatedSub.id ? updatedSub : s));
      setSubscriptions(updated);
      addLog(`Ledger toggled locally: Updated "${updatedSub.serviceName}" active status.`);
      return;
    }

    try {
      const docRef = doc(db, "subscriptions", updatedSub.id);
      // Remove id from payload
      const { id, ...dataFields } = updatedSub;
      await updateDoc(docRef, dataFields);
      setSubscriptions((prev) => prev.map((s) => (s.id === updatedSub.id ? updatedSub : s)));
      addLog(`Database updated real-time: Modification on "${updatedSub.serviceName}" has been synchronized.`);
    } catch (err: any) {
      addLog(`Sync update failed: ${err.message}`);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (isDemoMode) {
      const updated = subscriptions.filter((s) => s.id !== id);
      setSubscriptions(updated);
      addLog("Removed ledger entry and updated local metrics.");
      return;
    }

    try {
      const docRef = doc(db, "subscriptions", id);
      await deleteDoc(docRef);
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      addLog("Successfully purged subscription record from your Cloud database container.");
    } catch (err: any) {
      addLog(`Purge failure: ${err.message}`);
    }
  };

  const handleBulkScanReceived = async (scannedSubs: Subscription[]) => {
    if (scannedSubs.length === 0) return;

    if (isDemoMode) {
      // Add and distinct duplicates by ServiceName to avoid double entries
      const currentNames = subscriptions.map((s) => s.serviceName.toLowerCase());
      const filteredNew = scannedSubs.filter((n) => !currentNames.includes(n.serviceName.toLowerCase()));

      setSubscriptions((prev) => [...prev, ...filteredNew]);
      addLog(`Scan complete. Ingested ${filteredNew.length} organic subscriptions (skipped overlapping).`);
      return;
    }

    try {
      if (!user) return;
      const addedList: Subscription[] = [];
      const batch = writeBatch(db);

      const currentNames = subscriptions.map((s) => s.serviceName.toLowerCase());
      const filteredNew = scannedSubs.filter((n) => !currentNames.includes(n.serviceName.toLowerCase()));

      for (const sub of filteredNew) {
        const docRef = doc(collection(db, "subscriptions"));
        const uploadPayload = { ...sub, userId: user.uid };
        batch.set(docRef, uploadPayload);
        addedList.push({ ...uploadPayload, id: docRef.id });
      }

      await batch.commit();
      setSubscriptions((prev) => [...prev, ...addedList]);
      addLog(`Successfully synchronized and saved ${addedList.length} subscriptions into persistent store.`);
    } catch (err: any) {
      addLog(`Bulk insertion failed: ${err.message}`);
    }
  };

  // Metrics calculators
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const cancelledSubs = subscriptions.filter((s) => s.status === "cancelled");

  // Summation conversion helper (convert other currencies to USD)
  const calculateTotalSpend = (subsList: Subscription[]) => {
    return subsList.reduce((acc, s) => {
      let amt = s.amount;
      if (s.currency === "SEK") amt = amt / 10;
      else if (s.currency === "EUR") amt = amt * 1.1;

      if (s.billingCycle === "yearly") {
        return acc + (amt / 12);
      } else if (s.billingCycle === "weekly") {
        return acc + (amt * 4);
      }
      return acc + amt;
    }, 0);
  };

  const currentMonthlyInvoices = calculateTotalSpend(activeSubs);
  const totalMoneySaved = calculateTotalSpend(cancelledSubs);
  const activePriceIncreases = activeSubs.filter((s) => s.priceIncreased).length;

  return (
    <div className="min-h-screen bg-[#006AA7] text-white font-sans flex flex-col justify-between">
      
      {/* Top Header Section representing brand colors - Bold Typography Swiss Design */}
      <header className="border-b-2 border-[#FECC00] max-w-7xl mx-auto w-full px-6 pt-10 pb-6 mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex flex-col">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none italic uppercase text-white">
              AVEO DIGITAL
            </h1>
            <span className="text-[#FECC00] text-xs font-bold tracking-widest mt-1.5 uppercase block">
              Subscription Ecosystem Management &bull; SubScan
            </span>
          </div>

          <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
            <div className="text-left md:text-right">
              <div className="text-[10px] opacity-75 uppercase tracking-widest font-extrabold">System Environment Status</div>
              <div className="text-lg font-black tracking-tight text-[#FECC00] uppercase font-mono">BETTER THAN YESTERDAY</div>
            </div>

            <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
              {isDemoMode ? (
                <div className="bg-[#00558a] border border-white/20 px-3 py-1.5 rounded-none flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FECC00] animate-ping"></span>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#FECC00]">Sandbox Trial Active</span>
                </div>
              ) : (
                <div className="bg-[#00558a] border border-white/20 px-3 py-1.5 rounded-none flex items-center gap-2">
                  <img 
                    src={user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80"}
                    alt="avatar" 
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full border border-[#FECC00]"
                  />
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">Authenticated Client</span>
                </div>
              )}

              {isDemoMode ? (
                <button
                  id="btn-login-header"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="bg-[#FECC00] hover:bg-[#FECC00]/90 text-[#006AA7] font-sans font-black uppercase text-xs py-2.5 px-4 rounded-none shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  Connect Gmail Log
                </button>
              ) : (
                <button
                  id="btn-logout-header"
                  onClick={handleLogout}
                  className="bg-transparent hover:bg-white/10 border-2 border-white text-white font-sans font-black uppercase text-xs py-2 px-3 rounded-none transition flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Dash */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 md:px-6 py-6 space-y-8">
        
        {/* Brand Slogan Card - Sharp premium layout styling */}
        <div className="bg-white text-[#006AA7] p-6 rounded-none border-l-8 border-[#FECC00] font-sans">
          <h3 className="text-[10px] font-black uppercase mb-1 tracking-widest text-[#006AA7]/60">Our Core Vision</h3>
          <p className="text-xl md:text-2xl font-bold leading-tight mb-2 text-slate-900">
            🤖 <span className="underline decoration-4 decoration-[#FECC00] font-black">Spreading AI Knowledge</span> &mdash; Bringing humans and AI together seamlessly.
          </p>
          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
            Aveo Digital is an artificial intelligence leader. We curate hyper-intelligent algorithms, optimize continuous subscription workloads, and deliver frictionless interface automation designed to unite cognitive agents with daily human productivity.
          </p>
        </div>

        {/* Dashboard Bold stats panel widgets with oversized typography */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Card A: Calculated Monthly Burn (Oversized) */}
          <div className="bg-[#00558a] text-white p-6 rounded-none border-t-8 border-[#FECC00] flex flex-col justify-between">
            <div>
              <h2 className="text-[#FECC00] text-xs font-bold uppercase tracking-widest mb-2 italic">Total Monthly Investment</h2>
              <div className="text-[64px] md:text-[80px] font-black leading-[0.8] tracking-tighter">
                ${Math.round(currentMonthlyInvoices)}<span className="text-[28px] align-top font-sans font-medium ml-1">USD</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/15">
              <div className="flex justify-between text-[10px] uppercase font-mono text-slate-300 mb-1.5 font-bold">
                <span>Monthly Cap: $80</span>
                <span className={currentMonthlyInvoices > 80 ? "text-[#FECC00] font-extrabold animate-pulse" : "text-emerald-400 font-extrabold"}>
                  {Math.round((currentMonthlyInvoices / 80) * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-700 rounded-none overflow-hidden border border-white/5">
                <div 
                  className={`h-full transition-all duration-500 ${currentMonthlyInvoices > 80 ? "bg-[#FECC00]" : "bg-emerald-400"}`}
                  style={{ width: `${Math.min((currentMonthlyInvoices / 80) * 100, 100)}%` }}
                />
              </div>
              {currentMonthlyInvoices > 80 && (
                <span className="text-[8px] bg-[#FECC00] text-[#006AA7] font-black px-1.5 py-0.5 rounded-none uppercase tracking-widest mt-2 block text-center animate-pulse">
                  ⚠️ Cap Exceeded
                </span>
              )}
            </div>
          </div>

          {/* Card B: Cash Saved */}
          <div className="bg-white text-[#006AA7] p-6 rounded-none border-l-8 border-[#FECC00] flex flex-col justify-between">
            <div>
              <h2 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2 italic">Annual Savings Realized</h2>
              <div className="text-[56px] md:text-[72px] font-black leading-[0.8] tracking-tighter text-slate-900">
                +${Math.round(totalMoneySaved * 12)}<span className="text-[20px] align-top font-sans font-medium ml-1">USD</span>
              </div>
            </div>
            <p className="text-[10px] text-emerald-600 mt-4 uppercase tracking-wider font-extrabold flex items-center gap-1 font-mono">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
              Retrieved from cancelled software
            </p>
          </div>

          {/* Card C: Price increase alerts */}
          <div className={`${activePriceIncreases > 0 ? "bg-[#FECC00] text-[#006AA7]" : "bg-[#00558a] text-white"} p-6 rounded-none flex flex-col justify-between transition`}>
            <div>
              <p className={`text-xs font-black uppercase tracking-widest mb-2 italic ${activePriceIncreases > 0 ? "text-[#006AA7]" : "text-[#FECC00]"}`}>
                Renewal Price Increases
              </p>
              <div className="text-[64px] md:text-[80px] font-black leading-[0.8] tracking-tighter font-mono">
                0{activePriceIncreases}
              </div>
            </div>
            <p className="text-[10px] mt-4 uppercase tracking-wider font-black flex items-center gap-1 font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {activePriceIncreases > 0 ? "AI FLAGGED RATE INCREASES" : "ALL PRICING RATIOS STABLE"}
            </p>
          </div>

          {/* Card D: Google Auth Sync bar */}
          <div className="border-2 border-white/20 p-6 rounded-none flex flex-col justify-between text-white">
            <div>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-2">Cloud Ledger Sync Status</p>
              <div className="text-xl font-black mt-1 tracking-tight uppercase leading-snug">
                {isDemoMode ? "OFFLINE TRIAL" : "SECURED CLOUD"}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/20">
              <div className="text-[9px] uppercase font-mono opacity-60">Synced Mail ID</div>
              <div className="text-[11px] font-mono truncate text-[#FECC00] mt-0.5 select-all">
                {isDemoMode ? "anonymous-playground" : user?.email}
              </div>
            </div>
          </div>

        </div>

        {/* Section 1: AI Radar Scan Box */}
        <RadarScanner 
          accessToken={token} 
          userId={user?.uid || "demo-user"}
          onScanComplete={handleBulkScanReceived}
          onLog={addLog}
        />

        {/* Section 2: Subscriptions Table List */}
        <SubscriptionList
          subscriptions={subscriptions}
          onAddSubscription={handleAddSubscription}
          onUpdateSubscription={handleUpdateSubscription}
          onDeleteSubscription={handleDeleteSubscription}
        />

        {/* Section 3: Interactive Calendar of Payments */}
        <SubscriptionCalendar
          subscriptions={subscriptions}
          accessToken={token}
          onLog={addLog}
        />

        {/* Section 4: Smart Recoms Hub */}
        <InsightsHub
          subscriptions={subscriptions}
          onLog={addLog}
        />

        {/* Section 5: Aveo Premium AI Chat Copilot */}
        <AIPilotChat
          subscriptions={subscriptions}
          onLog={addLog}
        />

      </main>

      {/* System terminal logs at the footer for fun and engagement */}
      <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Column 1: Aveo Vision Credits */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#006AA7] rounded-sm"></span>
                <span className="w-2.5 h-2.5 bg-[#FECC00] rounded-sm"></span>
                <span className="text-xs font-display font-bold text-white tracking-wider">AVEO DIGITAL</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                Aveo Digital is an artificial intelligence company spreading the knowledge and bringing humans and AI together seamlessly. Built to streamline active subscriptions and eliminate licensing overhead.
              </p>
              <p className="text-[10px] text-slate-600">
                &copy; 2026 Aveo Digital Inc. All rights reserved.
              </p>
            </div>

            {/* Column 2: User Resources guides info */}
            <div className="space-y-2">
              <h4 className="text-xs font-display font-bold text-white uppercase tracking-wider">Design Accents</h4>
              <ul className="text-xs text-slate-500 space-y-1">
                <li className="flex items-center gap-1 text-[11px]">
                  <ChevronRight className="w-3 h-3 text-[#FECC00]" />
                  Aesthetic brand contrast pairing (#006AA7 / #FECC00)
                </li>
                <li className="flex items-center gap-1 text-[11px]">
                  <ChevronRight className="w-3 h-3 text-[#FECC00]" />
                  Space Grotesk &amp; JetBrains Typography
                </li>
                <li className="flex items-center gap-1 text-[11px]">
                  <ChevronRight className="w-3 h-3 text-[#FECC00]" />
                  Incremental renewal checking triggers
                </li>
              </ul>
            </div>

            {/* Column 3: Pulse Engine Terminal Log */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-display font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping"></span>
                  Aveo Engine Live Logs
                </h4>
                <span className="text-[9px] font-mono bg-slate-800 text-yellow-300 px-1.5 py-0.5 rounded">
                  System Live
                </span>
              </div>
              
              <div className="bg-slate-900 border border-slate-850 p-3 h-[100px] overflow-y-auto rounded-lg text-[10px] font-mono text-slate-350 space-y-1">
                {systemLogs.length === 0 ? (
                  <div className="text-slate-600 text-center py-6">Terminal log sequence is empty. Idle.</div>
                ) : (
                  systemLogs.map((log, lIdx) => (
                    <div key={lIdx} className="truncate select-all select-none">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </footer>

    </div>
  );
}
