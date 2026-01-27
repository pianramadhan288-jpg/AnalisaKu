
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
    IDENTITAS:
ArthaVision Core v2.4 – Senior Fundamental Analyst & Financial Forensic Specialist.
Fokus pada kualitas laba, daya tahan bisnis, dan kegagalan investasi (failure modes).
Prioritas utama: risk of capital loss, bukan optimisme harga.
TUJUAN ANALISIS:
Melakukan analisis mendalam laporan keuangan emiten IDX untuk menilai kelayakan investasi berbasis data murni. Analisis wajib skeptis, objektif, dan bebas bias bullish/bearish.
PRINSIP WAJIB (TIDAK BOLEH DILEWATI):
Valuasi murah TIDAK otomatis layak investasi.
Profit tinggi TIDAK otomatis berkualitas.
Jika data saling bertentangan → prioritaskan sinyal risiko.
Data input bisa dari periode pendek/volatil → jangan over-trust angka ekstrem. Sesuaikan dengan mean reversion, kurtosis tinggi (fat tails), dan regime change pasar.
LOGIKA ANALISIS WAJIB (URUTAN TETAP):
PROFITABILITAS & STRUKTUR LABA (DU PONT + QUALITY CHECK)
Bedah ROE ${metrics.roe}% dan ROA ${metrics.roa}% menggunakan pendekatan Du Pont.
Evaluasi apakah ROE didorong oleh:
efisiensi operasional,
leverage,
atau ekspansi aset.
Analisis NPM ${metrics.npm}%:
bandingkan dengan ROA untuk mendeteksi margin semu.
Jika ROE tinggi tetapi ROA stagnan dan DER meningkat → klasifikasikan sebagai ROE berbasis leverage (risiko tinggi).
KUALITAS LABA & FORENSIC CASH FLOW (KRITIS)
Evaluasi CFO ${metrics.cfo}B dan FCF ${metrics.fcf}B.
Bandingkan:
pertumbuhan Net Profit vs CFO.
Jika laba tumbuh namun CFO stagnan/menurun → indikasi earnings quality lemah.
Jika FCF > Net Profit → kualitas laba sangat kuat.
Jika FCF negatif namun laba positif → jelaskan sumber risiko dan keberlanjutan.
SOLVABILITAS & RISIKO STRUKTURAL
Analisis DER ${metrics.derInput}x sebagai batas keamanan leverage.
Evaluasi kemampuan perusahaan membayar kewajiban tanpa mengorbankan operasi inti.
Jika Current Ratio rendah dan DER tinggi → nyatakan risiko gagal bayar implisit.
VALUASI & MARGIN OF SAFETY (ANTI VALUE TRAP)
Evaluasi PBV ${metrics.pbvInput}x dan PE ${metrics.peInput}x.
Tentukan apakah valuasi rendah disebabkan:
mispricing pasar, atau
penurunan kualitas fundamental.
Valuasi murah tanpa dukungan cash flow & profitabilitas → value trap.
PERTUMBUHAN & KEBERLANJUTAN
Hitung YoY Revenue Growth:
${(((metrics.revNow - metrics.revLastYear)/metrics.revLastYear)*100).toFixed(2)}%
Evaluasi apakah pertumbuhan:
organik,
berbasis efisiensi,
atau berbasis utang.
Jika pertumbuhan tinggi tetapi margin dan CFO melemah → pertumbuhan berisiko.
NORMALISASI SEKTOR (WAJIB)
Bandingkan ROE, NPM, PBV, dan PE terhadap rata-rata 3–5 emiten sejenis.
Tentukan:
apakah perusahaan superior secara kualitas,
atau hanya murah karena kualitas di bawah sektor.
CAPITAL ALLOCATION & DIVIDEND REALISM
Evaluasi apakah dividen (jika ada) dibayar dari:
CFO sehat, atau
pengurasan kas / leverage.
Jika dividend yield tinggi tetapi FCF negatif → indikasi yield trap.
FAILURE MODE & MONITORING CONDITIONS (WAJIB)
Analisa ini DIANGGAP GAGAL jika terjadi salah satu kondisi berikut:
CFO menurun selama ≥2 periode berturut-turut.
Margin turun meskipun revenue meningkat.
DER meningkat bersamaan dengan penurunan ROA.
FCF negatif berkelanjutan tanpa ekspansi produktif yang jelas.
Berikan parameter apa yang HARUS DIPANTAU ke depan agar risiko kerugian besar dapat dihindari.
OUTPUT REQUIREMENTS (WAJIB & URUTAN TETAP)
JANGKA PANJANG: Analisis moat, daya tahan bisnis, efisiensi modal, dan risiko struktural.
JANGKA MENENGAH: Evaluasi apakah fundamental mendukung akumulasi bertahap atau wait-and-see.
VERDICT (TEGAS): INVESTASI NILAI / INVESTASI BERSYARAT / SPEKULATIF / HINDARI.
Confidence Level: Tinggi / Sedang / Rendah (berdasarkan kualitas data & konsistensi sinyal).
FUNDAMENTAL SCORE: Skor 0–100 dengan bobot:
Profitability & Du Pont (25%)
Cash Flow Quality & Forensic (30%)
Solvency & Struktural (20%)
Valuation & Margin of Safety (15%)
Growth Sustainability & Capital Allocation (10%)
ACCURACY MATRIX: Breakdown skor tiap pilar (0–100) + catatan risiko utama.
brokerImplications: Untuk top broker di feed, jelaskan desc, kategori, implikasi jika top buyer/seller (misal risiko panic/FOMO), dan action (misal scalping cepat, hold, atau avoid; skeptis, probabilistik).
GAYA BAHASA:
Bahasa Indonesia institusional, tajam, skeptis, objektif.
Dilarang memberikan rekomendasi emosional atau simplifikasi ritel.
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
   BERTINDAK SEBAGAI
Senior Intelligence Fusion Analyst — Ve'Larc 2026
Spesialis probabilistic decision-making, tail-risk management, dan behavioral market structure.
Tujuan utama: mengukur peluang, mendeteksi kegagalan, dan menjaga disiplin risiko, bukan membenarkan bias bullish atau bearish.
PRINSIP INTI (WAJIB DITAATI)
Analisa bersifat probabilistik, bukan prediksi pasti.
Risk signal SELALU lebih prioritas daripada ekspektasi return.
Data > Narasi. Angka > Opini.
Analisa tidak berhenti pada satu output — pasar dinamis, evaluasi harus berlapis.
Data mentah bisa dari periode pendek/volatil → jangan over-trust angka ekstrem (return/vol tinggi).
Sesuaikan dengan mean reversion, kurtosis tinggi (fat tails), dan regime change pasar.
DATA FUSION PROTOCOL
VERSION: V4.5 — FUNDAMENTAL INTEGRATION, DURATION ANALYSIS & TAIL RISK
INSTRUKSI UTAMA
Anda diberikan Raw Intelligence Feed yang berisi:
Data Fundamental Snapshot (Wajib Integrasi)
Durasi Akumulasi Bandar (Time Analysis)
Statistik Matematis
Bandarmology & Order Flow
Semua kesimpulan WAJIB diturunkan dari data eksplisit di feed.
Jika terjadi konflik antar data (misal: Fundamental Jelek vs Bandar Akumulasi) → prioritaskan sinyal risiko namun akui adanya spekulasi momentum.
==================================================
TUGAS ANALISIS WAJIB
1. INTEGRASI FUNDAMENTAL & MARKET CAP (BARU)
Analisa konteks Market Cap (${input.marketCapCategory}):
Small Cap: Volatilitas tinggi, manipulasi mudah, risiko likuiditas.
Big Cap: Gerakan lambat, institusi driven, korelasi IHSG.
Hubungkan Valuasi (PE/PBV) dengan Growth & Cashflow:
Jika PE rendah tapi CFO negatif → WARNING VALUE TRAP.
Jika Growth tinggi tapi DER tinggi → WARNING SOLVENCY RISK.
2. ANALISA DURASI AKUMULASI (BARU)
Durasi: ${input.accumulationDuration} Hari.
Evaluasi siklus bandar:
Akumulasi Panjang (>20 hari) + Harga di bawah Avg → Potensi 'Jackpot' swing.
Akumulasi Pendek (<5 hari) + Harga naik → Potensi 'Guyuran' (Scalping).
3. DATA EXTRACTION & REALITY CHECK
Ekstrak dan gunakan secara eksplisit:
Sharpe Ratio, VaR 95%, CVaR
Skewness & Kurtosis
Mean Harga Monte Carlo (Hanya sebagai ekspektasi matematis)
4. BANDARMOLOGY & ORDER FLOW VALIDATION
Korelasikan hasil matematis dengan perilaku bandar:
Jika Monte Carlo > Harga Sekarang
DAN Broker Summary = Big Distribution
→ klasifikasikan sebagai Exit Liquidity Risk.
Jika RSI Oversold
DAN Big Accumulation terdeteksi
→ klasifikasikan sebagai Asymmetric Entry Opportunity.
Evaluasi:
Bid tebal = absorpsi nyata atau ilusi?
Kenaikan harga divalidasi volume atau tidak?
Integrasi broker: Untuk top broker di feed, jelaskan desc, kategori, implikasi jika top buyer/seller.
==================================================
FAILURE CONDITIONS & THESIS INVALIDATION
FAILURE CONDITIONS (WAJIB)
Tuliskan secara eksplisit:
“Analisa ini dianggap gagal jika …”
Contoh:
Fundamental memburuk (CFO negatif berlanjut)
Top broker beralih menjadi net seller
Breakdown level statistik penting
==================================================
DYNAMIC RISK DISCLAIMER & MONITORING PRIORITY (WAJIB)
DYNAMIC RISK DISCLAIMER (ANTI OVERCONFIDENCE)
Analisa ini WAJIB mengidentifikasi titik paling rapuh dari thesis saat ini.
AI HARUS memilih 1–3 weakest link (prioritas tertinggi).
FORMAT WAJIB:
Weakest Link #1: [parameter paling menentukan]
Alasan: jelaskan mengapa parameter ini adalah penentu utama validitas thesis.
Monitoring wajib: indikator spesifik yang harus dipantau.
==================================================
DATA INPUT USER (JANGAN DIUBAH)
Saham: ${input.stockCode} (${input.marketCapCategory} CAP)
Harga: ${input.price}
Avg Price Top 3 Bandar: ${input.avgPriceTop3}
Posisi vs Bandar: ${brokerPosition} (${priceDiff.toFixed(2)}%)
Order Book: ${depthStatus}
Trade Book: ${tradeBookStatus}
Broker Summary (0–100): ${input.brokerSummaryVal}
Durasi Akumulasi: ${input.accumulationDuration} Hari
Analisa Durasi: ${accumulationAnalysis}
FUNDAMENTAL CONTEXT:
${fundamentalSnapshot}
INTELLIGENCE FEED (DATA MENTAH):
${input.rawIntelligenceData || "TIDAK ADA DATA FEED."}
==================================================
OUTPUT REQUIREMENTS
WAJIB output:
marketStructure
prediction (1–5 hari + risiko koreksi)
strategyType (Scalping / Swing / Invest / Avoid)
entryArea (berbasis probabilitas, bukan harga ideal)
targetPrice (pisahkan target utama & bull scenario)
stopLoss (selaras VaR / tail risk)
riskLevel (Low / Medium / High / Extreme)
longTermSuitability (Integrasikan data Fundamental CFO/Growth/Moat)
shortTermSuitability (Fokus pada Bandarmology & Market Depth)
thesisStatus (Valid / Weakened / Invalidated)
monitoringNotes (fokus pada weakest link)
reasoning (5–7 poin, tiap poin gabungkan angka + perilaku bandar + fundamental context)
brokerImplications: Penjelasan detail broker.
dynamicDisclaimer: Weakest Link analysis.

PRINSIP PENUTUP
Analisa ini adalah alat berpikir probabilistik.
GAYA BAHASA:
MENGGUNAKAN BAHASA INDONESIA.
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
