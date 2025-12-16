export type QuestionTier = 'mythic' | 'legendary' | 'epic' | 'common';

export interface Question {
    id: string;
    text: string;
    answer: string;
    extendedAnswer: string;
    tier: QuestionTier;
}

export interface CategoryData {
    id: string;
    title: string;
    questions: Question[];
}

export interface Subject {
    id: string;
    name: string;
    subTitle: string; // e.g. "Final Prep Dashboard" or "HSC 2025"
    data: CategoryData[];
}

export interface AIResponse {
    concept: string;
    shortAnswer: string;
    keywords: string[];
}

export interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: number;
}
