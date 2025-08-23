import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Download, Image as ImageIcon, LayoutGrid } from 'lucide-react';

interface HeatmapProps {
  data?: number[][];
  title?: string;
  heatmapImageUrl?: string;
  shelfMapImageUrl?: string;
  isFiltered?: boolean;
}

const Heatmap: React.FC<HeatmapProps> = ({ 
  data, 
  title = "Traffic Heatmap",
  heatmapImageUrl,
  shelfMapImageUrl,
  isFiltered
}) => {
  const [imageError, setImageError] = useState(false);
  const [showDataView, setShowDataView] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [errorLoadingImage, setErrorLoadingImage] = useState(false);
  const [trafficFlowInsight, setTrafficFlowInsight] = useState<string>("");
  const [isLoadingInsight, setIsLoadingInsight] = useState<boolean>(true);


  useEffect(() => {
    setErrorLoadingImage(false);
  }, [heatmapImageUrl]);
  
  useEffect(() => {
    const fetchInsight = async () => {
        if (!data || data.length === 0) {
            setTrafficFlowInsight("Data heatmap tidak cukup untuk analisis alur.");
            setIsLoadingInsight(false);
            return;
        }

        setIsLoadingInsight(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/ai/heatmap-insight`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    heatmap_data: data,
                    heatmap_url: heatmapImageUrl,
                    shelfmap_url: shelfMapImageUrl,
                }),
            });

            if (!response.ok) {
                throw new Error('Gagal mendapatkan wawasan dari AI');
            }

            const responseData = await response.json();
            setTrafficFlowInsight(responseData.insight);
        } catch (error) {
            console.error("Error fetching heatmap insight:", error);
            setTrafficFlowInsight("Pola heatmap menunjukkan jalur utama pelanggan. Pertimbangkan untuk menempatkan produk margin tinggi di rute ini."); // Fallback
        } finally {
            setIsLoadingInsight(false);
        }
    };

    fetchInsight();
}, [data, heatmapImageUrl, shelfMapImageUrl]); // Rerun when data changes


  // Default heatmap data if none provided
  const defaultData = Array(20).fill(null).map(() => 
    Array(20).fill(null).map(() => Math.floor(Math.random() * 100))
  );
  
  const heatmapData = data || defaultData;

  const getHeatmapColor = (value: number) => {
    const maxValue = Math.max(...heatmapData.flat());
    const intensity = value / maxValue;
    
    if (intensity < 0.2) return 'bg-blue-200';
    if (intensity < 0.4) return 'bg-blue-400';
    if (intensity < 0.6) return 'bg-blue-600';
    if (intensity < 0.8) return 'bg-orange-400';
    return 'bg-red-500';
  };

  const maxValue = Math.max(...heatmapData.flat());
  const totalInteractions = heatmapData.flat().reduce((sum, val) => sum + val, 0);

  const handleDownloadImage = () => {
    if (heatmapImageUrl) {
      const link = document.createElement('a');
      link.href = heatmapImageUrl;
      link.download = 'customer-heatmap.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          {title}
        </h4>
        <div className="flex items-center space-x-3">
          {heatmapImageUrl && (
            <>
              {!errorLoadingImage && (
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setShowDataView(false)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors flex items-center ${!showDataView ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}
                  >
                    <ImageIcon className="w-4 h-4 mr-1.5" />
                    Heatmap
                  </button>
                  <button
                    onClick={() => setShowDataView(true)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors flex items-center ${showDataView ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}
                  >
                    <LayoutGrid className="w-4 h-4 mr-1.5" />
                    Data Grid
                  </button>
                </div>
              )}

              <button
                onClick={handleDownloadImage}
                className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-1" />
                PNG
              </button>
            </>
          )}
        </div>
      </div>

      {/* Image View (preferred if available) */}
      {heatmapImageUrl && !showDataView && !errorLoadingImage && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
          <div className="text-center">
            <img
              src={heatmapImageUrl}
              alt="Customer Traffic Heatmap"
              className="w-full h-auto max-w-2xl mx-auto rounded-lg shadow-sm border border-gray-300"
              onError={() => setImageError(true)}
              onLoad={() => setImageError(false)}
            />
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Real-time heatmap generated from video analysis
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Red areas = High traffic | Blue areas = Low traffic
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data Grid View (fallback or toggle) */}
      {(showDataView || errorLoadingImage || !heatmapImageUrl) && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
          <div className="text-center mb-4">
            {errorLoadingImage && (
              <p className="text-yellow-600 text-sm mb-2">
                ⚠️ Could not load heatmap image, showing data grid instead
              </p>
            )}
          </div>
          <div 
            className="grid gap-1 max-w-lg mx-auto" 
            style={{ gridTemplateColumns: `repeat(${heatmapData[0]?.length || 20}, 1fr)` }}
          >
            {heatmapData.flat().map((value, index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-sm ${getHeatmapColor(value)} border border-gray-300 hover:scale-110 transition-transform cursor-pointer`}
                title={`Position ${index}: ${value} interactions`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-200 rounded border border-gray-300"></div>
            <span className="text-gray-600">Low Traffic</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-600 rounded border border-gray-300"></div>
            <span className="text-gray-600">Medium</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded border border-gray-300"></div>
            <span className="text-gray-600">High Traffic</span>
          </div>
        </div>
        <div className="text-gray-500">
          Max: {maxValue} | Total: {totalInteractions}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Insight Heatmap
        </h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>
              <strong>Area Aktivitas Puncak:</strong> Titik tersibuk menyumbang sekitar <strong>{((maxValue / totalInteractions) * 100).toFixed(1)}%</strong> dari seluruh lalu lintas yang terdeteksi.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>
              <strong>Cakupan Toko:</strong> Pelanggan secara aktif bergerak melalui <strong>{((heatmapData.flat().filter(v => v > 0).length / heatmapData.flat().length) * 100).toFixed(0)}%</strong> dari zona yang dipantau.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>
              <strong>Alur Lalu Lintas:</strong> {isLoadingInsight ? (
                <span className="italic text-gray-500">Menganalisis...</span>
              ) : (
                trafficFlowInsight
              )}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Heatmap;