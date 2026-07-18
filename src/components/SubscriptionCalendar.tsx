import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Bell, CalendarPlus, Check, AlertTriangle } from "lucide-react";
import { Subscription } from "../types";
import { addSubscriptionToCalendar } from "../services/calendar";

interface SubscriptionCalendarProps {
  subscriptions: Subscription[];
  accessToken: string | null;
  onLog: (msg: string) => void;
}

export default function SubscriptionCalendar({ subscriptions, accessToken, onLog }: SubscriptionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 16)); // June 2026 based on metadata
  const [syncStates, setSyncStates] = useState<{ [subId: string]: "idle" | "syncing" | "synced" | "error" }>({});
  const [selectedDaySubs, setSelectedDaySubs] = useState<Subscription[]>([]);
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Calendar calculations
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sun=0, Mon=1, etc.
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setActiveDay(null);
    setSelectedDaySubs([]);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setActiveDay(null);
    setSelectedDaySubs([]);
  };

  // Helper to get active events on a specific day of the current month
  const getSubsForDay = (dayNum: number): Subscription[] => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    return subscriptions.filter(
      (sub) => sub.status === "active" && sub.nextPaymentDate === formattedDate
    );
  };

  const handleDaySelect = (dayNum: number) => {
    const daySubs = getSubsForDay(dayNum);
    setActiveDay(dayNum);
    setSelectedDaySubs(daySubs);
  };

  const handleSyncToGoogle = async (sub: Subscription) => {
    if (!sub.id) return;
    if (!accessToken) {
      onLog("Failed calendar sync: Needs Google OAuth connection. Connect in navbar.");
      alert("Please authenticate using the 'Sign in with Google' button in the header first!");
      return;
    }

    setSyncStates((prev) => ({ ...prev, [sub.id!]: "syncing" }));
    onLog(`Pushing subscription reminder to Google Calendar: ${sub.serviceName}...`);

    const result = await addSubscriptionToCalendar(accessToken, sub);

    if (result.success) {
      setSyncStates((prev) => ({ ...prev, [sub.id!]: "synced" }));
      onLog(`Google Calendar synchronized event successfully for ${sub.serviceName}!`);
    } else {
      setSyncStates((prev) => ({ ...prev, [sub.id!]: "error" }));
      onLog(`Calendar Synchronization failed: ${result.error}`);
      alert(`Could not synchronize to your Google Calendar: ${result.error}`);
    }
  };

  // Generate calendar cells (padding previous month days + current month days + next month days)
  const cells: { dayNum: number; isCurrentMonth: boolean; hasSubs: boolean; count: number; subs: Subscription[] }[] = [];

  // Previous month days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({
      dayNum: prevMonthTotalDays - i,
      isCurrentMonth: false,
      hasSubs: false,
      count: 0,
      subs: []
    });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const daySubs = getSubsForDay(d);
    cells.push({
      dayNum: d,
      isCurrentMonth: true,
      hasSubs: daySubs.length > 0,
      count: daySubs.length,
      subs: daySubs
    });
  }

  // Next month padding days to fill 7x6 grid
  const remainingCells = 42 - cells.length;
  for (let n = 1; n <= remainingCells; n++) {
    cells.push({
      dayNum: n,
      isCurrentMonth: false,
      hasSubs: false,
      count: 0,
      subs: []
    });
  }

  return (
    <div id="subscription-calendar-section" className="bg-white text-slate-900 border-l-8 border-[#FECC00] rounded-none p-6 shadow-md font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[#006AA7] flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-[#006AA7]" />
            AVEO RENEWAL CALENDAR
          </h2>
          <p className="text-slate-500 text-xs">
            Pinpoint exact renewal bank cycles. Click active dates to trigger real Google Calendar alerts.
          </p>
        </div>

        {/* Date Month Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-none border-2 border-slate-200">
          <button 
            id="btn-calendar-prev"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-none hover:bg-white text-slate-600 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black uppercase tracking-wider text-[#006AA7] min-w-[120px] text-center font-mono">
            {monthNames[month]} {year}
          </span>
          <button 
            id="btn-calendar-next"
            onClick={handleNextMonth}
            className="p-1.5 rounded-none hover:bg-white text-slate-600 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle: Calendar Grid (2 Cols wide on desktop) */}
        <div className="lg:col-span-2">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center font-mono text-[9px] font-black text-slate-400 pb-3 border-b-2 border-slate-200 uppercase tracking-widest">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 mt-2">
            {cells.map((cell, idx) => {
              const isToday = cell.isCurrentMonth && cell.dayNum === 16 && month === 5 && year === 2026; // June 16, 2026 based on mock clock
              const isSelected = cell.isCurrentMonth && cell.dayNum === activeDay;
              const hasIncrease = cell.subs.some((s) => s.priceIncreased);

              return (
                <div
                  key={idx}
                  onClick={() => cell.isCurrentMonth && handleDaySelect(cell.dayNum)}
                  className={`min-h-[64px] md:min-h-[76px] p-2 rounded-none border transition cursor-pointer relative flex flex-col justify-between ${
                    cell.isCurrentMonth
                      ? isSelected
                        ? "bg-[#006AA7] text-white border-[#006AA7] shadow-md transform scale-[1.01]"
                        : isToday
                        ? "bg-[#FECC00]/25 border-2 border-[#FECC00] text-[#006AA7] shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100"
                      : "bg-white border-none text-slate-200 pointer-events-none"
                  }`}
                >
                  {/* Day Number Label */}
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-black font-mono ${isToday && !isSelected ? "text-slate-900" : ""}`}>
                      {cell.dayNum}
                    </span>
                    {isToday && !isSelected && (
                      <span className="bg-[#FECC00] text-[#006AA7] font-black px-1 text-[8px] uppercase tracking-wider">Today</span>
                    )}
                  </div>

                  {/* Indicators representing subscription payment alerts */}
                  {cell.hasSubs && (
                    <div className="flex flex-col gap-1">
                      {/* Subscription Badges inside cell */}
                      <div className="flex flex-wrap gap-0.5 max-h-[30px] overflow-hidden">
                        {cell.subs.map((sub, sIdx) => (
                          <div 
                            key={sIdx}
                            className={`h-1.5 rounded-none ${
                              sub.priceIncreased
                                ? isSelected ? "bg-[#FECC00] w-full" : "bg-[#FECC00] w-full animate-pulse" 
                                : isSelected ? "bg-white w-2" : "bg-[#006AA7] w-2"
                            }`}
                            title={`${sub.serviceName}: ${sub.amount} ${sub.currency}`}
                          />
                        ))}
                      </div>

                      {/* Summary Text */}
                      <span className={`text-[8px] uppercase tracking-wide font-bold font-mono truncate ${isSelected ? "text-[#FECC00]" : "text-[#006AA7]"}`}>
                        {cell.count === 1 
                          ? cell.subs[0].serviceName 
                          : `${cell.count} bills`}
                      </span>
                    </div>
                  )}

                  {/* Flag Price Increase alert inside cell */}
                  {hasIncrease && cell.isCurrentMonth && !isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-none bg-[#FECC00] border border-white" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Day Event Detail & Calendar Synchronization */}
        <div className="lg:col-span-1 bg-slate-50 border-2 border-[#006AA7]/15 rounded-none p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="p-2 bg-[#006AA7]/10 rounded-none border border-[#006AA7]/20">
                <Bell className="w-4 h-4 text-[#006AA7]" />
              </span>
              <div>
                <h3 className="font-sans font-black text-xs text-[#006AA7] uppercase tracking-widest">
                  {activeDay 
                    ? `Renewals: June ${activeDay}` 
                    : "Select renewal date"}
                </h3>
                <p className="text-[10px] uppercase font-mono text-slate-500 mt-0.5">
                  {activeDay 
                    ? `${selectedDaySubs.length} active bills synced` 
                    : "Tap highlighted cells below"}
                </p>
              </div>
            </div>

            {selectedDaySubs.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-none bg-white">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-500 mt-2">No Scheduled Items</p>
                <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-mono">Tap active cell markers to trigger alert links.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {selectedDaySubs.map((sub, idx) => {
                  const sState = syncStates[sub.id!] || "idle";

                  return (
                    <div 
                      key={idx} 
                      className="bg-white border-2 border-slate-100 p-4 rounded-none shadow-sm hover:border-[#006AA7]/30 transition"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900">{sub.serviceName}</span>
                            <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-none capitalize uppercase font-mono">
                              {sub.category}
                            </span>
                          </div>
                          
                          <div className="text-xl font-black text-[#006AA7] mt-1 font-mono">
                            {sub.currency === "USD" ? "$" : ""}{sub.amount} <span className="text-sm">{sub.currency !== "USD" && sub.currency}</span>
                            <span className="text-slate-400 text-xs font-medium lowercase"> / {sub.billingCycle}</span>
                          </div>
                        </div>

                        {sub.priceIncreased && (
                          <div className="bg-[#FECC00]/20 border border-[#FECC00] rounded-none p-1.5 flex items-center gap-1.5 max-w-[140px]">
                            <AlertTriangle className="w-4 h-4 text-[#006AA7] shrink-0" />
                            <div className="text-left font-mono">
                              <span className="block text-[8px] font-black uppercase tracking-tight text-amber-900">PRICE INCR!</span>
                              <span className="block text-[10px] font-bold text-slate-950">+{sub.currency === "USD" ? "$" : ""}{sub.renewalIncreaseAmount}{sub.currency !== "USD" ? ` ${sub.currency}` : ""}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {sub.notes && (
                        <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-none border border-slate-100 mt-2 font-mono italic">
                          {sub.notes}
                        </p>
                      )}

                      {/* Google Calendar sync action */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono uppercase font-bold">
                          <Check className="w-3.5 h-3.5 text-[#006AA7]" />
                          24h pre-alert
                        </span>

                        <button
                          id={`btn-sync-sub-${sub.id}`}
                          onClick={() => handleSyncToGoogle(sub)}
                          disabled={sState === "syncing" || sState === "synced"}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-none font-sans font-black uppercase text-[10px] transition cursor-pointer tracking-wide ${
                            sState === "synced"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : sState === "syncing"
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-[#006AA7] text-white hover:bg-[#00558a] active:translate-y-0.5"
                          }`}
                        >
                          {sState === "synced" ? (
                            <>
                              <Check className="w-3 h-3" />
                              Synced App
                            </>
                          ) : sState === "syncing" ? (
                            <>
                              <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                              Syncing...
                            </>
                          ) : (
                            <>
                              <CalendarPlus className="w-3.5 h-3.5 text-[#FECC00]" />
                              Sync Calendar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sync All button footer */}
          {selectedDaySubs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[9px] text-center text-slate-400 uppercase tracking-widest font-mono font-bold">
                Direct integration synced with real calendar
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
