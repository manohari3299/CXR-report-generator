/**
 * API service layer for communicating with the CXR Report Generator backend.
 */

import type { PredictResponse, HealthResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Upload a chest X-ray image for analysis.
 *
 * @param file - Image file (JPEG, PNG)
 * @returns Full prediction response with report, evidence, and disagreement data.
 */
export async function predictImage(file: File): Promise<PredictResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(error.detail || `Server error: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if the backend server is healthy.
 *
 * @returns Health status response.
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error('Backend server is not responding');
  }

  return response.json();
}
