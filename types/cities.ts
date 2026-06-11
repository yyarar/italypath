export interface CityDetail {
  slug: string;
  name: string; // Turkish name (e.g. Milano)
  nameEn: string; // English name (e.g. Milan)
  region: string; // e.g. Lombardia
  costSourceName?: string;
  costSourceUrl?: string;
  costSourceLastUpdated?: string;
  costRating: 1 | 2 | 3 | 4 | 5; // €€€€€ rating
  studentPopulation: string; // e.g. "Çok Yüksek (>80.000)"
  studentPopulationEn: string; // e.g. "Very High (>80,000)"
  
  // Living Costs (Turkish)
  rentAverage: string;
  livingExpenses: string;
  transportCost: string;
  
  // Living Costs (English)
  rentAverageEn: string;
  livingExpensesEn: string;
  transportCostEn: string;
  
  // Transport details
  transportDetails: string;
  transportDetailsEn: string;
  
  // Climate & Vibe
  climateAndVibe: string;
  climateAndVibeEn: string;
  
  // Editorial Tip
  editorialTip: string;
  editorialTipEn: string;
}
