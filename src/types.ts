export interface NutritionalInfo {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
}

export interface DiaryEntry {
  id: string;
  date: string; // ISO string representation of the date (YYYY-MM-DD)
  timestamp: number;
  imageUrl?: string;
  nutrition: NutritionalInfo;
}

export interface DailySummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  entries: DiaryEntry[];
}
