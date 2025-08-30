import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, Users, BarChart } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DwellTimeChartProps {
  data: { shelf: string; time: number }[];
  altData: { shelf: string; time: number }[];
}

const DwellTimeChart: React.FC<DwellTimeChartProps> = ({ data, altData }) => {
  const [viewMode, setViewMode] = useState<'unique' | 'cumulative'>('unique');
  const [insight, setInsight] = useState<string>('');
  const [insightItems, setInsightItems] = useState<string[]>([]);
  const [isLoadingInsight, setIsLoadingInsight] = useState<boolean>(true);

  const chartData = viewMode === 'unique' ? data : altData;

  useEffect(() => {
    const fetchInsight = async () => {
      if (!chartData || chartData.length === 0) {
        setInsight("Data dwell time tidak cukup untuk dianalisis.");
        setInsightItems([]);
        setIsLoadingInsight(false);
        return;
      }
      setIsLoadingInsight(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/ai/dwell-time-insight`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dwell_data: chartData }),
        });
        if (!response.ok) throw new Error("Gagal mengambil insight");
        const result = await response.json();
        setInsight(result.insight || '');
        setInsightItems(Array.isArray(result.items) ? result.items : []);
      } catch (error) {
        console.error("Error fetching dwell time insight:", error);
        setInsight("Rak paling populer menunjukkan minat pelanggan yang tinggi; pertimbangkan untuk menempatkan produk terkait di dekatnya."); // Fallback
        setInsightItems([]);
      } finally {
        setIsLoadingInsight(false);
      }
    };
    fetchInsight();
  }, [chartData]); // Re-fetch when data or view mode changes

  const maxTime = Math.max(...chartData.map(d => d.time), 0);
  
  if (!chartData || chartData.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10">
        <p>No dwell time data available.</p>
      </div>
    );
  }

  // Fallback to splitting text if items not provided
  const bulletItems = insightItems.length > 0 
    ? insightItems 
    : (insight ? insight.split('\n').filter(line => line.trim() !== '') : []);

  return (
    <div className="space-y-6">
       <div className="flex justify-center bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setViewMode('unique')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'unique' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}
        >
           <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Unique Visitors
           </div>
        </button>
        <button
          onClick={() => setViewMode('cumulative')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'cumulative' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}
        >
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Total Time
           </div>
        </button>
      </div>
      <p className="text-center text-xs text-gray-500 -mt-3">
        {viewMode === 'unique' 
          ? 'Waktu per rak, dihitung per pengunjung unik.'
          : 'Total waktu kumulatif semua pengunjung di setiap rak.'
        }
      </p>

      {/* Chart */}
      <div className="space-y-3">
        {chartData.map(({ shelf, time }) => (
          <div key={shelf} className="grid grid-cols-[auto,1fr] items-center gap-4 text-sm">
            <div className="text-gray-700 font-medium truncate text-left">{shelf.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
            <div className="flex-1 bg-gray-200 rounded h-6">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-700 h-6 rounded flex items-center justify-end px-2"
                style={{ width: `${maxTime > 0 ? (time / maxTime) * 100 : 0}%` }}
              >
                <span className="text-white font-semibold text-xs">{time.toFixed(1)}s</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight Section */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 mt-6">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Insight Dwell Time
        </h4>
        {isLoadingInsight ? (
          <span className="italic text-gray-500 text-sm">Menganalisis data dwell time...</span>
        ) : (
          <ul className="text-sm text-blue-800 space-y-2">
            {bulletItems.map((line, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <div className="prose prose-sm max-w-none text-blue-800">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                    }}
                  >
                    {line}
                  </ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DwellTimeChart;