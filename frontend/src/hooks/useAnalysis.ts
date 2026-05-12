import { useCallback, useEffect } from 'react';
import { useAnalysisStore } from '../store/analysisStore';
import { analysisAPI } from '../api/client';
import type { AnalysisSource, ProgressEvent, AnalysisResult } from '../types';

export function useRunAnalysis() {
  const store = useAnalysisStore();

  const run = useCallback(
    async (source: AnalysisSource, csvPath?: string, hours?: number) => {
      store.setRunning(true);
      store.setError(null);
      store.clearProgress();

      try {
        // 1. POST to start analysis
        const startResponse = await analysisAPI.run({
          source,
          csv_path: csvPath,
          hours,
        });
        const jobId = startResponse.data.job_id;

        // 2. Open SSE stream
        const eventSourceUrl = analysisAPI.stream(jobId);
        const eventSource = new EventSource(eventSourceUrl);

        eventSource.addEventListener('progress', (e: any) => {
          const data = JSON.parse(e.data);
          store.addProgress(data as ProgressEvent);
        });

        eventSource.addEventListener('complete', (e: any) => {
          const data = JSON.parse(e.data);
          const result: AnalysisResult = {
            ran_at: new Date().toISOString(),
            source,
            duration_seconds: data.duration_seconds,
            summary: data.summary,
            alerts: data.alerts,
          };
          store.setResult(result);
          store.setRunning(false);
          eventSource.close();
        });

        eventSource.addEventListener('error', (e: any) => {
          try {
            const data = JSON.parse(e.data);
            store.setError(data.message || 'Analysis failed');
          } catch {
            store.setError('Connection lost during analysis');
          }
          store.setRunning(false);
          eventSource.close();
        });
      } catch (err: any) {
        const message =
          err.response?.data?.detail ||
          err.message ||
          'Failed to start analysis';
        store.setError(message);
        store.setRunning(false);
      }
    },
    [store]
  );

  return { run, ...store };
}

export function useLatestAnalysis() {
  const store = useAnalysisStore();

  useEffect(() => {
    const loadLatest = async () => {
      try {
        const response = await analysisAPI.getLatest();
        store.setResult(response.data);
      } catch (err) {
        // No previous analysis is OK
      }
    };

    loadLatest();
  }, [store]);

  return store;
}
