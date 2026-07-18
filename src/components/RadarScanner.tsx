import { useState } from "react";
import { Radar, Sparkles, Database, MailCheck, ShieldCheck, Mail, Info } from "lucide-react";
import { runGmailScan, runSimulatedTemplateScan, SAMPLE_SCAN_TEMPLATES } from "../services/gmail";
import { Subscription } from "../types";

interface RadarScannerProps {
  accessToken: string | null;
  userId: string;
  onScanComplete: (newSubs: Subscription[]) => void;
  onLog: (msg: string) => void;
}

export default function RadarScanner({ accessToken, userId, onScanComplete, onLog }: RadarScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<"gmail" | "demo">("demo");
  const [useTemplates, setUseTemplates] = useState(
    SAMPLE_SCAN_TEMPLATES.map((t) => ({ ...t, selected: true }))
  );
  
  const [scanProgress, setScanProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("");
  const [foundNames, setFoundNames] = useState<string[]>([]);

  const toggleSelectTemplate = (id: string) => {
    setUseTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const selectAllTemplates = (val: boolean) => {
    setUseTemplates((prev) => prev.map((t) => ({ ...t, selected: val })));
  };

  const handleStartScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setFoundNames([]);
    setScanProgress(5);
    setCurrentMessage("Warm up AI parsing engines...");
    onLog("Starting Aveo SubScan parser scan...");

    const handleSubFound = (sub: Subscription) => {
      setFoundNames((prev) => [...prev, `${sub.serviceName} (${sub.amount} ${sub.currency})`]);
      onLog(`Found Subscription: ${sub.serviceName} - ${sub.amount} ${sub.currency}`);
    };

    let scanned: Subscription[] = [];
    if (scanType === "gmail" && accessToken) {
      scanned = await runGmailScan(
        accessToken,
        userId,
        (progress) => {
          setScanProgress(progress.progress);
          setCurrentMessage(progress.message);
        },
        handleSubFound
      );
    } else {
      // Demo template scan using server-side Gemini
      const selectedTpls = useTemplates.filter((t) => t.selected);
      if (selectedTpls.length === 0) {
        setIsScanning(false);
        setCurrentMessage("Please select at least one template document to scan!");
        return;
      }
      scanned = await runSimulatedTemplateScan(
        userId,
        selectedTpls,
        (progress) => {
          setScanProgress(progress.progress);
          setCurrentMessage(progress.message);
        },
        handleSubFound
      );
    }

    setIsScanning(false);
    onScanComplete(scanned);
  };

  return (
    <div id="radar-scanner-panel" className="bg-white text-slate-900 border-l-8 border-[#FECC00] rounded-none p-6 md:p-8 font-sans">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Side: Radar Widget Visual representing "Aveo Digital umbrella" High Contrast Brand Colors */}
        <div className="w-full lg:w-2/5 flex flex-col items-center justify-center bg-[#00558a] p-6 md:p-8 rounded-none border border-white/10 relative overflow-hidden h-[340px]">
          {/* Radar background grid */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(254,204,0,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(254,204,0,0.15)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
          
          {/* Radar Sweeper */}
          <div className="w-48 h-48 rounded-full border-2 border-[#FECC00]/30 flex items-center justify-center relative bg-[#006AA7]/20">
            {/* Pulsing center green/yellow beacon */}
            <div className={`w-3 h-3 rounded-full ${isScanning ? "bg-yellow-300 animate-ping" : "bg-yellow-400"} absolute z-20`}></div>
            <div className={`w-3 h-3 rounded-full ${isScanning ? "bg-yellow-300" : "bg-[#FECC00]"} absolute z-10`}></div>
            
            {/* Sweep radar lines */}
            <div className="w-40 h-40 rounded-full border border-white/20 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border border-white/35"></div>
            </div>

            {/* Sweep overlay */}
            {isScanning && (
              <div className="absolute w-24 h-[2px] bg-gradient-to-r from-transparent to-yellow-300 origin-left left-1/2 top-1/2 animate-radar-sweep transform -translate-y-1/2"></div>
            )}

            {/* Simulated targets indicator on radar sweep */}
            {foundNames.length > 0 && isScanning && (
              <div className="absolute top-12 right-12 w-2.5 h-2.5 rounded-full bg-yellow-300 animate-pulse"></div>
            )}
            {foundNames.length > 1 && isScanning && (
              <div className="absolute bottom-16 left-10 w-2.5 h-2.5 rounded-full bg-yellow-300 animate-pulse"></div>
            )}
          </div>

          <div className="mt-6 text-center z-10">
            <p className="text-[#FECC00] font-mono font-black text-xs tracking-widest uppercase">AVEO SUBSCAN RADAR V1.5</p>
            <p className="text-blue-100 text-[10px] uppercase font-bold mt-1 tracking-wider">
              {isScanning ? "ACTIVE SCAN SWEEPS..." : "SCANNER ACTIVE. STANDBY."}
            </p>
          </div>

          {/* Core progress bar overlay */}
          {isScanning && (
            <div className="absolute bottom-0 left-0 w-full h-2 bg-[#006AA7]">
              <div 
                className="h-full bg-[#FECC00] transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Right Side: Configuration & Scan Activator */}
        <div className="w-full lg:w-3/5 flex flex-col justify-between h-full min-h-[340px]">
          <div>
            <h2 className="text-3xl font-black italic tracking-tighter text-[#006AA7] uppercase flex items-center gap-2">
              <Radar className="w-6 h-6 text-[#006AA7]" />
              AI SCANNER RADAR
            </h2>
            <p className="text-[#006AA7] text-xs font-bold tracking-wider uppercase mt-1">
              AUTOMATED COMPLIANCE PROTOCOL
            </p>
            <p className="text-slate-600 text-xs leading-relaxed mt-3">
              Checks real email receipts and logs subscription amounts under secure directives. We inspect for silent <strong className="text-slate-900 font-bold underline decoration-[#FECC00] decoration-2">price renewal increments</strong> ahead of automatic bank cycles.
            </p>

            {/* Select Scan Type */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                id="btn-scan-type-demo"
                onClick={() => setScanType("demo")}
                disabled={isScanning}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-none border-2 text-xs font-black uppercase tracking-wide transition cursor-pointer ${
                  scanType === "demo"
                    ? "bg-[#006AA7] text-white border-[#006AA7]"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Database className="w-4 h-4" />
                Aveo AI Demo Set
              </button>
              
              <button
                id="btn-scan-type-gmail"
                onClick={() => {
                  if (!accessToken) {
                    onLog("Click Sign In below to scan live Gmail, fallback to Demo.");
                  }
                  setScanType("gmail");
                }}
                disabled={isScanning}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-none border-2 text-xs font-black uppercase tracking-wide transition cursor-pointer ${
                  scanType === "gmail"
                    ? "bg-[#006AA7] text-white border-[#006AA7]"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                } ${!accessToken ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <Mail className="w-4 h-4" />
                Live Gmail Scan
                {!accessToken && <span className="text-[9px] bg-slate-200 text-slate-700 px-1 py-0.5 rounded ml-1 font-mono">LOCKED</span>}
              </button>
            </div>

            {/* Inline template controls for demo set scan */}
            {scanType === "demo" && (
              <div className="mt-4 border-2 border-[#006AA7]/10 rounded-none p-3 bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Select Demo Bills to Optimize:</span>
                  <div className="space-x-2">
                    <button 
                      onClick={() => selectAllTemplates(true)}
                      disabled={isScanning}
                      className="text-[11px] text-[#006AA7] hover:underline font-extrabold uppercase"
                    >
                      All
                    </button>
                    <span className="text-slate-300 text-[10px]">|</span>
                    <button 
                      onClick={() => selectAllTemplates(false)}
                      disabled={isScanning}
                      className="text-[11px] text-slate-500 hover:underline font-extrabold uppercase"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 font-mono">
                  {useTemplates.map((tpl) => (
                    <label 
                      key={tpl.id} 
                      className={`flex items-center gap-2.5 p-2 rounded-none border text-xs cursor-pointer select-none transition ${
                        tpl.selected 
                          ? "bg-white border-2 border-[#006AA7] text-slate-900"
                          : "bg-white border-slate-100 text-slate-400"
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={tpl.selected}
                        disabled={isScanning}
                        onChange={() => toggleSelectTemplate(tpl.id)}
                        className="rounded-none border-slate-300 text-[#006AA7] focus:ring-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate text-slate-800">{tpl.subject}</div>
                        <div className="text-[9px] opacity-70 capitalize truncate">Sender: {tpl.sender}</div>
                      </div>
                      {tpl.subject.includes("increase") && (
                        <span className="bg-[#FECC00] text-[#006AA7] font-black px-1 rounded text-[8px] uppercase tracking-wider shrink-0">
                          SPIKE WARN
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {scanType === "gmail" && !accessToken && (
              <div className="mt-4 flex items-start gap-2 bg-slate-50 border-2 border-[#FECC00] p-3 rounded-none text-slate-800 text-xs">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#006AA7]" />
                <div>
                  <p className="font-black text-[#006AA7] uppercase tracking-wide">OAuth Access Blocked</p>
                  <p className="mt-0.5 text-slate-600">
                    To connect live scanning, complete the <strong>Connect Gmail Log</strong> protocol in the navbar first.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            {/* Scan Progress Indicator message */}
            {isScanning ? (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-700 font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#006AA7] animate-spin" />
                    {currentMessage}
                  </span>
                  <span className="font-mono">{scanProgress}%</span>
                </div>
                {foundNames.length > 0 && (
                  <div className="text-[10px] font-mono bg-[#006AA7]/5 border border-slate-200 p-2 rounded-none text-slate-700 max-h-[60px] overflow-y-auto">
                    <span className="font-bold text-[#006AA7]">Ingested:</span> {foundNames.join(", ")}
                  </div>
                )}
              </div>
            ) : (
              currentMessage && (
                <div className="mb-3 text-xs bg-slate-50 border-2 border-[#006AA7] p-2.5 rounded-none text-slate-800 flex items-center gap-2">
                  <MailCheck className="w-4 h-4 text-emerald-600" />
                  <span className="flex-1 font-bold">{currentMessage}</span>
                </div>
              )
            )}

            <button
              id="btn-trigger-scan"
              onClick={handleStartScan}
              disabled={isScanning || (scanType === "gmail" && !accessToken)}
              className={`w-full py-3 rounded-none font-sans font-black uppercase text-center text-xs tracking-wider transition relative overflow-hidden flex items-center justify-center gap-2 cursor-pointer ${
                isScanning
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  : scanType === "gmail" && !accessToken
                  ? "bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed"
                  : "bg-[#006AA7] text-white hover:bg-[#00558a] active:translate-y-0.5 border-b-4 border-[#00446f] shadow-md"
              }`}
            >
              {isScanning ? (
                <>
                  <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  Scan in Progress...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  Execute Subscription Swear Radar
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[9px] uppercase tracking-wider text-slate-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#006AA7]" />
              Directives fully compliant with Aveo Secure Digital Encryption protocols.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
