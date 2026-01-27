
import React, { useState, useEffect, useMemo } from 'react';
import { StockMetrics, PeerData, AIAnalysisResult, AnalisaInput, DeepAnalysisResult, PublicCompanyData } from './types';
import { analyzeFundamentalAI, fetchPublicStockData, runDeepAnalisa } from './services/geminiService';
import { getBrokerInfo } from './services/brokerLogic';

// --- MODERN UI COMPONENTS (LIGHT MODE) ---

// 1. Clean Section Header
const SectionHeader: React.FC<{ title: string; subtitle?: string; accent?: string }> = ({ title, subtitle, accent = "indigo" }) => (
  <div className="mb-5 flex flex-col gap-1">
    <h3 className={`text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-${accent}-600`}></span>
      {title}
    </h3>
    {subtitle && <p className="text-[10px] text-slate-500 ml-3.5 font-medium">{subtitle}</p>}
  </div>
);

// 2. Minimalist Input Group (Light Theme)
const InputGroup: React.FC<{ 
  label: string; 
  value: number; 
  onChange: (v: number) => void; 
  placeholder?: string; 
  suffix?: string; 
  warning?: boolean;
}> = ({ label, value, onChange, placeholder, suffix, warning }) => (
  <div className="flex flex-col gap-1.5 group">
    <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">{label}</label>
    <div className={`
      flex items-center justify-between px-3 py-2 rounded border transition-all duration-200 bg-white shadow-sm
      ${warning 
        ? 'border-rose-300 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-100' 
        : 'border-slate-200 hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-50'}
    `}>
      <input 
        type="number" 
        value={value || ''} 
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder-slate-300 outline-none font-mono"
      />
      {suffix && <span className="text-[10px] text-slate-400 font-bold ml-2 select-none bg-slate-50 px-1 rounded">{suffix}</span>}
    </div>
  </div>
);

// 3. Status Badge (Light Pastel)
const Badge: React.FC<{ children: React.ReactNode; color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate' }> = ({ children, color = 'slate' }) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${colors[color]}`}>
      {children}
    </span>
  );
};

// 4. Card Container (White Surface)
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300 ${className || ''}`}>
    {children}
  </div>
);

// --- HELPER FUNCTIONS ---

const parsePriceFromStr = (str: string): number => {
  if (!str) return 0;
  const match = str.match(/(\d{1,3}(?:[.,]\d{3})*)/);
  if (!match) return 0;
  return parseInt(match[0].replace(/[.,]/g, '')) || 0;
};

// --- MAIN APP ---

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'HOME' | 'ANALISIS' | 'ANALISA'>('HOME');

  // --- LOGIC 100% UNTOUCHED START ---
  const [metrics, setMetrics] = useState<StockMetrics>({
    roe: 0, roa: 0, npm: 0, pbvInput: 0,
    revenue: 0, grossProfit: 0, operatingProfit: 0, eps: 0, peInput: 0, psInput: 0, ebitda: 0,
    totalAssets: 0, totalLiabilities: 0, totalEquity: 0, currentAssets: 0, currentLiabilities: 0, cash: 0, inventory: 0, derInput: 0,
    cfo: 0, capex: 0, fcf: 0,
    revNow: 0, revPrev: 0, revLastYear: 0, price: 0, bvps: 0, revps: 0
  });

  const [peers, setPeers] = useState<PeerData[]>(Array(5).fill({ roe: 0, roa: 0, npm: 0, per: 0, pbv: 0, ps: 0, der: 0, cr: 0 }));
  const [fundamentalResult, setFundamentalResult] = useState<AIAnalysisResult | null>(null);
  const [isFundamentalLoading, setIsFundamentalLoading] = useState(false);

  const [analisaInput, setAnalisaInput] = useState<AnalisaInput>({
    stockCode: '', 
    price: 0, 
    totalBidVol: 0, totalOfferVol: 0,
    tradeBookBuyVol: 0, tradeBookSellVol: 0,
    totalBuyFreq: 0, totalSellFreq: 0,
    brokerSummaryVal: 50, avgPriceTop3: 0, topBrokers: '', rawIntelligenceData: '',
    capital: 0,
    marketCapCategory: 'MID', accumulationDuration: 0,
    roe: 0, roa: 0, der: 0, per: 0, pbv: 0, npm: 0, cfo: 0, fcf: 0, revenueGrowth: 0
  });

  const [publicData, setPublicData] = useState<PublicCompanyData | null>(null);
  const [deepResult, setDeepResult] = useState<DeepAnalysisResult | null>(null);
  const [isAnalisaLoading, setIsAnalisaLoading] = useState(false);
  const [brokerFeedback, setBrokerFeedback] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  const moneyManagement = useMemo(() => {
    if (!deepResult || analisaInput.capital <= 0) return null;
    const entryPrice = parsePriceFromStr(deepResult.entryArea);
    const targetPrice = parsePriceFromStr(deepResult.targetPrice);
    const stopLossPrice = parsePriceFromStr(deepResult.stopLoss);
    if (entryPrice === 0) return null;
    const costPerLot = entryPrice * 100;
    const maxLots = Math.floor(analisaInput.capital / costPerLot);
    const totalInvested = maxLots * costPerLot;
    const potentialProfit = (targetPrice - entryPrice) * 100 * maxLots;
    const potentialLoss = (entryPrice - stopLossPrice) * 100 * maxLots;
    const riskRatio = (potentialProfit > 0 && potentialLoss > 0) ? potentialProfit / potentialLoss : 0;
    return { entryPrice, maxLots, totalInvested, potentialProfit, potentialLoss, riskRatio };
  }, [deepResult, analisaInput.capital]);

  const priceDeviation = useMemo(() => {
    if (analisaInput.price && analisaInput.avgPriceTop3) {
      return ((analisaInput.price - analisaInput.avgPriceTop3) / analisaInput.avgPriceTop3) * 100;
    }
    return 0;
  }, [analisaInput.price, analisaInput.avgPriceTop3]);

  const bidOfferRatio = useMemo(() => {
    if (analisaInput.totalOfferVol === 0) return 0;
    return analisaInput.totalBidVol / analisaInput.totalOfferVol;
  }, [analisaInput.totalBidVol, analisaInput.totalOfferVol]);

  const handleRunFundamental = async () => {
    setIsFundamentalLoading(true);
    try {
      const res = await analyzeFundamentalAI(metrics);
      setFundamentalResult(res);
    } catch (e: any) { console.error(e); alert(`GAGAL: ${e.message}`); }
    setIsFundamentalLoading(false);
  };

  const handleFetchAnalisa = async () => {
    if (!analisaInput.stockCode) return alert("Input Kode Saham.");
    setIsAnalisaLoading(true);
    try {
      const data = await fetchPublicStockData(analisaInput.stockCode);
      setPublicData(data);
    } catch (e: any) { console.error(e); alert(`GAGAL Fetch Data: ${e.message}`); }
    setIsAnalisaLoading(false);
  };

  const handleDeepAnalisa = async () => {
    setIsAnalisaLoading(true);
    try {
      const res = await runDeepAnalisa(analisaInput);
      setDeepResult(res);
    } catch (e: any) { console.error(e); alert(`GAGAL ANALISA: ${e.message}`); }
    setIsAnalisaLoading(false);
  };

  const handleCopyConclusion = () => {
    if (!deepResult) return;
    const text = `TACTICAL INTEL REPORT [${analisaInput.stockCode}]\nSTRATEGY: ${deepResult.strategyType}\nRISK: ${deepResult.riskLevel}\n\nZONE\nENTRY: ${deepResult.entryArea}\nTARGET: ${deepResult.targetPrice}\nSL: ${deepResult.stopLoss}\n\n${deepResult.reasoning.map(r => `• ${r}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const updateMetric = (k: keyof StockMetrics, v: number) => setMetrics(prev => ({ ...prev, [k]: v }));
  const handleBrokerChange = (val: string) => {
    setAnalisaInput(p => ({ ...p, topBrokers: val.toUpperCase() }));
    const codes = val.toUpperCase().split(',').map(s => s.trim()).filter(s => s.length > 0);
    setBrokerFeedback(codes.map(c => {
      const info = getBrokerInfo(c);
      return `${c}: ${info.type === 'RICH' ? 'RICH' : info.type === 'KONGLO' ? 'KONGLO' : info.type === 'AMPAS' ? 'RITEL' : 'CAMPUR'}`;
    }));
  };
  // --- LOGIC 100% UNTOUCHED END ---

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      
      {/* NAVBAR (LIGHT) */}
      <nav className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 lg:px-12 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
             <span className="font-bold text-white text-xs">AV</span>
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-lg">Artha<span className="text-indigo-600">Vision</span></span>
        </div>
        
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {['HOME', 'ANALISIS', 'ANALISA'].map((p) => (
            <button key={p} onClick={() => setCurrentPage(p as any)}
              className={`px-4 py-1.5 text-[11px] font-bold tracking-wide rounded-md transition-all duration-200 ${
                currentPage === p 
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >{p}</button>
          ))}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto w-full">
          
          {currentPage === 'HOME' && (
            <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
              <Badge color="indigo">v2.6.0 Stable</Badge>
              <h1 className="mt-8 text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-4 leading-tight">
                Financial <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">Intelligence</span>
              </h1>
              <p className="text-slate-500 text-lg md:text-xl max-w-2xl leading-relaxed font-medium">
                Platform analisis ekuitas premium dengan integrasi forensik bandarmology dan pemodelan probabilistik AI yang canggih.
              </p>
              <div className="mt-12 flex gap-4">
                 <button onClick={() => setCurrentPage('ANALISA')} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5">
                    Open Tactical Room
                 </button>
                 <button onClick={() => setCurrentPage('ANALISIS')} className="px-8 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors border border-slate-200 shadow-sm">
                    Fundamental Scan
                 </button>
              </div>
            </div>
          )}

          {currentPage === 'ANALISIS' && (
            <div className="p-6 lg:p-12 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex justify-between items-end pb-6 border-b border-slate-200">
                   <div>
                     <h2 className="text-2xl font-bold text-slate-900 mb-1">Fundamental Scanner</h2>
                     <p className="text-sm text-slate-500 font-medium">Input core financial metrics for automated deep-dive analysis.</p>
                   </div>
                   <Badge color="slate">Module: FUND_01</Badge>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Module 1 */}
                  <Card>
                     <SectionHeader title="Return Ratios" subtitle="Efficiency Metrics" />
                     <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="ROE (%)" value={metrics.roe} onChange={v => updateMetric('roe', v)} />
                        <InputGroup label="ROA (%)" value={metrics.roa} onChange={v => updateMetric('roa', v)} />
                        <InputGroup label="NPM (%)" value={metrics.npm} onChange={v => updateMetric('npm', v)} />
                        <InputGroup label="PBV (x)" value={metrics.pbvInput} onChange={v => updateMetric('pbvInput', v)} />
                     </div>
                  </Card>

                  {/* Module 2 */}
                  <Card>
                     <SectionHeader title="Income Statement" subtitle="Profitability" accent="emerald" />
                     <div className="grid grid-cols-3 gap-4">
                        <InputGroup label="Revenue (B)" value={metrics.revenue} onChange={v => updateMetric('revenue', v)} />
                        <InputGroup label="Gross Pft" value={metrics.grossProfit} onChange={v => updateMetric('grossProfit', v)} />
                        <InputGroup label="Op. Profit" value={metrics.operatingProfit} onChange={v => updateMetric('operatingProfit', v)} />
                        <InputGroup label="EPS" value={metrics.eps} onChange={v => updateMetric('eps', v)} />
                        <InputGroup label="PER (x)" value={metrics.peInput} onChange={v => updateMetric('peInput', v)} />
                        <InputGroup label="EBITDA" value={metrics.ebitda} onChange={v => updateMetric('ebitda', v)} />
                     </div>
                  </Card>

                  {/* Module 3 */}
                  <Card>
                     <SectionHeader title="Balance Sheet" subtitle="Solvency Health" accent="rose" />
                     <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Total Assets" value={metrics.totalAssets} onChange={v => updateMetric('totalAssets', v)} />
                        <InputGroup label="Liabilities" value={metrics.totalLiabilities} onChange={v => updateMetric('totalLiabilities', v)} />
                        <InputGroup label="Equity" value={metrics.totalEquity} onChange={v => updateMetric('totalEquity', v)} />
                        <InputGroup label="DER (x)" value={metrics.derInput} onChange={v => updateMetric('derInput', v)} warning={metrics.derInput > 1.5} />
                     </div>
                  </Card>

                  {/* Module 4 */}
                  <Card>
                     <SectionHeader title="Cash Flow" subtitle="Liquidity Check" accent="amber" />
                     <div className="grid grid-cols-3 gap-4 mb-4">
                        <InputGroup label="CFO (B)" value={metrics.cfo} onChange={v => updateMetric('cfo', v)} />
                        <InputGroup label="Capex" value={metrics.capex} onChange={v => updateMetric('capex', v)} />
                        <InputGroup label="FCF" value={metrics.fcf} onChange={v => updateMetric('fcf', v)} />
                     </div>
                     <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <InputGroup label="Rev Current" value={metrics.revNow} onChange={v => updateMetric('revNow', v)} />
                        <InputGroup label="Rev Last Year" value={metrics.revLastYear} onChange={v => updateMetric('revLastYear', v)} />
                     </div>
                  </Card>
               </div>

               <div className="flex justify-end pt-4">
                  <button onClick={handleRunFundamental} disabled={isFundamentalLoading} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-200">
                     {isFundamentalLoading ? "Processing..." : "Run Analysis"}
                  </button>
               </div>

               {fundamentalResult && (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 bg-white border border-slate-200 rounded-xl p-8 shadow-xl">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                      <div>
                        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">{fundamentalResult.verdict.replace(/_/g, ' ')}</h2>
                        <div className="flex gap-2">
                           <Badge color="emerald">Score: {fundamentalResult.fundamentalScore}/100</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Long Term Thesis</h4>
                          <p className="text-slate-700 leading-relaxed text-sm font-medium">{fundamentalResult.longTermInsight}</p>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Short Term View</h4>
                          <p className="text-slate-700 leading-relaxed text-sm font-medium">{fundamentalResult.shortTermInsight}</p>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          )}

          {currentPage === 'ANALISA' && (
            <div className="p-4 lg:p-8">
               <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-200 pb-6 mb-8 gap-6">
                  <div>
                     <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tactical Room</h1>
                     <p className="text-sm text-slate-500 mt-1 font-medium">Real-time Bandarmology & Price Action Intelligence</p>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                     <div className="flex bg-slate-100 rounded-md p-0.5">
                       {/* Market Cap Selector */}
                       {(['SMALL', 'MID', 'BIG'] as const).map(cat => (
                         <button key={cat} onClick={() => setAnalisaInput(prev => ({...prev, marketCapCategory: cat}))}
                           className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${analisaInput.marketCapCategory === cat ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                           {cat}
                         </button>
                       ))}
                     </div>
                     <div className="w-px h-6 bg-slate-200 mx-1"></div>
                     <input 
                         type="text" 
                         value={analisaInput.stockCode} 
                         onChange={(e) => setAnalisaInput({ ...analisaInput, stockCode: e.target.value.toUpperCase() })} 
                         className="bg-transparent text-slate-900 font-mono font-bold text-lg w-20 text-center outline-none uppercase placeholder-slate-300"
                         placeholder="CODE"
                     />
                     <button onClick={handleFetchAnalisa} disabled={isAnalisaLoading} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-xs font-bold transition-colors shadow-sm">
                       LOAD
                     </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-8">
                  
                  {/* SIDEBAR CONTROLS */}
                  <div className="space-y-6">
                     
                     {/* 1. Fundamental Radar */}
                     <Card>
                        <SectionHeader title="Fundamental Radar" subtitle="Quick Context" />
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <InputGroup label="ROE" value={analisaInput.roe} onChange={v => setAnalisaInput(p => ({...p, roe: v}))} />
                            <InputGroup label="DER" value={analisaInput.der} onChange={v => setAnalisaInput(p => ({...p, der: v}))} warning={analisaInput.der > 1.5} />
                            <InputGroup label="PBV" value={analisaInput.pbv} onChange={v => setAnalisaInput(p => ({...p, pbv: v}))} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <InputGroup label="PER" value={analisaInput.per} onChange={v => setAnalisaInput(p => ({...p, per: v}))} />
                            <InputGroup label="NPM" value={analisaInput.npm} onChange={v => setAnalisaInput(p => ({...p, npm: v}))} />
                            <InputGroup label="Grwth%" value={analisaInput.revenueGrowth} onChange={v => setAnalisaInput(p => ({...p, revenueGrowth: v}))} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                            <InputGroup label="CFO" value={analisaInput.cfo} onChange={v => setAnalisaInput(p => ({...p, cfo: v}))} />
                            <InputGroup label="FCF" value={analisaInput.fcf} onChange={v => setAnalisaInput(p => ({...p, fcf: v}))} />
                        </div>
                     </Card>

                     {/* 2. Price & Capital */}
                     <Card>
                        <SectionHeader title="Capital & Price" accent="emerald" />
                        <div className="space-y-3">
                           <InputGroup label="Modal (IDR)" value={analisaInput.capital} onChange={v => setAnalisaInput({...analisaInput, capital: v})} />
                           <div className="grid grid-cols-2 gap-3">
                              <InputGroup label="Current Price" value={analisaInput.price} onChange={v => setAnalisaInput({...analisaInput, price: v})} />
                              <InputGroup label="Avg Bandar" value={analisaInput.avgPriceTop3} onChange={v => setAnalisaInput({...analisaInput, avgPriceTop3: v})} />
                           </div>
                           
                           {/* Clean Deviation Bar */}
                           <div className="mt-2 bg-slate-50 p-2 rounded border border-slate-200">
                              <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                 <span>Deviasi Bandar</span>
                                 <span className={priceDeviation < 0 ? 'text-emerald-600' : 'text-rose-600'}>{priceDeviation > 0 ? '+' : ''}{priceDeviation.toFixed(2)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                                 <div className="w-1/2 flex justify-end">
                                    {priceDeviation < 0 && <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${Math.min(Math.abs(priceDeviation)*5, 100)}%` }}></div>}
                                 </div>
                                 <div className="w-1/2 flex justify-start">
                                    {priceDeviation > 0 && <div className="h-full bg-rose-500 rounded-r-full" style={{ width: `${Math.min(Math.abs(priceDeviation)*5, 100)}%` }}></div>}
                                 </div>
                              </div>
                           </div>
                        </div>
                     </Card>

                     {/* 3. Telemetry (Order/Trade Book) */}
                     <Card>
                        <SectionHeader title="Telemetry" subtitle="Market Depth" accent="amber" />
                        
                        <div className="mb-4 pb-4 border-b border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Order Book (Niat)</p>
                          <div className="grid grid-cols-2 gap-2">
                             <InputGroup label="Bid Vol" value={analisaInput.totalBidVol} onChange={v => setAnalisaInput({...analisaInput, totalBidVol: v})} />
                             <InputGroup label="Offer Vol" value={analisaInput.totalOfferVol} onChange={v => setAnalisaInput({...analisaInput, totalOfferVol: v})} />
                          </div>
                          {bidOfferRatio > 0 && (
                             <div className="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full ${bidOfferRatio > 1 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(bidOfferRatio * 50, 100)}%` }}></div>
                             </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 mt-2">
                             <InputGroup label="Buy Freq" value={analisaInput.totalBuyFreq} onChange={v => setAnalisaInput({...analisaInput, totalBuyFreq: v})} />
                             <InputGroup label="Sell Freq" value={analisaInput.totalSellFreq} onChange={v => setAnalisaInput({...analisaInput, totalSellFreq: v})} />
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Trade Book (Aksi)</p>
                          <div className="grid grid-cols-2 gap-2">
                             <InputGroup label="Haka (Buy)" value={analisaInput.tradeBookBuyVol} onChange={v => setAnalisaInput({...analisaInput, tradeBookBuyVol: v})} />
                             <InputGroup label="Haki (Sell)" value={analisaInput.tradeBookSellVol} onChange={v => setAnalisaInput({...analisaInput, tradeBookSellVol: v})} />
                          </div>
                        </div>
                     </Card>

                     {/* 4. Bandarmology */}
                     <Card>
                        <SectionHeader title="Bandarmology" accent="rose" />
                        <div className="mb-4">
                            <InputGroup label="Durasi Net Buy (Hari)" value={analisaInput.accumulationDuration} onChange={v => setAnalisaInput(p => ({...p, accumulationDuration: v}))} />
                        </div>
                        <div className="space-y-4">
                           <div>
                             <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2">
                                <span>Distribusi</span>
                                <span>Akumulasi</span>
                             </div>
                             <input type="range" min="0" max="100" value={analisaInput.brokerSummaryVal} onChange={(e)=>setAnalisaInput({...analisaInput, brokerSummaryVal: parseInt(e.target.value)})} 
                               className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                           </div>
                           
                           <div className="space-y-1">
                               <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Top Broker Codes</label>
                               <input type="text" value={analisaInput.topBrokers} onChange={(e)=>handleBrokerChange(e.target.value)} 
                                 className="w-full bg-white border border-slate-200 rounded-md p-2.5 text-sm font-mono text-slate-900 uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none transition-all shadow-sm" 
                                 placeholder="YP, BK, MS" />
                           </div>
                           
                           <div className="flex flex-wrap gap-1.5">
                             {brokerFeedback.map((f, i) => (
                                <Badge key={i} color="slate">{f}</Badge>
                             ))}
                           </div>
                        </div>
                     </Card>

                     {/* 5. Raw Input */}
                     <Card>
                        <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block mb-2">Additional Context</label>
                        <textarea 
                             value={analisaInput.rawIntelligenceData} 
                             onChange={(e) => setAnalisaInput({...analisaInput, rawIntelligenceData: e.target.value})}
                             placeholder="Paste news, sentiment, or notes..."
                             className="w-full h-24 bg-white border border-slate-200 p-3 text-sm text-slate-700 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none resize-none placeholder-slate-400 custom-scrollbar shadow-sm"
                          />
                     </Card>

                     <button onClick={handleDeepAnalisa} disabled={isAnalisaLoading} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-200 transition-all uppercase tracking-wide text-xs">
                        {isAnalisaLoading ? 'Analyzing...' : 'Execute Analysis'}
                     </button>
                  </div>

                  {/* RIGHT CONTENT: RESULTS */}
                  <div className="space-y-6">
                     
                     {/* Info Bar */}
                     {publicData && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-500">
                           <Card className="flex flex-col justify-center !p-3 bg-white hover:bg-slate-50">
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Foreign Flow</span>
                              <span className="font-mono text-emerald-600 font-bold">{publicData.marketData?.foreignFlow || '-'}</span>
                           </Card>
                           <Card className="flex flex-col justify-center !p-3 bg-white hover:bg-slate-50">
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Investors</span>
                              <span className="font-mono text-slate-900 font-bold">{publicData.kseiStats?.sidCount || '-'}</span>
                           </Card>
                           <Card className="col-span-1 sm:col-span-2 flex flex-col justify-center !p-3 bg-white hover:bg-slate-50">
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Management</span>
                              <span className="font-mono text-slate-700 text-xs truncate">{publicData.management?.presDir || '-'}</span>
                           </Card>
                        </div>
                     )}

                     {/* RESULT AREA */}
                     <div className="min-h-[500px]">
                        {deepResult ? (
                          <div className="space-y-6 animate-in fade-in duration-500">
                             
                             {/* Verdict Header */}
                             <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
                                <div className="relative z-10">
                                   <div className="flex items-center gap-2 mb-3">
                                      <span className={`w-2 h-2 rounded-full ${deepResult.riskLevel.includes('High') ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Strategy Verdict</span>
                                   </div>
                                   <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">{deepResult.strategyType}</h2>
                                </div>
                                <div className="text-right relative z-10">
                                   <p className="text-sm font-medium text-indigo-600 italic">"{deepResult.prediction}"</p>
                                </div>
                             </div>

                             {/* Money Management */}
                             {moneyManagement && (
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-xl text-white">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                  <div className="flex items-center justify-between mb-6">
                                     <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-2">
                                        Position Sizing
                                     </h3>
                                     <span className="bg-indigo-900 text-indigo-200 border border-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Risk 1 : {moneyManagement.riskRatio.toFixed(2)}</span>
                                  </div>

                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                     <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Lot Size</p>
                                        <p className="text-2xl font-mono font-bold text-white">{moneyManagement.maxLots} <span className="text-sm text-slate-500 font-sans">Lot</span></p>
                                        <p className="text-[10px] text-slate-500 mt-1">Rp {moneyManagement.totalInvested.toLocaleString('id-ID')}</p>
                                     </div>
                                     <div>
                                        <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Reward</p>
                                        <p className="text-xl font-mono font-bold text-emerald-400">+{moneyManagement.potentialProfit.toLocaleString('id-ID')}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Target: {deepResult.targetPrice}</p>
                                     </div>
                                     <div>
                                        <p className="text-[10px] text-rose-400 uppercase font-bold mb-1">Risk</p>
                                        <p className="text-xl font-mono font-bold text-rose-400">-{moneyManagement.potentialLoss.toLocaleString('id-ID')}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Stop: {deepResult.stopLoss}</p>
                                     </div>
                                  </div>
                                </div>
                             )}

                             {/* Zones */}
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="text-center !bg-emerald-50 !border-emerald-100">
                                   <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest block mb-1">Entry</span>
                                   <span className="text-2xl font-mono font-bold text-emerald-900">{deepResult.entryArea}</span>
                                </Card>
                                <Card className="text-center !bg-indigo-50 !border-indigo-100">
                                   <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest block mb-1">Target</span>
                                   <span className="text-2xl font-mono font-bold text-indigo-900">{deepResult.targetPrice}</span>
                                </Card>
                                <Card className="text-center !bg-rose-50 !border-rose-100">
                                   <span className="text-[10px] text-rose-600 font-bold uppercase tracking-widest block mb-1">Stop Loss</span>
                                   <span className="text-2xl font-mono font-bold text-rose-900">{deepResult.stopLoss}</span>
                                </Card>
                             </div>

                             {/* Analysis Content */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                   <SectionHeader title="Long Term Thesis" />
                                   <p className="text-sm text-slate-700 leading-relaxed text-justify font-medium">{deepResult.longTermSuitability}</p>
                                </Card>
                                <Card>
                                   <SectionHeader title="Short Term Thesis" />
                                   <p className="text-sm text-slate-700 leading-relaxed text-justify font-medium">{deepResult.shortTermSuitability}</p>
                                </Card>
                             </div>

                             <Card>
                                <SectionHeader title="Key Reasoning" />
                                <ul className="space-y-2">
                                   {deepResult.reasoning?.map((r, i) => (
                                      <li key={i} className="flex gap-4 text-sm text-slate-700 items-start p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                         <span className="font-mono text-indigo-600 font-bold text-xs mt-0.5">0{i+1}</span>
                                         <span className="font-medium">{r}</span>
                                      </li>
                                   ))}
                                </ul>
                             </Card>
                             
                             <div className="flex justify-end pt-2">
                                <button onClick={handleCopyConclusion} className={`px-5 py-2 text-xs font-bold uppercase tracking-wider border rounded-md transition-all ${isCopied ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 bg-white'}`}>
                                   {isCopied ? 'Copied' : 'Copy Report'}
                                </button>
                             </div>

                          </div>
                        ) : (
                          <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                             <p className="text-sm font-bold tracking-widest uppercase">Waiting for Analysis Data</p>
                          </div>
                        )}
                     </div>
                  </div>

               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
