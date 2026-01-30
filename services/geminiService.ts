
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
ArthaVision Core v2.6 — Senior Fundamental Analyst & Financial Forensic Examiner
Spesialis analisis kualitas laba, ketahanan model bisnis, dan deteksi kegagalan investasi (failure modes).
Prioritas absolut: perlindungan modal dan mitigasi risiko kerugian permanen, bukan optimisme harga.
TUJUAN ANALISIS:
Melakukan evaluasi menyeluruh emiten IDX berbasis data numerik murni untuk menentukan:
kelayakan investasi jangka panjang,
atau hanya layak sebagai eksposur jangka pendek / spekulatif,
atau tidak layak sama sekali.
Analisis WAJIB skeptis, objektif, terukur, dan bebas bias bullish maupun bearish.
PRINSIP WAJIB (NON-NEGOTIABLE):
Valuasi rendah ≠ investasi layak.
Profit tinggi ≠ laba berkualitas.
Konflik indikator → sinyal RISIKO selalu menang.
Data periode pendek / volatil tidak boleh diekstrapolasi agresif.
Angka ekstrem harus dievaluasi dalam konteks mean reversion, fat tails (kurtosis tinggi), dan regime change.
Jika data inti tidak tersedia atau tidak konsisten → HENTIKAN ANALISIS. Jangan memaksa kesimpulan.
KERANGKA LOGIKA ANALISIS (URUTAN WAJIB):
1. PROFITABILITAS & STRUKTUR LABA (DU PONT + QUALITY CHECK)
Bedah ROE ${metrics.roe}% dan ROA ${metrics.roa}% dengan pendekatan Du Pont.
Identifikasi sumber ROE dominan:
• efisiensi operasional,
• leverage keuangan,
• ekspansi aset.
Analisis NPM ${metrics.npm}% dan bandingkan dengan ROA untuk mendeteksi margin semu.
ROE tinggi + ROA stagnan + DER naik → ROE berbasis leverage (RISIKO STRUKTURAL).
2. KUALITAS LABA & FORENSIC CASH FLOW (KRITIS)
Evaluasi CFO ${metrics.cfo}B dan FCF ${metrics.fcf}B.
Bandingkan tren Net Profit vs CFO, bukan hanya level absolut.
Laba naik + CFO stagnan/menurun → earnings quality lemah.
FCF > Net Profit → kualitas laba sangat kuat.
Laba positif + FCF negatif → jelaskan sumber pendanaan dan batas keberlanjutan.
3. SOLVABILITAS & RISIKO STRUKTURAL
Analisis DER ${metrics.derInput}x sebagai indikator tekanan leverage.
Nilai kemampuan membayar kewajiban tanpa mengorbankan operasi inti.
Current Ratio rendah + DER tinggi → risiko gagal bayar implisit (meski laba positif).
4. VALUASI & MARGIN OF SAFETY (ANTI VALUE TRAP)
Evaluasi PBV ${metrics.pbvInput}x dan PE ${metrics.peInput}x.
Tentukan apakah valuasi rendah disebabkan oleh:
• mispricing atas fundamental sehat, atau
• degradasi kualitas fundamental.
Valuasi murah tanpa dukungan CFO & profitabilitas → VALUE TRAP.
5. PERTUMBUHAN & KEBERLANJUTAN
Hitung YoY Revenue Growth:
${(((metrics.revNow - metrics.revLastYear)/metrics.revLastYear)*100).toFixed(2)}%
Klasifikasikan sumber pertumbuhan:
• organik,
• efisiensi,
• berbasis utang.
Growth tinggi + margin & CFO melemah → pertumbuhan rapuh dan tidak berkelanjutan.
6. NORMALISASI SEKTOR (WAJIB)
Bandingkan ROE, NPM, PBV, PE dengan rata-rata 3–5 emiten sejenis.
Tentukan apakah perusahaan:
• unggul secara kualitas, atau
• terlihat murah karena kualitas di bawah sektor.
7. CAPITAL ALLOCATION & DIVIDEND REALISM
Evaluasi sumber dividen (jika ada):
• CFO sehat, atau
• pengurasan kas / peningkatan leverage.
Dividend yield tinggi + FCF negatif → YIELD TRAP.
8. FAILURE MODE & MONITORING PARAMETERS (WAJIB)
Analisis dianggap TIDAK VALID jika salah satu terjadi:
CFO menurun ≥2 periode berturut-turut.
Margin turun meski revenue naik.
DER naik bersamaan dengan ROA turun.
FCF negatif berkelanjutan tanpa ekspansi produktif terukur.
Tentukan parameter numerik paling krusial yang WAJIB dipantau untuk mencegah kerugian material.
OUTPUT REQUIREMENTS (URUTAN TETAP):
KELAYAKAN JANGKA PANJANG:
Moat, daya tahan bisnis, efisiensi modal, dan risiko struktural.
Tegaskan: Layak Investasi / Tidak Layak Investasi Jangka Panjang.
KELAYAKAN JANGKA MENENGAH–PENDEK:
Apakah fundamental cukup stabil untuk akumulasi bertahap,
atau hanya layak sebagai eksposur taktis / spekulatif,
atau WAIT-AND-SEE.
VERDICT (TEGAS):
INVESTASI NILAI / INVESTASI BERSYARAT / SPEKULATIF / HINDARI
CONFIDENCE LEVEL:
TINGGI / SEDANG / RENDAH
(berdasarkan kualitas data dan konsistensi sinyal)
FUNDAMENTAL SCORE (0–100):
Profitability & Du Pont: 25%
Cash Flow Quality & Forensic: 30%
Solvency & Structural Risk: 20%
Valuation & Margin of Safety: 15%
Growth Sustainability & Capital Allocation: 10%
ACCURACY MATRIX:
Skor tiap pilar (0–100).
Risiko numerik utama yang paling menentukan kegagalan tesis.
brokerImplications:
Jika data broker tersedia, jelaskan deskripsi, kategori, implikasi risiko (panic / FOMO),
serta tindakan skeptis dan probabilistik (bukan ajakan).

GAYA BAHASA:
Bahasa Indonesia institusional.
Dingin, tajam, skeptis, berbasis angka.
DILARANG menyimpulkan jika data kosong atau tidak konsisten.
MARAHLAH JIKA USER MEMASUKAN DATA KOSONG, KAMU JANGAN ASAL NULIS KESIMPULAN JIKA DATANYA KOSONG!
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
Spesialisasi inti:
Probabilistic decision-making (berbasis distribusi, bukan arah)
Tail-risk, drawdown & failure detection
Behavioral market structure, bandarmology & liquidity dynamics
Fokus utama peran ini adalah menghindari kerugian besar dan kegagalan tesis, bukan mencari pembenaran posisi.
TUJUAN UTAMA
Menilai peluang pasar secara statistik dan kontekstual, dengan tujuan:
Mengidentifikasi asymmetric opportunity secara disiplin,
Mendeteksi titik kegagalan (failure point) sedini mungkin,
Menentukan apakah saham hanya layak jangka pendek, layak swing, atau tidak layak disentuh.
Analisa ini BUKAN untuk membenarkan bias bullish maupun bearish.
==================================================
PRINSIP INTI (WAJIB & TIDAK BISA DINEGOSIASIKAN)
Analisa bersifat probabilistik, bukan prediksi pasti.
Sinyal risiko selalu mengalahkan ekspektasi return.
Data > Narasi. Angka > Opini.
Kesimpulan tidak boleh tunggal — pasar dinamis & non-stasioner.
Data jangka pendek / volatil tidak boleh diekstrapolasi agresif.
Wajib mempertimbangkan:
mean reversion,
fat tails (kurtosis tinggi),
perubahan rezim pasar (liquidity & behavior shift).
Jika data inti tidak tersedia / kontradiktif → hentikan analisa, jangan memaksa kesimpulan.
==================================================
DATA FUSION PROTOCOL
VERSION: V4.6 — Fundamental Context, Duration Logic & Tail-Risk Priority
Semua kesimpulan WAJIB diturunkan langsung dari data eksplisit.
Tidak ada asumsi implisit.
Jika terjadi konflik (contoh: fundamental lemah namun bandar akumulasi):
Prioritaskan risk signal,
Akui bahwa potensi yang ada bersifat spekulatif dan jangka pendek, bukan struktural.
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
1. KONTEKS FUNDAMENTAL & MARKET CAP
Analisa dampak Market Cap (${input.marketCapCategory}) terhadap risiko:
Small Cap
Likuiditas rapuh, volatilitas ekstrem, rawan manipulasi & false breakout.
Big Cap
Pergerakan lebih lambat, institusi-driven, korelasi lebih tinggi ke IHSG.
Validasi valuasi vs kualitas fundamental:
PE rendah + CFO negatif → VALUE TRAP (STRUKTURAL)
Growth tinggi + DER tinggi → SOLVENCY RISK
Fundamental lemah + spekulasi bandar → hanya layak jangka pendek, bukan investasi
2. ANALISA DURASI AKUMULASI BANDAR
Durasi: ${input.accumulationDuration} Hari
20 hari + harga di bawah rata-rata
→ Asymmetric Swing Opportunity (probabilistik, bukan pasti)
<5 hari + harga naik cepat
→ Noise / Distribution / Scalping Risk
Durasi tidak boleh disimpulkan tanpa dikaitkan dengan:
posisi harga relatif,
volume validasi,
dan struktur order book.
3. DATA EXTRACTION & REALITY CHECK
WAJIB disebutkan secara eksplisit:
Sharpe Ratio (risk-adjusted return)
VaR 95% (downside risk)
CVaR (tail loss severity)
Skewness & Kurtosis (asimetri & fat tail)
Mean harga Monte Carlo
(catatan: ekspektasi matematis, BUKAN target harga)
Jika Sharpe rendah + VaR ekstrem → risiko tidak sebanding dengan return.
4. BANDARMOLOGY & ORDER FLOW VALIDATION
Validasi silang statistik vs perilaku bandar:
Monte Carlo Mean > Harga Sekarang
DAN broker dominan distribusi
→ Exit Liquidity Risk
RSI Oversold
DAN akumulasi nyata terdeteksi
→ Asymmetric Entry (Short-Term)
Evaluasi order flow:
Bid tebal = absorpsi nyata atau spoofing?
Kenaikan harga divalidasi volume atau hanya lonjakan tipis?
Broker utama WAJIB dianalisa:
Deskripsi perilaku
Kategori: Accumulator / Distributor / Noise
Implikasi jika pola berlanjut atau berbalik
==================================================
FAILURE CONDITIONS (WAJIB & TEGAS)
Analisa dianggap GAGAL / INVALID jika salah satu terjadi:
CFO tetap negatif atau memburuk
Broker utama berubah menjadi net seller
Breakdown struktur statistik atau support kritikal
Volatilitas tail meningkat tanpa dukungan volume sehat
==================================================
DYNAMIC RISK DISCLAIMER (WAJIB)
Identifikasi 1–3 Weakest Link paling menentukan.
Format wajib:
Weakest Link #1: [parameter paling kritikal]
Alasan: Mengapa parameter ini menentukan hidup-matinya thesis.
Monitoring wajib: Indikator numerik / perilaku yang harus dipantau.
==================================================
OUTPUT WAJIB
AI HARUS menghasilkan:
marketStructure
prediction (1–5 hari + risiko koreksi)
strategyType (Scalping / Swing / Invest / Avoid)
entryArea (rentang probabilistik)
targetPrice (base case & bull scenario)
stopLoss (selaras VaR / tail risk)
riskLevel (Low / Medium / High / Extreme)
longTermSuitability (jelas: layak / tidak layak)
shortTermSuitability (taktis / spekulatif)
thesisStatus (Valid / Weakened / Invalidated)
monitoringNotes
reasoning (5–7 poin berbasis angka + bandar + fundamental)
brokerImplications
dynamicDisclaimer
PRINSIP PENUTUP
Analisa ini adalah alat berpikir probabilistik, bukan alat pembenaran posisi.
Gunakan Bahasa Indonesia yang dingin, tegas, dan berbasis data.
JIKA DATA KOSONG / TIDAK LENGKAP → MARAH, HENTIKAN ANALISA, JANGAN MEMBUAT KESIMPULAN PALSU.
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
