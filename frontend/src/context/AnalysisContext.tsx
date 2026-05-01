/**
 * Analysis Context — Shares prediction results across all pages.
 *
 * - Current result is persisted in sessionStorage (survives refresh).
 * - History of past analyses is stored in localStorage (survives browser close).
 * - The result stays until the user explicitly starts a "New Analysis".
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { PredictResponse } from '../types';

const MAX_HISTORY = 20;
const SESSION_KEY = 'cxr_current_result';
const HISTORY_KEY = 'cxr_analysis_history';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  result: PredictResponse;
  imageUrl?: string;
}

interface AnalysisContextType {
  result: PredictResponse | null;
  setResult: (result: PredictResponse | null, imageUrl?: string) => void;
  clearResult: () => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;
  history: HistoryEntry[];
  loadFromHistory: (id: string) => void;
  deleteFromHistory: (id: string) => void;
  currentImageUrl: string | null;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

function loadSession(): PredictResponse | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(result: PredictResponse | null) {
  if (result) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(result));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResultState] = useState<PredictResponse | null>(loadSession);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  // Persist current result to sessionStorage whenever it changes
  useEffect(() => {
    saveSession(result);
  }, [result]);

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const setResult = (newResult: PredictResponse | null, imageUrl?: string) => {
    setResultState(newResult);
    if (imageUrl) setCurrentImageUrl(imageUrl);
    if (newResult) {
      const entry: HistoryEntry = {
        id: `analysis_${Date.now()}`,
        timestamp: new Date().toISOString(),
        result: newResult,
        imageUrl: imageUrl || undefined,
      };
      setHistory(prev => [entry, ...prev].slice(0, MAX_HISTORY));
    }
  };

  const clearResult = () => {
    setResultState(null);
    setCurrentImageUrl(null);
    saveSession(null);
  };

  const loadFromHistory = (id: string) => {
    const entry = history.find(h => h.id === id);
    if (entry) {
      setResultState(entry.result);
      setCurrentImageUrl(entry.imageUrl || null);
    }
  };

  const deleteFromHistory = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  return (
    <AnalysisContext.Provider value={{
      result, setResult, clearResult,
      isAnalyzing, setIsAnalyzing,
      history, loadFromHistory, deleteFromHistory,
      currentImageUrl
    }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}
