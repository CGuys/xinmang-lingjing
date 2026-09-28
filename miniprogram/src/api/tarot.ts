import { request } from '../utils/request';
import type { TarotCard, DrawCardResult, HistoryRecord } from '../types';

export interface CardResourceResult {
  card: TarotCard;
  assets: {
    home: { page: string; description: string; ossKey: string; imageUrl: string };
    reading: { page: string; description: string; ossKey: string; imageUrl: string };
    back: { page: string; description: string; ossKey: string; imageUrl: string };
  };
}

export function apiDrawCard(question?: string): Promise<DrawCardResult> {
  return request<DrawCardResult>({
    url: '/api/v1/tarot/draw',
    method: 'POST',
    data: { question: question || '' }
  });
}

export function apiGetCards(category?: string): Promise<{ total: number; cards: TarotCard[] }> {
  return request<{ total: number; cards: TarotCard[] }>({
    url: `/api/v1/tarot/cards${category ? `?category=${category}` : ''}`,
    method: 'GET'
  });
}

export function apiGetHistory(
  page = 1,
  pageSize = 10
): Promise<{ total: number; page: number; pageSize: number; items: HistoryRecord[] }> {
  return request<{ total: number; page: number; pageSize: number; items: HistoryRecord[] }>({
    url: `/api/v1/tarot/history?page=${page}&pageSize=${pageSize}`,
    method: 'GET'
  });
}

export function apiGetCardResource(query = '0'): Promise<CardResourceResult> {
  return request<CardResourceResult>({
    url: `/api/v1/tarot/card-resource?query=${encodeURIComponent(query)}`,
    method: 'GET'
  });
}

export function apiGetReading(readingId: string): Promise<{
  id: string;
  cardId: number;
  cardName: string;
  orientation: string;
  orientationName: string;
  userQuestion: string;
  readingResult: string;
  status: string;
  createdAt: string;
  card: TarotCard | null;
}> {
  return request({
    url: `/api/v1/tarot/reading/${readingId}`,
    method: 'GET'
  });
}

