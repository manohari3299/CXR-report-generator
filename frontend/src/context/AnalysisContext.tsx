/**
 * Analysis Context — Shares prediction results across all pages.
 *
 * When the Upload page completes an analysis, the result is stored here
 * and accessible from Evidence Explorer, Disagreement, Reports, and Overview.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { PredictResponse } from '../types';

interface AnalysisContextType {
  result: PredictResponse | null;
  setResult: (result: PredictResponse | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  return (
    <AnalysisContext.Provider value={{ result, setResult, isAnalyzing, setIsAnalyzing }}>
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
