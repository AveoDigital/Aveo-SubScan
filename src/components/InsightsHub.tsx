import { useState, useEffect } from "react";
import { Sparkles, BrainCircuit, ShieldAlert, TrendingDown, ArrowRight, ArrowBigUpDash, Lightbulb, Zap } from "lucide-react";
import { Subscription, GeminiInsights, SavingsTip, AlternativeAppSetup } from "../types";

interface InsightsHubProps {
  subscriptions: Subscription[];
  onLog: (msg: string) => void;
}

export default function InsightsHub({ subscriptions, onLog }: InsightsHubProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<GeminiInsights | null>(null);

  // Load insights whenever subscriptions change
  useEffect(() => {
    // If we have no active subscriptions, don't trigger recommendations
    const activeSubs = subscriptions.filter(s => s.status === "active");
    if (activeSubs.length === 0) {
      setInsights(null);
      return;
    }

    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      onLog("Running Gemini SubOptimizer Analyzer model on your subscription base...");
      
      try {
        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ subscriptions: activeSubs })
        });

        if (!response.ok) {
          throw new Error("Failed to load smart insights");
        }

        const data: GeminiInsights = await response.json();
        setInsights(data);
        onLog(`Gemini SubOptimizer returned ${data.tips.length} tips and ${data.alternatives.length} product alternatives!`);
      } catch (err: any) {
        console.error("Insights Hub error:", err);
        setError("Our server-side SubOptimizer recommendation engine is currently busy. Try again soon!");
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [subscriptions, onLog]);

  // Calculate local basic statistics in case API doesn't run or is loading
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const totalMonthlySpend = activeSubs.reduce((acc, sub) => {
    let amt = sub.amount;
    // conversion approximation to USD
    if (sub.currency === "SEK") amt = amt / 10;
    else if (sub.currency === "EUR") amt = amt * 1.1;
    
    if (sub.billingCycle === "yearly") {
      return acc + (amt / 12);
    } else if (sub.billingCycle === "weekly") {
      return acc + (amt * 4);
    }
    return acc + amt;
  }, 0);

  const priceIncreasesCount = activeSubs.filter((s) => s.priceIncreased).length;
  const totalIncreaseSum = activeSubs.reduce((acc, sub) => {
    if (!sub.priceIncreased) return acc;
    let inc = sub.renewalIncreaseAmount;
    if (sub.currency === "SEK") inc = inc / 10;
    else if (sub.currency === "EUR") inc = inc * 1.1;
    return acc + inc;
  }, 0);

  return (
    <div id="insights-hub-panel" className="bg-white text-slate-900 border-l-8 border-[#FECC00] rounded-none p-6 md:p-8 shadow-md font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[#006AA7] flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-[#006AA7]" />
            AVEO SMART SUBOPTIMIZER™
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Autonomously parsing license redundancies, price hikes, and modern cloud package alternatives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {loading && insights && (
            <span className="flex items-center gap-1.5 text-[10px] bg-[#006AA7]/10 text-[#006AA7] font-black px-3 py-1.5 rounded-none uppercase font-mono tracking-wider animate-pulse border border-[#006AA7]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006AA7] animate-ping"></span>
              OPTIMIZING...
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] bg-[#FECC00] text-[#006AA7] font-black px-3 py-1.5 rounded-none uppercase tracking-widest font-mono">
            Better tomorrow than we were today
          </span>
        </div>
      </div>

      {loading && !insights ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-none border-4 border-slate-100 border-t-[#006AA7] animate-spin"></div>
            <Sparkles className="w-6 h-6 text-[#FECC00] absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="font-sans font-black text-[#006AA7] uppercase tracking-wide mt-4">Running Aveo Digital AI Optimizer...</p>
          <p className="text-[10px] uppercase font-mono text-slate-400 mt-1">Cross-referencing overlapping app licenses and renewal pricing shifts.</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-none flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-black uppercase text-sm text-red-900">Unable to generate AI analysis</p>
            <p className="text-xs text-slate-800 mt-1 font-mono">{error}</p>
          </div>
        </div>
      ) : !insights ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-none bg-slate-50/50">
          <TrendingDown className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="font-sans font-black text-[#006AA7] uppercase tracking-wide mt-3">No active subscription data to optimize</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto uppercase font-mono">
            Once you execute the SubScan Radar or input subscriptions manually, we&apos;ll look for price anomalies, bundles, and cheaper software mergers.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* General abstract text */}
          <div className="bg-[#006AA7] border-l-8 border-[#FECC00] rounded-none p-5 md:p-6 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 bg-[radial-gradient(circle_at_right,rgba(254,204,0,1)_0%,transparent_70%)] pointer-events-none"></div>
            <p className="text-[10px] font-mono font-black tracking-widest text-[#FECC00] uppercase">STRATEGIC HEALTH AUDIT</p>
            <p className="text-base md:text-lg font-bold leading-relaxed font-sans mt-2 italic">
              &ldquo;{insights.analysisText}&rdquo;
            </p>
            <div className="flex gap-4 mt-4 flex-wrap text-xs font-mono">
              <div className="bg-slate-900 text-white px-3 py-1.5 rounded-none border border-slate-700">
                <span className="text-[#FECC00] font-black mr-1 uppercase">ESTIMATED MONTHLY SAVINGS:</span>
                ${Math.round(insights.tips.reduce((acc, t) => acc + t.potentialSavingAmount, 0))} USD / month
              </div>
              {priceIncreasesCount > 0 && (
                <div className="bg-[#FECC00] text-slate-950 font-black px-3 py-1.5 rounded-none border border-yellow-300 uppercase">
                  ⚠️ Price hikes: {priceIncreasesCount} alerts (+${Math.round(totalIncreaseSum)} USD/mo)
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Column A: Actionable Saving Tips (Deduct, negotiate etc) */}
            <div className="space-y-4">
              <h3 className="font-mono font-black text-[#006AA7] text-sm uppercase tracking-widest flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#FECC00] fill-[#FECC00]" />
                Actionable Savings Checklist
              </h3>

              <div className="space-y-3">
                {insights.tips.map((tip, idx) => (
                  <div key={idx} className="border-2 border-slate-100 bg-slate-50 hover:border-[#006AA7]/30 p-4 rounded-none flex items-start gap-3 transition">
                    <div className="p-2 bg-[#FECC00]/25 rounded-none shrink-0 mt-0.5">
                      <TrendingDown className="w-4 h-4 text-[#006AA7]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-sans font-black text-[#006AA7] text-sm uppercase tracking-tight">{tip.title}</span>
                        <div className="bg-emerald-100 text-emerald-800 font-extrabold text-[9px] px-2 py-0.5 rounded-none uppercase tracking-wider shrink-0 font-mono">
                          SAVE {tip.potentialSavingAmount} {tip.currency}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-sans">
                        {tip.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <div className="h-1.5 w-16 bg-slate-200 rounded-none overflow-hidden">
                          <div 
                            className="bg-[#006AA7] h-full"
                            style={{ width: `${tip.confidenceScore * 100}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">
                          {Math.round(tip.confidenceScore * 100)}% confidence rate
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column B: Newer Tech Alternatives & Mergers */}
            <div className="space-y-4">
              <h3 className="font-mono font-black text-[#006AA7] text-sm uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#006AA7]" />
                Modern Technology Combos & Upgrades
              </h3>

              <div className="space-y-3">
                {insights.alternatives.map((alt, idx) => (
                  <div key={idx} className="border-2 border-[#006AA7]/10 bg-slate-50 hover:border-[#006AA7]/30 p-4 rounded-none transition">
                    <div className="flex items-center justify-between gap-2 border-b-2 border-slate-200 pb-2 mb-3">
                      <div className="flex items-center flex-wrap gap-1.5">
                        {alt.currentSetups.map((c, cIdx) => (
                          <span key={cIdx} className="text-[9px] bg-slate-200/80 text-slate-900 font-black px-2 py-0.5 rounded-none font-mono uppercase">
                            {c}
                          </span>
                        ))}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs bg-[#FECC00] text-[#006AA7] font-black px-2 py-0.5 rounded-none uppercase tracking-wider">
                        {alt.recommendedReplacement}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-bold">
                      {alt.replacementDescription}
                    </p>

                    <div className="bg-white border-2 border-slate-100 p-3 rounded-none mt-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-black text-[9px] uppercase tracking-wide font-mono">Tech Advantage:</span>
                        <span className="text-emerald-700 font-black font-mono block">
                          Saves ~${alt.monthlySavings} USD / mo
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 font-mono italic">
                        {alt.techAdvancement}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
