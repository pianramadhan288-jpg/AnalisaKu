
export interface StockMetrics {
  roe: number; roa: number; npm: number; pbvInput: number;
  revenue: number; grossProfit: number; operatingProfit: number;
  eps: number; peInput: number; psInput: number; ebitda: number;
  totalAssets: number; totalLiabilities: number; totalEquity: number;
  currentAssets: number; currentLiabilities: number; cash: number;
  inventory: number; derInput: number;
  cfo: number; capex: number; fcf: number;
  revNow: number; revPrev: number; revLastYear: number;
  price: number; bvps: number; revps: number;
}

export interface PeerData {
  roe: number; roa: number; npm: number;
  per: number; pbv: number; ps: number;
  der: number; cr: number;
}

export interface AIAnalysisResult {
  executiveSummary: string;
  longTermInsight: string;
  shortTermInsight: string;
  verdict: 'INVESTASI_NILAI' | 'SPEKULATIF' | 'TRADING_MOMENTUM' | 'HINDARI';
  fundamentalScore: number;
  recommendation: string;
  riskAnalysis: string[];
  competitiveMoat: string;
  accuracyMatrix: {
    profitabilityQuality: number;
    solvencyRisk: number;
    valuationMargin: number;
    cashFlowIntegrity: number;
  };
}

export type BrokerType = 'RICH' | 'KONGLO' | 'AMPAS' | 'CAMPUR' | 'UNKNOWN';

export interface BrokerInfo {
  code: string;
  type: BrokerType;
  desc: string;
}

export interface AnalisaInput {
  stockCode: string;
  price: number;
  
  // Market Depth (Order Book - Niat)
  totalBidVol: number;
  totalOfferVol: number;
  
  // Trade Book (Done Data - Aksi Nyata)
  tradeBookBuyVol: number; // Hajar Kanan (HK)
  tradeBookSellVol: number; // Hajar Kiri (Haki)
  
  totalBuyFreq: number;
  totalSellFreq: number;
  
  brokerSummaryVal: number; 
  avgPriceTop3: number;
  topBrokers: string;
  rawIntelligenceData?: string;
  
  // Money Management
  capital: number;

  // NEW: Contextual Data
  marketCapCategory: 'SMALL' | 'MID' | 'BIG';
  accumulationDuration: number; // Hari

  // NEW: Fundamental Context
  roe: number;
  roa: number;
  der: number;
  per: number;
  pbv: number;
  npm: number;
  cfo: number;
  fcf: number;
  revenueGrowth: number;
}

export interface PublicCompanyData {
  companyName: string;
  sector: string;
  address: string;
  management: {
    presDir: string;
    directors: string[];
    commissioners: string[];
  };
  ownership: string[];
  corporateActions: string[];
  prospectusSummary: string;
  keyFinancials: {
    assets: string;
    equity: string;
    revenue: string;
    netProfit: string;
  };
  marketData: {
    price: string;
    foreignFlow: string;
  };
  kseiStats: {
    sidCount: string;
    investorDist: string;
  };
  news: {
    title: string;
    source: string;
    url: string;
  }[];
}

export interface DeepAnalysisResult {
  marketStructure: string; 
  prediction: string; 
  strategyType: string;
  entryArea: string;
  targetPrice: string;
  stopLoss: string;
  riskLevel: string;
  longTermSuitability: string;
  shortTermSuitability: string;
  reasoning: string[];
  dynamicDisclaimer: string;
}
