import React from 'react';

interface DwellTimeData {
  shelf: string;
  time: number;
}

interface DwellTimeChartProps {
  data?: DwellTimeData[];
  altData?: DwellTimeData[]; // cumulative (person-seconds)
  title?: string;
}

const DwellTimeChart: React.FC<DwellTimeChartProps> = ({ 
  data, 
  altData,
  title = "Dwell Time per Shelf (seconds)" 
}) => {
  const [mode, setMode] = React.useState<'unique'|'cumulative'>('unique');
  // Default data if none provided - sorted by dwell time descending like in Gradio
  const defaultData: DwellTimeData[] = [
    { shelf: 'shelf_1', time: 1.60 },
    { shelf: 'shelf_4', time: 0.98 },
    { shelf: 'shelf_5', time: 0.86 },
    { shelf: 'shelf_6', time: 0.36 },
    { shelf: 'shelf_2', time: 0.08 },
    { shelf: 'shelf_3', time: 0.08 },
  ];

  const dwellData = (mode === 'unique' ? data : altData) || data || defaultData;
  
  // Sort by dwell time descending and limit to top 6 shelves
  const sortedData = [...dwellData].sort((a, b) => b.time - a.time).slice(0, 6);
  
  const maxTime = Math.max(...sortedData.map(d => d.time));
  const avgTime = sortedData.reduce((sum, d) => sum + d.time, 0) / sortedData.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-gray-600 text-sm">{mode === 'unique' ? 'Unique per frame (≤ durasi video)' : 'Cumulative person-seconds (bisa > durasi video)'} </p>
        </div>
        {altData && (
          <div className="inline-flex bg-gray-100 rounded-xl p-1 border border-gray-200">
            <button onClick={()=>setMode('unique')} className={`px-3 py-1 rounded-lg text-sm ${mode==='unique'?'bg-white shadow font-semibold':'text-gray-600'}`}>Unique</button>
            <button onClick={()=>setMode('cumulative')} className={`px-3 py-1 rounded-lg text-sm ${mode==='cumulative'?'bg-white shadow font-semibold':'text-gray-600'}`}>Cumulative</button>
          </div>
        )}
      </div>

      {/* Horizontal Bar Chart */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <div className="space-y-4">
          {sortedData.map((item, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-20 text-sm font-semibold text-gray-700">
                {item.shelf}
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-10 relative overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-950 to-blue-800 h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-4 shadow-sm"
                  style={{ 
                    width: `${Math.max(15, (item.time / maxTime) * 100)}%`,
                  }}
                >
                  <span className="text-white text-sm font-semibold">
                    {item.time.toFixed(2)}s
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="font-medium">0s</span>
          <span className="font-semibold text-gray-900">Rata-rata Dwell Time: {avgTime.toFixed(2)}s</span>
          <span className="font-medium">{maxTime.toFixed(2)}s</span>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2 text-sm">Traffic Insights</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li className="flex items-start">
            <span className="text-blue-500 mr-1">•</span>
            <span>{sortedData[0]?.shelf} memiliki {mode==='unique'?'dwell time':'dwell load'} tertinggi ({sortedData[0]?.time.toFixed(2)}s)</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-1">•</span>
            <span>Top {sortedData.length} shelf dengan engagement tertinggi</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-1">•</span>
            <span>Shelf dengan dwell time rendah perlu optimasi layout</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DwellTimeChart;