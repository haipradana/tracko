import React, { useState } from 'react';
import { TrendingUp, BarChart3, Download } from 'lucide-react';

interface HeatmapProps {
  data?: number[][];
  title?: string;
  heatmapImageUrl?: string;
}

const Heatmap: React.FC<HeatmapProps> = ({ 
  data, 
  title = "Traffic Heatmap",
  heatmapImageUrl 
}) => {
  const [imageError, setImageError] = useState(false);
  const [showDataView, setShowDataView] = useState(false);

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
              <button
                onClick={() => setShowDataView(!showDataView)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {showDataView ? 'Show Heatmap' : 'Show Data Grid'}
              </button>
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
      {heatmapImageUrl && !showDataView && !imageError && (
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
      {(showDataView || imageError || !heatmapImageUrl) && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
          <div className="text-center mb-4">
            {imageError && (
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
          Traffic Insights
        </h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>Peak activity area has {maxValue} interactions</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>Total {totalInteractions} customer interactions detected</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>Heatmap shows customer movement patterns across store areas</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Heatmap;