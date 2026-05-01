/**
 * API response types for the CXR Report Generator backend.
 */

export interface EvidenceCase {
  rank: number;
  similarity: number;
  distance: number;
  weight: number;
  report_snippet: string;
  label: string;
  alignment: 'supports' | 'conflicts' | 'neutral';
  disagreement_score: number;
}

export interface PredictResponse {
  prediction: string;
  confidence: number;
  report: string;
  disagreement: boolean;
  keywords: string[];
  evidence: EvidenceCase[];
}

export interface HealthResponse {
  status: string;
  message: string;
}
