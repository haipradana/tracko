import React, { useState, useEffect } from 'react';
import { Lightbulb, Target, TrendingUp, AlertTriangle, Sparkles, Wand2 } from 'lucide-react';

interface AnalysisData {
  unique_persons: number;
  total_interactions: number;
  action_summary: Record<string, number>;
  dwell_time_analysis: {
    average_dwell_time: number;
    max_dwell_time: number;
    person_dwell_times: Record<string, number>;
  };
  behavioral_insights: {
    most_common_action: string;
    total_actions_detected: number;
    average_confidence: number;
  };
  heatmap_data: number[][];
}

interface InsightRecommendationsProps {
  analysisData?: AnalysisData;
}

const InsightRecommendations: React.FC<InsightRecommendationsProps> = ({ analysisData }) => {
  // ENV: call FastAPI backend for AI (keamanan API key)
  const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL as string | undefined;
  const apiBase = (FASTAPI_URL ? FASTAPI_URL.replace(/\/+$/, '') : '') || '';

  const [insights, setInsights] = useState<Array<{type: string; title: string; content: string}>>([]);
  const [summaryInsight, setSummaryInsight] = useState<string>("");
  const [llmLoading, setLlmLoading] = useState<boolean>(false);
  const [llmError, setLlmError] = useState<string>("");

  // Generate AI insights via backend Azure OpenAI (with fallback heuristik jika backend belum siap)
  useEffect(() => {
    if (!analysisData) return;
    // Jika backend URL tersedia, coba generate LLM; jika gagal gunakan heuristik
    generateLlmInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisData, FASTAPI_URL]);

  const generateDataDrivenInsights = () => {
    if (!analysisData) return;

    const { unique_persons, total_interactions, action_summary, dwell_time_analysis, behavioral_insights } = analysisData;
    
    const avgDwellTime = dwell_time_analysis.average_dwell_time;
    const maxDwellTime = dwell_time_analysis.max_dwell_time;
    const mostCommonAction = behavioral_insights.most_common_action;
    const avgConfidence = behavioral_insights.average_confidence;
    const safeActionSummary = action_summary || {};


    const dynamicInsights = [
      {
        type: 'analysis',
        title: 'Analisis Real-time Perilaku Pelanggan',
        content: `Terdeteksi ${unique_persons} pelanggan unik, ${total_interactions} interaksi. Aksi paling umum: "${mostCommonAction}"; confidence rata-rata ${(avgConfidence * 100).toFixed(1)}%. Rata-rata dwell ${avgDwellTime.toFixed(1)}s (maks ${maxDwellTime.toFixed(1)}s).`
      },
      {
        type: 'pattern',
        title: 'Pola Dwell Time dan Engagement',
        content: `Variasi dwell time signifikan; rasio max/avg ${(maxDwellTime / avgDwellTime).toFixed(1)}:1 menandakan zona engagement tinggi yang bisa direplikasi.`
      },
      {
        type: 'opportunity',
        title: 'Opportunity untuk Optimasi',
        content: `Dengan ${Object.keys(safeActionSummary).length} jenis aksi, fokus pada placement dan signage di area dengan dwell tinggi untuk menaikkan konversi.`
      },
      {
        type: 'warning',
        title: 'Rekomendasi Prioritas',
        content: `Prioritaskan perbaikan di area dengan dwell di bawah rata-rata (${avgDwellTime.toFixed(1)}s). Terapkan praktik zona berkinerja tinggi.`
      }
    ];

    setInsights(dynamicInsights);
    setSummaryInsight('Ringkasan: optimalkan zona dwell tinggi, tingkatkan engagement di zona lemah, dan replikasi praktik terbaik.');
  };

  const generateLlmInsights = async () => {
    if (!analysisData) {
      generateDataDrivenInsights();
      return;
    }
    setLlmLoading(true);
    setLlmError("");
    try {
      const heatmapUrl = (analysisData as any)?.download_links?.heatmap_image as string | undefined;
      const payload = {
        prompt: 'Hasilkan insight retail TERSTRUKTUR (items: analysis, pattern, opportunity, warning) dan summary) dari data berikut.',
        data: {
          unique_persons: analysisData.unique_persons,
          total_interactions: analysisData.total_interactions,
          behavioral_insights: analysisData.behavioral_insights,
          dwell_time_analysis: analysisData.dwell_time_analysis,
          action_summary: analysisData.action_summary,
          shelf_dwell_times: (analysisData as any)?.shelf_dwell_times,
          journey_analysis: (analysisData as any)?.journey_analysis,
        },
        heatmap_url: heatmapUrl,
      };
      const resp = await fetch(`${apiBase}/ai/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(`Backend responded ${resp.status}`);
      const parsed = await resp.json();
      const items: Array<{type: string; title: string; content: string; priority?: string}> = Array.isArray(parsed?.items) ? parsed.items : [];
      const summary: string = parsed.summary || '';
      setInsights(items);
      setSummaryInsight(summary);
    } catch (e: any) {
      setLlmError(e?.message || 'Gagal generate insight (backend)');
      // fallback
      generateDataDrivenInsights();
    } finally {
      setLlmLoading(false);
    }
  };

  // Backend auto-insights removed

  // ---------- PROMPT INSIGHTS (Azure OpenAI — optional direct call) ----------
  const [prompt, setPrompt] = useState<string>(
    'Sebagai analis retail, berikan rekomendasi singkat berdasarkan metrik: gunakan bullet & prioritas.'
  );
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string>("");
  const [promptOutput, setPromptOutput] = useState<string>("");

  const handlePromptInsights = async () => {
    try {
      setPromptError("");
      setPromptLoading(true);
      setPromptOutput("");
      // Fallback ke origin jika env tidak ada (reverse proxy same-origin)
      const heatmapUrl = (analysisData as any)?.download_links?.heatmap_image as string | undefined;
      const payload = {
        prompt,
        data: {
          unique_persons: analysisData?.unique_persons,
          total_interactions: analysisData?.total_interactions,
          behavioral_insights: analysisData?.behavioral_insights,
          dwell_time_analysis: analysisData?.dwell_time_analysis,
          action_summary: analysisData?.action_summary,
          shelf_dwell_times: (analysisData as any)?.shelf_dwell_times,
          journey_analysis: (analysisData as any)?.journey_analysis,
        },
        heatmap_url: heatmapUrl,
      };
      const resp = await fetch(`${apiBase}/ai/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(`Backend responded ${resp.status}`);
      const parsed = await resp.json();
      const items: Array<{type: string; title: string; content: string; priority?: string}> = Array.isArray(parsed?.items) ? parsed.items : [];
      const summary: string = parsed.summary || '';
      setInsights(items);
      setSummaryInsight(summary);
      setPromptOutput('Insight diperbarui berdasarkan prompt.');
    } catch (e:any) {
      setPromptError(e?.message || 'Gagal generate insight (backend)');
    } finally {
      setPromptLoading(false);
    }
  };

  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'analysis':
        return 'bg-blue-900/10 border-blue-300/30 text-blue-100';
      case 'pattern':
        return 'bg-purple-900/10 border-purple-300/30 text-purple-100';
      case 'opportunity':
        return 'bg-emerald-900/10 border-emerald-300/30 text-emerald-100';
      case 'warning':
        return 'bg-orange-900/10 border-orange-300/30 text-orange-100';
      default:
        return 'bg-gray-900/10 border-gray-300/30 text-gray-100';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return <Target className="h-5 w-5"/>;
      case 'pattern':
        return <TrendingUp className="h-5 w-5"/>;
      case 'opportunity':
        return <Lightbulb className="h-5 w-5"/>;
      case 'warning':
        return <AlertTriangle className="h-5 w-5"/>;
      default:
        return <Sparkles className="h-5 w-5"/>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-3 mb-4">
          <div className="p-3 bg-yellow-400/20 rounded-2xl">
            <Sparkles className="h-8 w-8 text-yellow-400" />
          </div>
          <h3 className="text-2xl font-bold">AI Insights</h3>
        </div>
        <p className="text-gray-300 text-lg">Dapatkan rekomendasi AI dari data asli atau buat insight berbasis prompt.</p>
      </div>

      {/* LLM Insights (Frontend) */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10" onClick={generateLlmInsights} disabled={llmLoading}>
            {llmLoading ? 'Menghasilkan…' : 'Regenerate dengan AI'}
          </button>
          {llmError && <span className="text-red-400 text-sm">{llmError}</span>}
        </div>
        {insights.length === 0 && !llmLoading && (
          <small className="opacity-70">Belum ada insight. Klik "Regenerate dengan AI" untuk menghasilkan.</small>
        )}
        {(Array.isArray(insights) ? insights : []).map((insight, index) => (
          <div key={index} className={`border rounded-2xl p-6 ${getInsightStyle(insight.type)}`}>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 p-2 bg-white/10 rounded-xl mt-1">
                {getIcon(insight.type)}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-3">{insight.title}</h4>
                <p className="text-sm leading-relaxed opacity-90">{insight.content}</p>
              </div>
            </div>
          </div>
        ))}
        {summaryInsight && (
          <div className="border rounded-2xl p-6 bg-white/5 border-white/10">
            <h4 className="font-semibold mb-2">Kesimpulan</h4>
            <p className="text-sm opacity-90">{summaryInsight}</p>
          </div>
        )}
      </div>

      {/* PROMPT (Azure OpenAI only) */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h4 className="font-semibold text-xl mb-4 flex items-center gap-2">
            <Wand2 className="h-5 w-5"/>
            Insight by Prompt (Azure OpenAI)
          </h4>
          <div className="space-y-3">
            <textarea className="w-full min-h-[120px] p-3 rounded-lg bg-white/5 border border-white/10" value={prompt} onChange={(e)=>setPrompt(e.target.value)} />
            <div className="flex gap-3 items-center">
              <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10" onClick={handlePromptInsights} disabled={promptLoading}>
                {promptLoading ? 'Menghasilkan…' : 'Generate Insight'}
              </button>
              {promptError && <span className="text-red-400 text-sm">{promptError}</span>}
            </div>
            {promptOutput && (
              <div className="border border-white/10 rounded-xl p-3 bg-white/5 whitespace-pre-wrap text-sm opacity-90">
                {promptOutput}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightRecommendations;