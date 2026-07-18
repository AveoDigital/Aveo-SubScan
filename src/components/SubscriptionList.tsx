import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Edit, Trash2, ShieldAlert, Sparkles, Check, 
  X, Calendar, Ban, HelpCircle, ArrowLeft, Send, Download
} from "lucide-react";
import { Subscription } from "../types";

// Helper to calculate days remaining
const getDaysRemaining = (dateStr: string): number => {
  if (!dateStr) return Infinity;
  const [year, month, day] = dateStr.split("-").map(Number);
  const paymentDate = new Date(year, month - 1, day);
  paymentDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = paymentDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

interface SubscriptionListProps {
  subscriptions: Subscription[];
  onAddSubscription: (sub: Subscription) => void;
  onUpdateSubscription: (sub: Subscription) => void;
  onDeleteSubscription: (id: string) => void;
}

export default function SubscriptionList({ 
  subscriptions, 
  onAddSubscription, 
  onUpdateSubscription, 
  onDeleteSubscription 
}: SubscriptionListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeCancellingSub, setActiveCancellingSub] = useState<Subscription | null>(null);

  const exportToCSV = () => {
    if (subscriptions.length === 0) {
      alert("No active subscription records found to export!");
      return;
    }
    const headers = ["Service Name", "Amount", "Currency", "Billing Cycle", "Next Renewal Date", "Category", "Data Source", "Status", "Notes/Audit"];
    const rows = subscriptions.map(sub => [
      `"${sub.serviceName.replace(/"/g, '""')}"`,
      sub.amount,
      `"${sub.currency}"`,
      `"${sub.billingCycle}"`,
      `"${sub.nextPaymentDate}"`,
      `"${sub.category}"`,
      `"${sub.source}"`,
      `"${sub.status}"`,
      `"${(sub.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aveo_digital_subscriptions_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Form fields
  const [serviceName, setServiceName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("SEK");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [nextPaymentDate, setNextPaymentDate] = useState("");
  const [category, setCategory] = useState("Stream");
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [priceIncreased, setPriceIncreased] = useState(false);
  const [renewalIncreaseAmount, setRenewalIncreaseAmount] = useState("");
  const [previousPrice, setPreviousPrice] = useState("");
  const [notes, setNotes] = useState("");

  // Track which subscriptions have already triggered an alert in this session
  const alertedSubsRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    subscriptions.forEach((sub) => {
      if (sub.alertEnabled && sub.status === "active") {
        const key = sub.id || `${sub.serviceName}-${sub.nextPaymentDate}`;
        if (!alertedSubsRef.current[key]) {
          const days = getDaysRemaining(sub.nextPaymentDate);
          if (days >= 0 && days <= 3) {
            alertedSubsRef.current[key] = true;
            try {
              alert(`🔔 Renewal Warning!\nYour subscription to "${sub.serviceName}" is renewing in ${days} days on ${sub.nextPaymentDate} (${sub.amount} ${sub.currency}).`);
            } catch (e) {
              console.warn("Browser blocked the iframe alert:", e);
            }
          }
        }
      }
    });
  }, [subscriptions]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName || !amount || !nextPaymentDate) {
      alert("Please fill in key subscription details (Name, Price, and Next Billing Date)!");
      return;
    }

    const newSub: Subscription = {
      userId: "demo-user", // Shared auth handler binds this correctly in root App
      serviceName,
      amount: parseFloat(amount),
      currency,
      billingCycle,
      nextPaymentDate,
      alertEnabled,
      priceIncreased,
      renewalIncreaseAmount: priceIncreased ? parseFloat(renewalIncreaseAmount || "0") : 0,
      previousPrice: priceIncreased ? parseFloat(previousPrice || "0") : 0,
      category,
      source: "manual",
      status: "active",
      notes
    };

    onAddSubscription(newSub);
    resetForm();
  };

  const resetForm = () => {
    setShowAddForm(false);
    setServiceName("");
    setAmount("");
    setCurrency("USD");
    setBillingCycle("monthly");
    setNextPaymentDate("");
    setCategory("Stream");
    setAlertEnabled(true);
    setPriceIncreased(false);
    setRenewalIncreaseAmount("");
    setPreviousPrice("");
    setNotes("");
  };

  // Generate cancellation email template utilizing Aveo Digital values
  const getCancellationDraft = (sub: Subscription) => {
    return `Subject: Cancellation Request for My ${sub.serviceName} Subscription

Hello Customer Support,

I would like to request the immediate cancellation of my account and subscription to ${sub.serviceName}. 

I am currently organizing my family budgets and digital utilities to simplify my life, and I have decided to discontinue my usage of this service. 

Subscription details:
• Registered Email: [Your Account Email]
• Billing Amount: ${sub.amount} ${sub.currency}
• Renewal Cycle: ${sub.billingCycle}
• Next Scheduled Renewal: ${sub.nextPaymentDate}

Please confirm via email once my contract is successfully terminated and that no future automatic bank recurring billing will occur. 

Thank you for your service and support, and I wish your team a successful future.

Best regards,
[Your Digital Signature Name]`;
  };

  const toggleSubscriptionStatus = (sub: Subscription) => {
    const updatedStatus = sub.status === "active" ? "cancelled" : "active";
    onUpdateSubscription({
      ...sub,
      status: updatedStatus
    });
  };

  const toggleAlert = (sub: Subscription) => {
    const nextEnabled = !sub.alertEnabled;
    onUpdateSubscription({
      ...sub,
      alertEnabled: nextEnabled
    });

    if (nextEnabled && sub.status === "active") {
      const days = getDaysRemaining(sub.nextPaymentDate);
      if (days >= 0 && days <= 3) {
        // Mark as alerted in ref to avoid double-triggering on render right after
        const key = sub.id || `${sub.serviceName}-${sub.nextPaymentDate}`;
        alertedSubsRef.current[key] = true;
        try {
          alert(`🔔 Renewal Warning!\nYour subscription to "${sub.serviceName}" is renewing in ${days} days on ${sub.nextPaymentDate} (${sub.amount} ${sub.currency}).`);
        } catch (e) {
          console.warn("Browser blocked the iframe alert:", e);
        }
      }
    }
  };

  return (
    <div id="subscription-list-section" className="bg-white text-slate-900 border-l-8 border-[#FECC00] rounded-none p-6 shadow-md font-sans">
      
      {/* Detail Overlay of Cancel Assistant */}
      {activeCancellingSub ? (
        <div className="bg-slate-50 border-2 border-slate-200 rounded-none p-5 md:p-6">
          <button 
            id="btn-cancel-assistant-back"
            onClick={() => setActiveCancellingSub(null)}
            className="flex items-center gap-1 text-xs text-[#006AA7] font-black uppercase hover:underline mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Subscriptions Table
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-slate-200 pb-4 mb-4">
            <div>
              <span className="bg-[#FECC00] text-[#006AA7] px-2.5 py-0.5 rounded-none text-[10px] font-black uppercase tracking-wider">
                Aveo Cancellation Assistant
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase italic tracking-tight">
                OPTIMIZED CANCELLATION: {activeCancellingSub.serviceName}
              </h3>
              <p className="text-xs text-slate-500">
                Actionable step-by-step guidance to instantly terminate unneeded overhead.
              </p>
            </div>

            <div className="bg-[#006AA7] text-white rounded-none px-4 py-2 font-mono font-black text-sm">
              Potential Savings: +{activeCancellingSub.amount} {activeCancellingSub.currency} / {activeCancellingSub.billingCycle}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#006AA7]" />
                Recommended Protocol Steps
              </h4>
              <ol className="space-y-4 text-xs text-slate-700">
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-none bg-[#006AA7] text-white font-mono font-bold flex items-center justify-center shrink-0">1</span>
                  <span>
                    Open developer web portal settings directly at <strong>{activeCancellingSub.serviceName}.com</strong> rather than using mobile device sub-settings pools (which commonly stall).
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-none bg-[#006AA7] text-white font-mono font-bold flex items-center justify-center shrink-0">2</span>
                  <span>
                    Navigate to <strong>&quot;Billing&quot;</strong>, <strong>&quot;Manage Subscription&quot;</strong>, or <strong>&quot;Plan Details&quot;</strong> tab panels.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-none bg-[#006AA7] text-white font-mono font-bold flex items-center justify-center shrink-0">3</span>
                  <span>
                    Initiate <strong>&quot;Cancel Plan&quot;</strong> or <strong>&quot;Downgrade&quot;</strong>. (Steer past standard multi-step modal prompts attempting to lock you in).
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-none bg-[#006AA7] text-white font-mono font-bold flex items-center justify-center shrink-0">4</span>
                  <span>
                    Copy the pre-configured AI termination mail script on the right side if direct self-serve cancel endpoints are hidden.
                  </span>
                </li>
              </ol>

              <div className="mt-8">
                <button
                  id="btn-mark-cancelled"
                  onClick={() => {
                    toggleSubscriptionStatus(activeCancellingSub);
                    setActiveCancellingSub(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-black uppercase text-xs py-3 px-5 rounded-none border-b-4 border-emerald-800 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Confirm Cancellation & Update Savings
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-[#006AA7]" />
                AI-drafted Termination Letter (Copy & Paste)
              </h4>
              <textarea
                readOnly
                className="w-full text-xs font-mono p-3 bg-white border-2 border-slate-200 rounded-none max-h-[220px] focus:outline-none min-h-[180px]"
                value={getCancellationDraft(activeCancellingSub)}
              />
              <button
                id="btn-copy-template"
                onClick={() => {
                  navigator.clipboard.writeText(getCancellationDraft(activeCancellingSub));
                  alert("Copied to clipboard!");
                }}
                className="mt-2 text-[10px] bg-[#006AA7] border-2 border-[#006AA7] text-white font-black uppercase tracking-wider hover:bg-slate-900 hover:border-slate-900 px-4 py-2 rounded-none cursor-pointer transition"
              >
                Copy Draft Letter
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[#006AA7]">
                Tracked Subscriptions Ledger
              </h2>
              <p className="text-slate-500 text-xs">
                Review automated mail feeds, manage thresholds, and toggle quick cancel templates instantaneously.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                id="btn-export-csv"
                onClick={exportToCSV}
                className="px-4 py-2.5 border-2 border-[#FECC00] bg-[#FECC00] hover:bg-[#FECC00]/90 text-[#006AA7] font-sans font-black uppercase text-xs rounded-none transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV Sheet
              </button>
              
              <button
                id="btn-toggle-add-form"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2.5 border-2 border-[#006AA7] text-[#006AA7] font-sans font-black uppercase text-xs rounded-none hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Manual Input
              </button>
            </div>
          </div>

          {/* Add Form Accordion */}
          {showAddForm && (
            <form onSubmit={handleCreate} className="bg-slate-50 border-2 border-slate-200 p-6 rounded-none mb-6 space-y-4">
              <h3 className="text-slate-900 text-xs font-black uppercase tracking-wider">Add New Manual Subscription</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Service Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Adobe Creative Cloud, Hulu"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border-2 border-slate-200 rounded-none focus:border-[#006AA7]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Billing Amount *</label>
                  <div className="flex">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 129"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border-2 border-r-0 border-slate-200 rounded-none focus:border-[#006AA7]"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="text-xs p-2.5 bg-slate-100 border-2 border-slate-200 rounded-none font-mono"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="SEK">SEK (kr)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Billing Interval</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border-2 border-slate-200 rounded-none focus:border-[#006AA7]"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="weekly">Weekly</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Next Billing Date *</label>
                  <input
                    type="date"
                    required
                    value={nextPaymentDate}
                    onChange={(e) => setNextPaymentDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border-2 border-slate-200 rounded-none focus:border-[#006AA7]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Software Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border-2 border-slate-200 rounded-none focus:border-[#006AA7]"
                  >
                    <option value="Stream">Stream/Video</option>
                    <option value="Productivity">Productivity</option>
                    <option value="Utility">Cloud / Utility</option>
                    <option value="Entertainment">Gaming / Entertainment</option>
                    <option value="Finance">Finance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5 select-none">
                  <input
                    type="checkbox"
                    id="checkbox-price-increase"
                    checked={priceIncreased}
                    onChange={(e) => setPriceIncreased(e.target.checked)}
                    className="rounded-none border-2 border-slate-300 text-[#006AA7] focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="checkbox-price-increase" className="text-xs font-black text-slate-700 cursor-pointer uppercase tracking-wider">
                    Flag Renewal Price Hike
                  </label>
                </div>
              </div>

              {priceIncreased && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#FECC00]/10 p-4 border-2 border-[#FECC00] rounded-none">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-800 mb-1">Renewal Price Increase Amount</label>
                    <input
                      type="number"
                      placeholder="Amount price is increasing by"
                      value={renewalIncreaseAmount}
                      onChange={(e) => setRenewalIncreaseAmount(e.target.value)}
                      className="w-full text-xs p-2 bg-white border-2 border-slate-200 rounded-none focus:border-[#006AA7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-800 mb-1">Previous Price Before Hack</label>
                    <input
                      type="number"
                      placeholder="Former historical cost"
                      value={previousPrice}
                      onChange={(e) => setPreviousPrice(e.target.value)}
                      className="w-full text-xs p-2 bg-white border-2 border-slate-200 rounded-none focus:border-[#006AA7]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Optional Scan Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Billed to credit card ending #4242"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border-2 border-slate-200 rounded-none focus:border-[#006AA7]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border-2 border-slate-200 text-slate-700 font-sans font-black uppercase text-xs rounded-none hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#006AA7] hover:bg-[#00558a] text-white font-sans font-black uppercase text-xs rounded-none transition cursor-pointer"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          )}

          {subscriptions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-none">
              <p className="text-slate-500 font-black uppercase text-xs tracking-wider">Your Subscription ledger is empty.</p>
              <p className="text-slate-400 text-xs mt-1 font-mono">Run the Aveo SubScan Radar above to populate database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-[10px] text-slate-500 font-black tracking-widest uppercase">
                    <th className="pb-3 text-[#006AA7]">SERVICE</th>
                    <th className="pb-3 text-[#006AA7]">CATEGORY</th>
                    <th className="pb-3 text-[#006AA7]">COST</th>
                    <th className="pb-3 text-[#006AA7]">NEXT RENEWAL</th>
                    <th className="pb-3 text-[#006AA7]">STATUS</th>
                    <th className="pb-3 text-[#006AA7]">ALERTS</th>
                    <th className="pb-3 text-right text-[#006AA7]">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {subscriptions.map((sub, idx) => {
                    const isCancelled = sub.status === "cancelled";
                    return (
                      <tr key={sub.id || idx} className={`hover:bg-slate-50 transition ${isCancelled ? "opacity-50" : ""}`}>
                        {/* Service block & price increase warning badge */}
                        <td className="py-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black">{sub.serviceName}</span>
                            {sub.priceIncreased && (
                              <span className="flex items-center gap-0.5 text-[8px] bg-[#FECC00] text-[#006AA7] border border-transparent font-black px-1.5 py-0.5 rounded-none uppercase tracking-wider animate-pulse">
                                <ShieldAlert className="w-2.5 h-2.5" />
                                +{sub.renewalIncreaseAmount} renewal Spike
                              </span>
                            )}
                          </div>
                          {sub.source === "gmail" && (
                            <span className="text-[9px] text-slate-400 block font-normal mt-0.5 font-mono">Synced &bull; Mail Feed</span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-4 font-mono">
                          <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 text-[9px] uppercase tracking-wider">
                            {sub.category}
                          </span>
                        </td>

                        {/* Cost */}
                        <td className="py-4 text-base font-black text-[#006AA7] font-mono">
                          {sub.currency === "USD" ? "$" : ""}{sub.amount}{sub.currency !== "USD" ? ` ${sub.currency}` : ""} <span className="text-[10px] uppercase font-mono text-slate-400">/ {sub.billingCycle}</span>
                        </td>

                        {/* Renewal Date */}
                        <td className="py-4 text-slate-600 font-mono">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{sub.nextPaymentDate}</span>
                            </div>
                            {sub.alertEnabled && sub.status === "active" && (() => {
                              const days = getDaysRemaining(sub.nextPaymentDate);
                              if (days >= 0 && days <= 3) {
                                return (
                                  <span className="inline-flex items-center gap-0.5 text-[8px] bg-red-100 text-red-800 border border-red-300 font-black px-1.5 py-0.5 rounded-none uppercase tracking-wider animate-pulse max-w-max">
                                    <ShieldAlert className="w-2.5 h-2.5 text-red-700" />
                                    Due in {days} days!
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-4">
                          <button
                            id={`btn-toggle-status-${sub.id || idx}`}
                            onClick={() => toggleSubscriptionStatus(sub)}
                            className={`px-3 py-1 rounded-none text-[9px] font-black uppercase tracking-wider transition border-2 cursor-pointer ${
                              isCancelled 
                                ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100" 
                                : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                            }`}
                          >
                            {sub.status || "active"}
                          </button>
                        </td>

                        {/* Alarm Enabled toggle */}
                        <td className="py-4">
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={sub.alertEnabled}
                              onChange={() => toggleAlert(sub)}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-slate-200 rounded-none peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-none after:h-3 after:w-3 after:transition-all peer-checked:bg-[#006AA7]"></div>
                            <span className="ml-1.5 text-[9px] text-slate-400 font-black select-none uppercase tracking-widest">
                              {sub.alertEnabled ? "On" : "Off"}
                            </span>
                          </label>
                        </td>

                        {/* Action buttons (Cancellation & Trash) */}
                        <td className="py-4 text-right space-x-2">
                          {!isCancelled && (
                            <button
                              id={`btn-kick-cancellation-${sub.id || idx}`}
                              onClick={() => setActiveCancellingSub(sub)}
                              className="px-3 py-1 text-[9px] bg-[#FECC00] text-[#006AA7] font-black uppercase tracking-wider rounded-none border border-transparent shadow hover:bg-yellow-400 transition cursor-pointer"
                              title="Organize Cancellation Guide"
                            >
                              How to Cancel
                            </button>
                          )}

                          <button
                            id={`btn-delete-sub-${sub.id || idx}`}
                            onClick={() => sub.id && onDeleteSubscription(sub.id)}
                            className="p-1.5 hover:bg-slate-100 rounded-none text-slate-400 hover:text-red-500 transition cursor-pointer inline-flex items-center"
                            title="Delete Ledger Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
