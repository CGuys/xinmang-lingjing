export interface TarotCard {
  index: number;
  name?: string;
  nameCn: string;
  nameEn: string;
  slug: string;
  category: string;
  categoryName: string;
  roman?: string | null;
  image: string;
  imageLarge: string;
  backImage: string;
  element?: string | null;
  tags: string[];
  quote: string;
  insight?: string;
  challenge?: string;
  guidance?: string;
  affirmation?: string;
  orientation?: 'upright' | 'reversed' | string;
  orientationName?: string;
}

export interface UserProfile {
  userId: string;
  openid: string;
  hasFreeToday: boolean;
  dailyFreeLimit?: number;
  freeEnergyUsedToday?: number;
  freeEnergyAvailable: number;
  bonusEnergy: number;
  totalAvailable: number;
  lastFreeDate: string | null;
  isBlacklisted?: boolean;
}

export interface DrawCardResult {
  readingId: string;
  card: TarotCard;
  energyConsumed: 'free' | 'bonus';
  remainingBonus: number;
  createdAt: string;
}

export interface StructuredInsight {
  category: string;
  insight: string;
  challenge: string;
  guidance: string;
  affirmation: string;
}

export interface HistoryRecord {
  id: string;
  cardId: number;
  cardName: string;
  orientation: string;
  userQuestion: string | null;
  readingResult: string | null;
  status: string;
  createdAt: string;
  cardMeta?: {
    nameEn: string;
    image: string;
    imageLarge: string;
    tags: string[];
    quote: string;
  } | null;
}

export interface ApiResponse<T = any> {
  code: string;
  message: string;
  data: T;
}
