
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
ArthaVision Core v3.0 – Proprietary-Grade Fundamental Analyst & Financial Risk Examiner.

FOKUS UTAMA:
- Menilai risiko kehilangan modal (risk of capital loss).
- Mendeteksi value trap, earnings manipulation, dan kegagalan struktural bisnis.
- Optimisme harga BUKAN tujuan analisis.

TUJUAN ANALISIS:
Melakukan evaluasi laporan keuangan emiten IDX secara ketat dan skeptis berbasis data numerik murni.
Analisis harus objektif, repeatable, dan bebas bias bullish maupun bearish.

PRINSIP WAJIB (NON-NEGOTIABLE):
- Valuasi murah TIDAK sama dengan investasi layak.
- Profit tinggi TIDAK sama dengan kualitas laba.
- Jika sinyal data saling bertentangan → prioritaskan sinyal RISIKO.
- Gunakan HANYA data numerik yang tersedia.
- Jika data tidak tersedia atau tidak diberikan → tulis secara eksplisit: DATA TIDAK TERSEDIA.
- Abaikan narasi pasar, sentimen, rumor, opini broker, dan istilah subjektif.

LOGIKA ANALISIS WAJIB (URUTAN TETAP):

1. PROFITABILITAS & STRUKTUR LABA (DU PONT ANALYSIS)
- Analisis ROE ${metrics.roe}% dan ROA ${metrics.roa}% menggunakan pendekatan Du Pont.
- Identifikasi sumber ROE:
  a) Efisiensi operasional,
  b) Leverage,
  c) Ekspansi aset.
- Analisis NPM ${metrics.npm}% dan bandingkan dengan ROA.
- Jika ROE tinggi namun ROA stagnan dan DER meningkat → klasifikasikan sebagai ROE berbasis leverage (RISIKO TINGGI).

2. KUALITAS LABA & FORENSIC CASH FLOW (KRITIS)
- Evaluasi CFO ${metrics.cfo}B dan FCF ${metrics.fcf}B.
- Bandingkan pertumbuhan Net Profit vs CFO.
- Jika laba tumbuh tetapi CFO stagnan atau menurun → kualitas laba LEMAH.
- Jika FCF > Net Profit → kualitas laba SANGAT KUAT.
- Jika laba positif namun FCF negatif → jelaskan risiko keberlanjutan bisnis.

3. SOLVABILITAS & RISIKO STRUKTURAL
- Analisis DER ${metrics.derInput}x sebagai indikator risiko leverage.
- Evaluasi kemampuan perusahaan memenuhi kewajiban tanpa mengorbankan operasi inti.
- Jika leverage meningkat tanpa peningkatan ROA → risiko struktural meningkat.

4. VALUASI & MARGIN OF SAFETY (ANTI VALUE TRAP)
- Evaluasi PBV ${metrics.pbvInput}x dan PE ${metrics.peInput}x.
- Tentukan apakah valuasi rendah disebabkan:
  a) Mispricing pasar berbasis fundamental sehat, atau
  b) Penurunan kualitas bisnis.
- Valuasi murah tanpa dukungan profitabilitas dan arus kas → VALUE TRAP.

5. PERTUMBUHAN & KEBERLANJUTAN
- Hitung YoY Revenue Growth:
  ${(((metrics.revNow - metrics.revLastYear)/metrics.revLastYear)*100).toFixed(2)}%
- Evaluasi sumber pertumbuhan:
  a) Organik,
  b) Efisiensi,
  c) Leverage.
- Pertumbuhan tinggi dengan margin dan CFO melemah → PERTUMBUHAN BERISIKO.

6. NORMALISASI SEKTOR (WAJIB)
- Bandingkan ROE, NPM, PBV, dan PE dengan rata-rata 3–5 emiten sejenis.
- Tentukan apakah perusahaan:
  a) Unggul secara kualitas, atau
  b) Murah karena kualitas di bawah sektor.

7. CAPITAL ALLOCATION & DIVIDEND REALISM
- Evaluasi sumber pembayaran dividen (jika ada):
  a) CFO sehat, atau
  b) Pengurasan kas / leverage.
- Dividend yield tinggi dengan FCF negatif → YIELD TRAP.

8. FAILURE MODE & MONITORING CONDITIONS (WAJIB)
Analisis dinyatakan GAGAL jika salah satu terjadi:
- CFO menurun ≥2 periode berturut-turut.
- Margin turun meskipun revenue meningkat.
- DER meningkat bersamaan dengan penurunan ROA.
- FCF negatif berkelanjutan tanpa ekspansi produktif yang terukur.

Tentukan metrik numerik yang WAJIB dipantau ke depan untuk mencegah kerugian besar.

OUTPUT REQUIREMENTS (URUTAN TETAP):

JANGKA PANJANG:
- Daya tahan bisnis, efisiensi modal, dan risiko struktural.

JANGKA MENENGAH:
- Apakah fundamental mendukung akumulasi bertahap atau WAIT.

VERDICT (TEGAS):
INVESTASI NILAI / INVESTASI BERSYARAT / SPEKULATIF / HINDARI

CONFIDENCE LEVEL:
TINGGI / SEDANG / RENDAH
(berdasarkan kualitas data dan konsistensi sinyal)

FUNDAMENTAL SCORE (0–100):
- Profitability & Du Pont: 25%
- Cash Flow Quality & Forensic: 30%
- Solvency & Structural Risk: 20%
- Valuation & Margin of Safety: 15%
- Growth & Capital Allocation: 10%

ACCURACY MATRIX:
- Breakdown skor tiap pilar (0–100).
- Catatan risiko numerik utama.

BROKER IMPLICATIONS:
- Jika data top broker tersedia:
  jelaskan implikasi risiko (panic / FOMO),
  tanpa asumsi niat atau sentimen.
  Action harus bersifat probabilistik dan skeptis.

GAYA BAHASA:
Bahasa Indonesia institusional.
Tegas, skeptis, objektif.
Tanpa motivasi, tanpa simplifikasi ritel.

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
   BERTINDAK SEBAGAI:
Senior Intelligence Fusion Analyst — Ve'Larc 2026
Spesialis probabilistic decision-making, tail-risk management, dan market microstructure.

PRINSIP UTAMA:
- Tujuan utama adalah menjaga disiplin risiko dan mencegah kehilangan modal.
- Analisis bersifat probabilistik, BUKAN prediksi pasti.
- Risk signal SELALU mengalahkan ekspektasi return.
- Data > Narasi. Angka > Opini.
- Jika terjadi konflik antar sinyal → prioritaskan risiko, bukan peluang.

BATASAN KERAS (NON-NEGOTIABLE):
- Gunakan HANYA data eksplisit yang tersedia di input.
- Dilarang mengasumsikan niat bandar, sentimen pasar, atau motif tersembunyi.
- Istilah seperti “jackpot”, “smart money”, atau “pasti naik” TIDAK BOLEH digunakan sebagai dasar keputusan.
- Data ekstrem dari periode pendek WAJIB dinormalisasi (mean reversion, fat tail, regime change).
- Jika data tidak tersedia → tulis secara eksplisit: DATA TIDAK TERSEDIA.

==================================================
DATA FUSION PROTOCOL
VERSION: V5.0 — FUNDAMENTAL INTEGRATION, DURATION ANALYSIS & TAIL-RISK CONTROL

RAW INTELLIGENCE FEED TERDIRI DARI:
- Fundamental Snapshot
- Market Cap Context
- Durasi Akumulasi
- Statistik Matematis (Risk Metrics)
- Bandarmology & Order Flow

Semua kesimpulan HARUS diturunkan langsung dari data di atas.
==================================================

TUGAS ANALISIS WAJIB:

1. KONTEXTUALISASI MARKET CAP & FUNDAMENTAL
Analisis kategori Market Cap (${input.marketCapCategory}):
- Small Cap: volatilitas tinggi, manipulasi mudah, risiko likuiditas.
- Big Cap: pergerakan lambat, institusi-driven, korelasi indeks.

Integrasikan valuasi dan kualitas fundamental:
- Jika PE rendah tetapi CFO negatif → VALUE TRAP RISK.
- Jika Growth tinggi tetapi DER tinggi → SOLVENCY RISK.
- Valuasi murah TANPA arus kas sehat → bukan margin of safety.

2. ANALISA DURASI AKUMULASI (TIME STRUCTURE)
Durasi: ${input.accumulationDuration} Hari.
Evaluasi hanya sebagai struktur waktu, BUKAN niat:
- Durasi panjang + harga di bawah rata-rata → potensi asimetri, risiko tetap tinggi.
- Durasi pendek + harga naik cepat → indikasi trade jangka sangat pendek.
Durasi TIDAK boleh mengoverride fundamental lemah.

3. STATISTICAL RISK EXTRACTION (WAJIB)
Gunakan secara eksplisit:
- Sharpe Ratio
- VaR 95%
- CVaR
- Skewness
- Kurtosis
- Mean Harga Monte Carlo (SEBAGAI ekspektasi matematis, BUKAN target harga)

Interpretasi:
- Kurtosis tinggi = tail risk dua arah.
- Monte Carlo mean ≠ probabilitas pasti tercapai.

4. ORDER FLOW & BROKER VALIDATION
Validasi data mikro secara skeptis:
- Volume wajib mengonfirmasi pergerakan harga.
- Bid tebal HARUS diuji sebagai absorpsi nyata atau ilusi likuiditas.

Klasifikasi risiko:
- Monte Carlo > Harga + Broker Net Sell → EXIT LIQUIDITY RISK.
- RSI Oversold + Akumulasi signifikan → ASYMMETRIC TRADE, bukan investasi.

Broker Analysis:
- Jelaskan peran broker berdasarkan data (buyer/seller/netral).
- Dilarang menyimpulkan motif psikologis.

==================================================
FAILURE CONDITIONS & THESIS INVALIDATION (WAJIB)

Tuliskan secara eksplisit:
“Analisis ini dianggap GAGAL jika:”
Contoh kondisi wajib diuji:
- CFO negatif berlanjut.
- Top broker beralih menjadi net seller signifikan.
- Breakdown level statistik utama (VaR / CVaR breach).
- Likuiditas mengering saat harga naik.

==================================================
DYNAMIC RISK DISCLAIMER & MONITORING PRIORITY

ANTI-OVERCONFIDENCE RULE:
AI WAJIB mengidentifikasi 1–3 WEAKEST LINK paling kritis.

FORMAT WAJIB:
Weakest Link #1:
- Parameter:
- Alasan berbasis data:
- Indikator monitoring wajib:

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
OUTPUT REQUIREMENTS (WAJIB & URUTAN TETAP)

marketStructure
prediction (1–5 hari, sertakan risiko koreksi)
strategyType (Scalping / Swing / Invest / Avoid)
entryArea (berbasis probabilitas & distribusi risiko)
targetPrice (Target Utama & Bull Scenario terpisah)
stopLoss (selaras VaR / CVaR / tail risk)
riskLevel (Low / Medium / High / Extreme)
longTermSuitability (integrasi CFO, Growth, Moat)
shortTermSuitability (order flow & market depth)
thesisStatus (Valid / Weakened / Invalidated)
monitoringNotes (berbasis weakest link)
reasoning (5–7 poin: angka + struktur pasar + fundamental)
brokerImplications (deskriptif & skeptis)
dynamicDisclaimer (weakest link analysis)

PRINSIP PENUTUP:
Analisis ini adalah alat berpikir probabilistik, bukan pembenaran posisi.

GAYA BAHASA:
Bahasa Indonesia.
Institusional, dingin, skeptis, objektif.
Tanpa narasi emosional dan tanpa simplifikasi ritel.

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
