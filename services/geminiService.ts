
import { GoogleGenAI, Type } from "@google/genai";
import { StockMetrics, AnalisaInput, DeepAnalysisResult, PublicCompanyData, AIAnalysisResult } from "../types";
import { getBrokerInfo } from "./brokerLogic";

// Fungsi pembersih JSON yang kuat
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  // Hapus markdown code blocks ```json dan ```
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return cleaned;
};

// Helper untuk inisialisasi AI hanya saat dibutuHakaan (Lazy Load)
// Ini mencegah "White/Black Screen of Death" saat website baru dibuka
const getAI = () => {
  // process.env.API_KEY ini akan diganti oleh Vite saat build menjadi string asli
  const key = process.env.API_KEY as string;
  
  if (!key || key.trim() === "" || key.includes("undefined")) {
    throw new Error("API Key belum terdeteksi. Pastikan sudah input API_KEY di Settings Vercel dan lakukan REDEPLOY (Bukan cuma refresh).");
  }
  
  return new GoogleGenAI({ apiKey: key });
};

export const analyzeFundamentalAI = async (metrics: StockMetrics): Promise<AIAnalysisResult> => {
  const ai = getAI(); // Inisialisasi di sini

  const prompt = `
   IDENTITAS: ArthaVision Core v2.4 – Senior Fundamental Analyst & Financial Forensic Specialist. Tugas Anda adalah membedah kebusukan laporan keuangan. Fokus pada kualitas laba, daya tahan bisnis, dan titik kegagalan (failure modes). Prioritas tunggal: Risk of capital loss. Jangan beri ruang untuk optimisme tanpa basis data kuat.
PRINSIP ANALISIS (WAJIB):
Skeptis Radikal: Valuasi murah seringkali adalah "sampah" yang layak dihargai murah. Profit tinggi seringkali hanyalah manipulasi akuntansi.
Conflict Resolution: Jika data bertentangan, pilih sinyal yang paling memperburuk keadaan (konservatif).
Anti-Narrative: Abaikan prospek masa depan dari manajemen. Hanya percaya pada arus kas nyata.
LOGIKA ANALISIS (URUTAN TETAP):
1. PROFITABILITAS & DU PONT FORENSIC
Bedah ROE ${metrics.roe}% dan ROA ${metrics.roa}%.
Judge: Jika ROE tinggi didorong leverage (DER ${metrics.derInput}x) sementara ROA stagnan, labeli sebagai "Artificial ROE/High Leverage Risk".
Analisis NPM ${metrics.npm}% vs ROA: Deteksi margin semu atau pendapatan non-operasional.
2. KUALITAS LABA & FORENSIC CASH FLOW (KRITIS)
Evaluasi CFO ${metrics.cfo}B dan FCF ${metrics.fcf}B.
The Smells Test: Jika Net Profit tumbuh tapi CFO ${metrics.cfo}B stagnan/negatif, nyatakan secara eksplisit: "Low Quality Earnings/Potential Manipulation".
FCF negatif namun laba positif = "Cash Bleeding". Nyatakan sumber risiko keberlanjutan.
3. SOLVABILITAS & RISIKO STRUKTURAL
Analisis DER ${metrics.derInput}x. Jika Current Ratio rendah dan DER tinggi, nyatakan: "Insolvency Risk Implied". Perusahaan sedang "meminjam waktu".
4. VALUASI & ANTI-VALUE TRAP
Evaluasi PBV ${metrics.pbvInput}x dan PE ${metrics.peInput}x.
Verdict: Valuasi rendah tanpa dukungan FCF & ROE berkualitas wajib dilabeli sebagai "Value Trap". Jangan rekomendasikan beli hanya karena "murah".
5. GROWTH SUSTAINABILITY
Revenue Growth YoY: ${(((metrics.revNow - metrics.revLastYear)/metrics.revLastYear)*100).toFixed(2)}%.
Jika pertumbuhan dibayar dengan penurunan margin atau kenaikan hutang, labeli: "Destructive Growth".
6. CAPITAL ALLOCATION & YIELD TRAP
Jika dividen dibayar saat FCF negatif, nyatakan: "Dividend Trap/Capital Erosion".
7. FAILURE MODE (PENENTU GAGAL)
Tuliskan: "Analisa ini GAGAL/INVALID jika..." (Pilih parameter paling krusial dari data di atas).
OUTPUT REQUIREMENTS (URUTAN TETAP):
JANGKA PANJANG: Analisis moat, efisiensi modal, dan risiko struktural.
JANGKA MENENGAH: Evaluasi apakah fundamental layak untuk akumulasi atau VOID.
VERDICT (TEGAS): INVESTASI NILAI / INVESTASI BERSYARAT / SPEKULATIF / HINDARI (AVOID).
Confidence Level: (Tinggi / Sedang / Rendah).
FUNDAMENTAL SCORE (0–100): Beri skor kejam berdasarkan bobot: Profitability (25%), Cash Flow (30%), Solvency (20%), Valuation (15%), Growth (10%).
ACCURACY MATRIX: Breakdown skor per pilar + Catatan Risiko Utama.
Broker Implications: Identifikasi top broker. Jika terdeteksi akumulasi tapi fundamental busuk, nyatakan sebagai "Pure Speculation/Greater Fool Theory".
GAYA BAHASA: Bahasa Indonesia institusional, dingin, tajam, dan tidak kompromi. Dilarang menggunakan filler atau kata-kata manis.
  `;

  // GANTI MODEL KE FLASH (Lebih Aman Kuota)
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", 
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 16000 }, // Budget disesuaikan untuk Flash
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          executiveSummary: { type: Type.STRING },
          longTermInsight: { type: Type.STRING },
          shortTermInsight: { type: Type.STRING },
          verdict: { type: Type.STRING },
          fundamentalScore: { type: Type.NUMBER },
          recommendation: { type: Type.STRING },
          riskAnalysis: { type: Type.ARRAY, items: { type: Type.STRING } },
          competitiveMoat: { type: Type.STRING },
          accuracyMatrix: {
            type: Type.OBJECT,
            properties: {
              profitabilityQuality: { type: Type.NUMBER },
              solvencyRisk: { type: Type.NUMBER },
              valuationMargin: { type: Type.NUMBER },
              cashFlowIntegrity: { type: Type.NUMBER }
            }
          }
        }
      }
    }
  });

  const text = cleanJson(response.text || "{}");
  try {
    return JSON.parse(text) as AIAnalysisResult;
  } catch (e) {
    console.error("JSON Parse Error (Fundamental):", text);
    throw new Error("Gagal memproses data AI (Format Invalid).");
  }
};

export const fetchPublicStockData = async (stockCode: string): Promise<PublicCompanyData> => {
  const ai = getAI(); // Inisialisasi di sini

  const prompt = `Cari data resmi TERBARU TAHUN 2026 untuk emiten: ${stockCode} di Bursa Efek Indonesia (IDX). Wajib sertakan Manajemen (Presdir, Direksi, Komisaris), Corporate Action, dan Statistik KSEI.`;
  // GANTI MODEL KE FLASH
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });
  
  const text = cleanJson(response.text || "{}");
  try {
    return JSON.parse(text) as PublicCompanyData;
  } catch (e) {
    console.error("JSON Parse Error (Public Data):", text);
    throw new Error("Gagal mengambil data publik.");
  }
};

export const runDeepAnalisa = async (input: AnalisaInput): Promise<DeepAnalysisResult> => {
  const ai = getAI(); // Inisialisasi di sini

  const priceDiff = input.avgPriceTop3 > 0 
    ? ((input.price - input.avgPriceTop3) / input.avgPriceTop3) * 100 
    : 0;
  
  const brokerPosition = priceDiff < -2 ? "AKUMULASI (Harga Jauh Dibawah Avg Broker)" 
    : priceDiff > 2 ? "DISTRIBUSI (Harga Jauh Diatas Avg Broker)" 
    : "NETRAL (Harga Dekat Avg Broker)";

  // --- LOGIC TAMBAHAN UNTUK BROKER & MARKET DEPTH ---
  // 1. Parse Top Brokers untuk AI
  const brokerCodes = input.topBrokers.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
  const brokerAnalysisString = brokerCodes.map(code => {
    const info = getBrokerInfo(code);
    return `${code} (${info.type})`; // Output: YP (RICH), BK (RICH)
  }).join(', ');

  // 2. Kalkulasi Market Depth (ORDER BOOK - NIAT)
  const bidOfferRatio = input.totalOfferVol > 0 ? (input.totalBidVol / input.totalOfferVol).toFixed(2) : "N/A";
  const depthStatus = input.totalBidVol > input.totalOfferVol ? "DEMAND OVERHANG (Bid Lebih Besar)" : "SUPPLY PRESSURE (Offer Lebih Besar)";

  // 3. Kalkulasi TRADE BOOK (DONE - AKSI NYATA)
  const tradeBookStatus = input.tradeBookBuyVol > input.tradeBookSellVol 
    ? `AKSI BELI AGRESIF (Haka Dominan: ${input.tradeBookBuyVol} vs ${input.tradeBookSellVol})` 
    : input.tradeBookSellVol > input.tradeBookBuyVol 
    ? `TEKANAN JUAL NYATA (Haki Dominan: ${input.tradeBookSellVol} vs ${input.tradeBookBuyVol})`
    : "NETRAL";

  // 4. Analisa Fundamental Context
  const isValueTrap = input.per < 5 && input.revenueGrowth < 0 && input.cfo < 0;
  const isGrowthStock = input.revenueGrowth > 15 && input.npm > 10;
  const solvencyIssue = input.der > 1.5 && input.cfo < 0;
  
  const fundamentalSnapshot = `
    KATEGORI: ${input.marketCapCategory} CAP
    ROE: ${input.roe}% | DER: ${input.der}x | PBV: ${input.pbv}x | PER: ${input.per}x
    CFO: ${input.cfo}B | FCF: ${input.fcf}B | Sales Growth: ${input.revenueGrowth}%
    STATUS CASHFLOW: ${input.cfo > 0 ? "POSITIVE" : "NEGATIVE (Burn Rate Risk)"}
    POTENSI VALUE TRAP: ${isValueTrap ? "YA (PE Rendah tapi Growth/Cashflow Negatif)" : "TIDAK"}
    POTENSI GROWTH: ${isGrowthStock ? "YA (High Growth + Profitable)" : "MODERATE/LOW"}
    RISIKO SOLVABILITAS: ${solvencyIssue ? "TINGGI (Utang Besar + CFO Negatif)" : "AMAN"}
  `;

  // 5. Analisa Durasi Akumulasi
  let accumulationAnalysis = "Data Durasi Tidak Signifikan";
  if (input.accumulationDuration > 20) accumulationAnalysis = `LONG TERM ACCUMULATION (${input.accumulationDuration} Hari) - Potensi Markup Besar atau Holding Kuat`;
  if (input.accumulationDuration > 5 && input.accumulationDuration <= 20) accumulationAnalysis = `MID TERM SWING (${input.accumulationDuration} Hari) - Fase Pembentukan Base`;
  if (input.accumulationDuration <= 5) accumulationAnalysis = `SHORT TERM / NOISE (${input.accumulationDuration} Hari) - Potensi Scalping / Hit n Run`;

  const prompt = `
   BERTINDAK SEBAGAI: Senior Intelligence Fusion Analyst — Ve'Larc 2026. Spesialis probabilistic decision-making, tail-risk management, dan behavioral market structure. Anda adalah mesin penyaring risiko; tugas Anda adalah mencari celah di mana trader ritel akan "dimakan" oleh pasar.
PRINSIP INTI (WAJIB):
Prioritas Risiko: Risk signal mengalahkan ekspektasi return tanpa pengecualian.
Skeptisisme Data: Sesuaikan data ekstrem dengan mean reversion dan kurtosis tinggi (fat tails). Jangan tertipu oleh lonjakan harga tanpa volume.
Conflict Resolution: Jika Fundamental Buruk vs Bandar Akumulasi → Klasifikasikan sebagai "Speculative Momentum/High-Risk Chasing". Jangan menyebutnya investasi.
TUGAS ANALISIS WAJIB:
1. INTEGRASI FUNDAMENTAL & MARKET CAP
Analisa konteks Cap: ${input.marketCapCategory}.
Judge: Jika Small Cap, berikan penalti pada risk level. Jika PE rendah tapi CFO negatif, labeli: "WARNING: VALUE TRAP DETECTED". Jika Growth tinggi tapi DER tinggi, labeli: "WARNING: SOLVENCY TIME BOMB".
2. DURASI & SIKLUS AKUMULASI
Durasi: ${input.accumulationDuration} Hari.
Logic: * Durasi >20 hari + Harga < Avg Bandar: "Strategic Accumulation/Potential Jackpot".
Durasi <5 hari + Harga naik tajam: "Exit Liquidity/Retail Trap". Berani katakan "Avoid" jika harga sudah terlalu jauh dari ${input.avgPriceTop3}.
3. MATH & REALITY CHECK (QUANT)
Ekstrak eksplisit: Sharpe Ratio, VaR 95%, CVaR, Skewness, & Kurtosis.
Logic: Jika Monte Carlo > Harga saat ini tetapi Broker Summary ${input.brokerSummaryVal} menunjukkan Distribusi, nyatakan sebagai "Mathematical Illusion/Distribution in Progress".
4. BANDARMOLOGY & ORDER FLOW VALIDATION
Korelasikan ${input.avgPriceTop3} dengan ${input.price}. Posisi user: ${brokerPosition} (${priceDiff.toFixed(2)}%).
Bid/Offer Analysis: Apakah ${depthStatus} mencerminkan absorpsi nyata atau fake bid? Jika harga naik tanpa validasi volume di ${tradeBookStatus}, nyatakan sebagai "Weak Rally".
Broker Implications: Bedah top broker. Identifikasi jika ada indikasi wash trading atau dominasi broker ritel (sinyal panik).
FAILURE CONDITIONS & THESIS INVALIDATION (WAJIB): Nyatakan dengan tegas: "Analisa ini GAGAL jika..." (Contoh: Broker utama beralih net sell, breakdown VaR level, atau CFO memburuk di kuartal berikutnya).
DYNAMIC RISK DISCLAIMER (THE WEAKEST LINK): Identifikasi 1–3 titik paling rapuh.
Weakest Link #1: [Parameter paling menentukan]
Monitoring Wajib: Indikator spesifik yang harus dipantau detik demi detik.
OUTPUT REQUIREMENTS (URUTAN TETAP):
Market Structure & Thesis Status: (Valid / Weakened / Invalidated).
Strategy Type: (Scalping / Swing / Invest / Avoid).
Execution Levels: Entry Area (probabilistik), Target Price (Main & Bull), Stop Loss (berbasis VaR).
Risk Level: (Low / Medium / High / Extreme).
Long-Term & Short-Term Suitability: Integrasi CFO/Growth vs Momentum Bandar.
Reasoning: 5–7 poin tajam menggabungkan Angka + Perilaku Bandar + Fundamental.
Broker Implications: Penjelasan implikasi broker penggerak.
GAYA BAHASA: Indonesia Institusional. Tegas, dingin, dan berbasis probabilitas. Dilarang menggunakan kata "mungkin". Gunakan "Ekspektasi statistik" atau "Probabilitas tinggi/rendah".
  `;

  // GANTI MODEL KE FLASH (Lebih Aman Kuota)
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { 
      thinkingConfig: { thinkingBudget: 16000 }, // Budget disesuaikan untuk Flash
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          marketStructure: { type: Type.STRING },
          prediction: { type: Type.STRING },
          strategyType: { type: Type.STRING },
          entryArea: { type: Type.STRING },
          targetPrice: { type: Type.STRING },
          stopLoss: { type: Type.STRING },
          riskLevel: { type: Type.STRING },
          longTermSuitability: { type: Type.STRING },
          shortTermSuitability: { type: Type.STRING },
          reasoning: { type: Type.ARRAY, items: { type: Type.STRING } },
          dynamicDisclaimer: { type: Type.STRING }
        }
      }
    }
  });
  
  const text = cleanJson(response.text || "{}");
  try {
    return JSON.parse(text) as DeepAnalysisResult;
  } catch (e) {
    console.error("JSON Parse Error (Deep Analysis):", text);
    throw new Error("Gagal memproses hasil analisa AI (Format Invalid).");
  }
};

/**
 * Universal Chat function for Ve'Larc AI Concierge
 */
export const startVeLarcChatSession = () => {
  const ai = getAI();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `
        IDENTITAS: Anda adalah Ve'Larc AI Concierge, asisten virtual universal untuk terminal ArthaVision 2026.
        TUGAS: Membantu pengguna memahami fitur aplikasi (Home, Analisis Fundamental, Analisa Bandarmology) dan memberikan wawasan pasar modal Indonesia secara umum.
        KARAKTER: Profesional, teknis, skeptis terhadap spekulasi ritel, dan sangat berfokus pada data.
        PENGETAHUAN UTAMA:
        - Analisis Fundamental: ROE, ROA, DER, Cash Flow Forensic.
        - Bandarmology: Order Book (Niat), Trade Book (Aksi/Done), Broker Summary (Rich/Konglo/Ritel).
        - Market Dynamics: High Probability Zones, Tail Risk, Volatilitas.
        BAHASA: Bahasa Indonesia formal, tajam, dan edukatif. Jangan gunakan emoji.
      `,
    },
  });
};
