import React, { useState, useEffect } from 'react';
import { Lightbulb, Target, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';

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
  const [insights, setInsights] = useState([
    {
      type: 'analysis',
      icon: <Target className="h-5 w-5" />,
      title: 'Analisis Komprehensif tentang Perilaku Pelanggan di Toko',
      content: 'Perilaku pelanggan di toko ini menunjukkan pola yang menarik sekaligus menghawatirkan. Secara umum, ada tingkat interaksi fisik yang cukup tinggi, seperti "Hand in Shelf" (25) dan "Looking at Shelf" (37), namun tingkat "Shelf Take" (12) yang signifikan menunjukkan bahwa meskipun pelanggan tertarik atau pembelian yang tinggi setelah interaksi awal. Ini menunjukkan adanya hambatan dalam proses pembelian.'
    },
    {
      type: 'pattern',
      icon: <TrendingUp className="h-5 w-5" />,
      title: 'Pola Engagement dan Konversi',
      content: 'Heatmap dapat menggambarkan beberapa area hot lintas tinggi. Namun, bila lintas tinggi ini tidak sebanding besar dengan engagement atau konversi. Contohnya, "Shelf 2" dan "Shelf 5" mencakup dwell time rata-rata tertinggi (1.5%), menunjukkan pelanggan menghabiskan waktu lebih di sana dan tertarik pada apa yang ada.'
    },
    {
      type: 'opportunity',
      icon: <Lightbulb className="h-5 w-5" />,
      title: 'Identifikasi Area atau Rak yang Berkerja Rak dan yang Bermasalah',
      content: 'Untuknya, "Shelf 1" meniliki dwell time rata-rata tertinggi (1.5%), menunjukkan pelanggan menghabiskan waktu lama di sana dan tertarik pada apa yang ada. Namun, sayangnya, tidak ada penyakit sebandingn sukses (50%), meskipun dwell time nya relatif pendek (0.3%) dan nya lainnya gagal menantuk minat.'
    },
    {
      type: 'warning',
      icon: <AlertTriangle className="h-5 w-5" />,
      title: 'Area Kritis yang Memerlukan Perhatian',
      content: 'Hanya "Shelf 6" yang menunjukkan konversi sukses (50%), meskipun dwell time relatif pendek (0.3%) dan dari lainnya gagal menarik minat. Ini adalah indikasi bahwa produk atau penempatan di "Shelf 6" sangat efektif dan bisa menjadi model untuk shelf lain.'
    }
  ]);

  // Generate dynamic insights based on actual data
  useEffect(() => {
    if (analysisData) {
      generateDataDrivenInsights();
    }
  }, [analysisData]);

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
        icon: <Target className="h-5 w-5" />,
        title: 'Analisis Real-time Perilaku Pelanggan',
        content: `Terdeteksi ${unique_persons} pelanggan unik dengan total ${total_interactions} interaksi. Aksi paling umum adalah "${mostCommonAction}" dengan confidence rata-rata ${(avgConfidence * 100).toFixed(1)}%. Waktu rata-rata pelanggan di area adalah ${avgDwellTime.toFixed(1)} detik, dengan maksimal ${maxDwellTime.toFixed(1)} detik di zona tertentu.`
      },
      {
        type: 'pattern',
        icon: <TrendingUp className="h-5 w-5" />,
        title: 'Pola Dwell Time dan Engagement',
        content: `Analisis menunjukkan variasi dwell time yang signifikan antar area. Ratio dwell time maksimal vs rata-rata adalah ${(maxDwellTime / avgDwellTime).toFixed(1)}:1, menunjukkan adanya zona dengan engagement tinggi yang perlu direplikasi ke area lain.`
      },
      {
        type: 'opportunity',
        icon: <Lightbulb className="h-5 w-5" />,
        title: 'Opportunity untuk Optimasi',
        content: `Dengan ${Object.keys(safeActionSummary).length} jenis aksi yang terdeteksi, ada peluang untuk meningkatkan konversi melalui optimasi layout dan produk placement. Area dengan dwell time tinggi menunjukkan potensi untuk meningkatkan sales conversion.`
      },
      {
        type: 'warning',
        icon: <AlertTriangle className="h-5 w-5" />,
        title: 'Rekomendasi Prioritas',
        content: `Fokus pada area dengan dwell time di bawah rata-rata (${avgDwellTime.toFixed(1)}s) untuk meningkatkan engagement. Implementasi strategi dari zona berkinerja tinggi ke zona dengan traffic rendah dapat meningkatkan overall conversion rate.`
      }
    ];

    setInsights(dynamicInsights);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-3 mb-4">
          <div className="p-3 bg-yellow-400/20 rounded-2xl">
            <Sparkles className="h-8 w-8 text-yellow-400" />
          </div>
          <h3 className="text-2xl font-bold">AI-Generated Insights</h3>
        </div>
        <p className="text-gray-300 text-lg">
          Baik, sebagai pakar analitik retail, mari kita selami data perilaku pelanggan di supermarket ini untuk mendapatkan insight strategis.
        </p>
      </div>

      {/* Insights */}
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div key={index} className={`border rounded-2xl p-6 ${getInsightStyle(insight.type)}`}>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 p-2 bg-white/10 rounded-xl mt-1">
                {insight.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-3">{insight.title}</h4>
                <p className="text-sm leading-relaxed opacity-90">{insight.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Items */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
        <h4 className="font-semibold text-xl mb-6 flex items-center space-x-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <Target className="h-6 w-6" />
          </div>
          <span>Recommended Actions</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h5 className="font-semibold mb-4 text-emerald-400">Quick Wins</h5>
            <ul className="text-sm text-gray-300 space-y-3">
              <li className="flex items-start">
                <span className="text-emerald-400 mr-3 mt-1">•</span>
                <span>Replicate Shelf 6 layout ke area lain</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-3 mt-1">•</span>
                <span>Optimasi produk placement di high-traffic zones</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-3 mt-1">•</span>
                <span>Review pricing strategy di area keraguan tinggi</span>
              </li>
            </ul>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h5 className="font-semibold mb-4 text-blue-400">Strategic Improvements</h5>
            <ul className="text-sm text-gray-300 space-y-3">
              <li className="flex items-start">
                <span className="text-blue-400 mr-3 mt-1">•</span>
                <span>A/B test different shelf arrangements</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-3 mt-1">•</span>
                <span>Implement targeted promotions di low-conversion areas</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-3 mt-1">•</span>
                <span>Staff positioning untuk assist di decision points</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightRecommendations;