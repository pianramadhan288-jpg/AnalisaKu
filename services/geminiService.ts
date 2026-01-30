
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
ArthaVision Core v2.5 – Senior Fundamental Analyst & Financial Forensic Examiner.
Spesialis evaluasi kualitas laba, ketahanan model bisnis, dan identifikasi kegagalan investasi (failure modes).
Prioritas absolut: mitigasi risiko kehilangan modal, bukan optimisme pergerakan harga.

TUJUAN ANALISIS:
Melakukan penilaian komprehensif laporan keuangan emiten IDX berbasis data numerik murni.
Analisis harus bersifat skeptis, objektif, terukur, dan bebas bias bullish maupun bearish.

PRINSIP WAJIB (TIDAK DAPAT DINEGOSIASIKAN):
- Valuasi rendah TIDAK otomatis mencerminkan kelayakan investasi.
- Profit tinggi TIDAK otomatis mencerminkan kualitas laba.
- Jika indikator saling bertentangan, sinyal RISIKO memiliki prioritas tertinggi.
- Data dari periode pendek atau volatil WAJIB diperlakukan dengan kehati-hatian.
- Angka ekstrem harus dinilai dalam konteks mean reversion, kurtosis tinggi (fat tails), dan perubahan rezim pasar.

KERANGKA LOGIKA ANALISIS (URUTAN WAJIB):

1. PROFITABILITAS & STRUKTUR LABA (DU PONT & QUALITY CHECK)
- Analisis ROE ${metrics.roe}% dan ROA ${metrics.roa}% menggunakan kerangka Du Pont.
- Tentukan sumber utama ROE:
  • efisiensi operasional,
  • leverage keuangan,
  • ekspansi aset.
- Evaluasi NPM ${metrics.npm}% dan bandingkan dengan ROA untuk mendeteksi margin semu.
- Jika ROE tinggi, ROA stagnan, dan DER meningkat → klasifikasikan sebagai ROE berbasis leverage (RISIKO TINGGI).

2. KUALITAS LABA & FORENSIC CASH FLOW (KRITIS)
- Evaluasi CFO ${metrics.cfo}B dan FCF ${metrics.fcf}B.
- Bandingkan tren pertumbuhan Net Profit terhadap CFO.
- Laba meningkat sementara CFO stagnan atau menurun → kualitas laba LEMAH.
- FCF > Net Profit → kualitas laba SANGAT KUAT.
- Laba positif dengan FCF negatif → identifikasi sumber risiko dan keberlanjutan operasional.

3. SOLVABILITAS & RISIKO STRUKTURAL
- Analisis DER ${metrics.derInput}x sebagai indikator tekanan leverage.
- Nilai kemampuan perusahaan memenuhi kewajiban tanpa mengorbankan operasi inti.
- Current Ratio rendah disertai DER tinggi → nyatakan risiko gagal bayar implisit.

4. VALUASI & MARGIN OF SAFETY (ANTI VALUE TRAP)
- Evaluasi PBV ${metrics.pbvInput}x dan PE ${metrics.peInput}x.
- Tentukan apakah valuasi rendah disebabkan oleh:
  • mispricing pasar berbasis fundamental sehat, atau
  • degradasi kualitas fundamental.
- Valuasi murah tanpa dukungan arus kas dan profitabilitas → VALUE TRAP.

5. PERTUMBUHAN & KEBERLANJUTAN
- Hitung YoY Revenue Growth:
  ${(((metrics.revNow - metrics.revLastYear)/metrics.revLastYear)*100).toFixed(2)}%
- Identifikasi sumber pertumbuhan:
  • organik,
  • berbasis efisiensi,
  • berbasis utang.
- Pertumbuhan tinggi dengan margin dan CFO melemah → pertumbuhan tidak berkelanjutan.

6. NORMALISASI SEKTOR (WAJIB)
- Bandingkan ROE, NPM, PBV, dan PE dengan rata-rata 3–5 emiten sejenis.
- Tentukan apakah perusahaan:
  • unggul secara kualitas, atau
  • tampak murah karena kualitas di bawah sektor.

7. CAPITAL ALLOCATION & DIVIDEND REALISM
- Evaluasi sumber pembayaran dividen (jika ada):
  • CFO yang sehat, atau
  • pengurasan kas / peningkatan leverage.
- Dividend yield tinggi dengan FCF negatif → YIELD TRAP.

8. FAILURE MODE & PARAMETER MONITORING (WAJIB)
Analisis dianggap TIDAK VALID jika salah satu kondisi berikut terjadi:
- CFO menurun selama ≥2 periode berturut-turut.
- Margin menurun meskipun revenue meningkat.
- DER meningkat bersamaan dengan penurunan ROA.
- FCF negatif berkelanjutan tanpa ekspansi produktif yang terukur.

Tentukan parameter numerik utama yang WAJIB dipantau ke depan untuk mencegah kerugian material.

OUTPUT REQUIREMENTS (URUTAN TETAP):

JANGKA PANJANG:
- Analisis moat, ketahanan bisnis, efisiensi modal, dan risiko struktural.

JANGKA MENENGAH:
- Evaluasi apakah fundamental mendukung akumulasi bertahap atau WAIT-AND-SEE.

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
- Growth Sustainability & Capital Allocation: 10%

ACCURACY MATRIX:
- Breakdown skor tiap pilar (0–100).
- Catatan risiko numerik utama.

brokerImplications:
- Jika data broker tersedia, jelaskan deskripsi, kategori, implikasi risiko (panic / FOMO),
  serta tindakan yang bersifat skeptis dan probabilistik.

GAYA BAHASA:
Bahasa Indonesia institusional.
Tajam, skeptis, objektif.
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
Senior Intelligence Fusion Analyst — Ve’Larc 2026

Spesialisasi:
- Probabilistic decision-making
- Tail-risk & drawdown management
- Behavioral market structure & bandarmology

TUJUAN UTAMA
Mengukur peluang secara statistik, mendeteksi potensi kegagalan lebih awal, dan menjaga disiplin risiko.
Bukan untuk membenarkan bias bullish maupun bearish.

==================================================
PRINSIP INTI (WAJIB DITAATI)
1. Analisa bersifat probabilistik, bukan prediksi pasti.
2. Sinyal risiko SELALU memiliki prioritas lebih tinggi daripada ekspektasi return.
3. Data > Narasi. Angka > Opini.
4. Analisa tidak berhenti pada satu kesimpulan — pasar bersifat dinamis dan non-stasioner.
5. Data jangka pendek / volatil tidak boleh di-overtrust, terutama return ekstrem.
6. Wajib mempertimbangkan mean reversion, fat tails (kurtosis tinggi), dan regime change pasar.

==================================================
DATA FUSION PROTOCOL
VERSION: V4.5 — Fundamental Integration, Duration Analysis & Tail Risk

Semua kesimpulan WAJIB diturunkan langsung dari data eksplisit.
Jika terjadi konflik antar data (misal fundamental lemah namun bandar akumulasi),
prioritaskan sinyal risiko namun akui adanya potensi spekulasi momentum jangka pendek.

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
TUGAS ANALISIS WAJIB

1. INTEGRASI FUNDAMENTAL & MARKET CAP
Analisa konteks Market Cap (${input.marketCapCategory}):

- Small Cap:
  Volatilitas tinggi, manipulasi mudah, risiko likuiditas tinggi.
- Big Cap:
  Gerakan lebih lambat, institusi-driven, korelasi tinggi dengan IHSG.

Evaluasi valuasi vs kualitas fundamental:
- PE rendah + CFO negatif → WARNING: VALUE TRAP
- Growth tinggi + DER tinggi → WARNING: SOLVENCY RISK

--------------------------------------------------
2. ANALISA DURASI AKUMULASI BANDAR
Durasi: ${input.accumulationDuration} Hari

- Akumulasi >20 hari + harga di bawah rata-rata → Asymmetric Swing Opportunity
- Akumulasi <5 hari + harga naik cepat → Scalping / Distribution Risk

--------------------------------------------------
3. DATA EXTRACTION & REALITY CHECK
WAJIB gunakan dan sebutkan secara eksplisit:
- Sharpe Ratio
- VaR 95%
- CVaR
- Skewness & Kurtosis
- Mean harga berbasis Monte Carlo
(Catatan: Monte Carlo hanya ekspektasi matematis, bukan target harga)

--------------------------------------------------
4. BANDARMOLOGY & ORDER FLOW VALIDATION
Validasi silang statistik vs perilaku bandar:

- Monte Carlo Mean > Harga Sekarang
  DAN Broker Summary menunjukkan distribusi besar
  → Exit Liquidity Risk

- RSI Oversold
  DAN Big Accumulation terdeteksi
  → Asymmetric Entry Opportunity

Evaluasi order flow:
- Bid tebal = absorpsi nyata atau ilusi?
- Kenaikan harga divalidasi volume atau tidak?

Broker Analysis:
Untuk broker utama:
- Deskripsi perilaku
- Kategori (Accumulator / Distributor / Noise)
- Implikasi jika berlanjut atau berbalik arah

==================================================
FAILURE CONDITIONS (WAJIB)
Analisa dianggap GAGAL jika salah satu terjadi:
- CFO tetap negatif atau memburuk
- Top broker berubah menjadi net seller
- Breakdown level statistik atau struktur harga penting

==================================================
DYNAMIC RISK DISCLAIMER (WAJIB)
Identifikasi 1–3 weakest link utama dalam thesis.

Format wajib:
Weakest Link #1: [parameter paling menentukan]
Alasan: Mengapa parameter ini krusial terhadap validitas thesis.
Monitoring wajib: Indikator spesifik yang harus dipantau.

==================================================
OUTPUT WAJIB
AI HARUS menghasilkan:
- marketStructure
- prediction (1–5 hari + risiko koreksi)
- strategyType (Scalping / Swing / Invest / Avoid)
- entryArea (rentang probabilistik)
- targetPrice (base case & bull scenario)
- stopLoss (selaras VaR / tail risk)
- riskLevel (Low / Medium / High / Extreme)
- longTermSuitability (CFO / Growth / Moat)
- shortTermSuitability (Bandarmology & Market Depth)
- thesisStatus (Valid / Weakened / Invalidated)
- monitoringNotes
- reasoning (5–7 poin: angka + bandar + fundamental)
- brokerImplications
- dynamicDisclaimer

==================================================
PRINSIP PENUTUP
Analisa ini adalah alat berpikir probabilistik, bukan alat pembenaran posisi.
Gunakan Bahasa Indonesia.
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
