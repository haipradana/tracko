import React from 'react';
import { BarChart, TrendingUp } from 'lucide-react';

interface JourneyOutcome {
  shelf_id: string;
  konversi_sukses: number;
  keraguan_pembatalan: number;
  kegagalan_menarik_minat: number;
  total_interactions: number;
}

interface CustomerJourneyProps {
  journeyData?: JourneyOutcome[];
  title?: string;
}

const CustomerJourney: React.FC<CustomerJourneyProps> = ({ 
  journeyData, 
  title = "Customer Journey Analysis" 
}) => {
  // Use the provided journey data directly (no fallback needed since backend provides it)
  const journey = journeyData || [];
  
  // Sort by total interactions descending
  const sortedJourney = [...journey].sort((a, b) => b.total_interactions - a.total_interactions);

  const getBarHeight = (value: number) => {
    return `${value}%`;
  };

  // Calculate totals for insights with error handling
  const totalInteractions = sortedJourney.reduce((sum, item) => sum + item.total_interactions, 0);
  const avgKonversi = sortedJourney.length > 0 
    ? sortedJourney.reduce((sum, item) => sum + item.konversi_sukses, 0) / sortedJourney.length 
    : 0;
  const bestShelf = sortedJourney.length > 0 
    ? sortedJourney.reduce((best, item) => 
        item.konversi_sukses > best.konversi_sukses ? item : best
      )
    : { shelf_id: 'N/A', konversi_sukses: 0 };

  // Show message if no data
  if (sortedJourney.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600">Analisis Perilaku Pengunjung tiap Rak</p>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">No journey data available for this analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600">Analisis Perilaku Pengunjung tiap Rak</p>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gradient-to-r from-blue-950 to-blue-800 rounded-xl">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{totalInteractions}</div>
          <div className="text-sm text-blue-200">Traffic Volume</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{avgKonversi.toFixed(1)}%</div>
          <div className="text-sm text-blue-200">Avg Conversion</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{sortedJourney.length}</div>
          <div className="text-sm text-blue-200">Shelves Analyzed</div>
        </div>
      </div>

      {/* Stacked Bar Chart */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <div className="mb-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            <BarChart className="h-5 w-5 mr-2" />
            Outcome Distribution (%)
          </h4>
          
          {/* Legend */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-700">Konversi Sukses</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-gray-700">Keraguan & Pembatalan</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-700">Kegagalan Menarik Minat</span>
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="flex items-end justify-center space-x-4 h-64 overflow-x-auto">
          {sortedJourney.map((item, index) => (
            <div key={index} className="flex flex-col items-center min-w-[80px]">
              {/* Stacked Bar */}
              <div className="relative flex flex-col" style={{ height: '200px', width: '60px' }}>
                <div className="flex-1 flex flex-col justify-end">
                  {/* Kegagalan Menarik Minat (Red) - Bottom */}
                  {item.kegagalan_menarik_minat > 0 && (
                    <div 
                      className="bg-red-500 transition-all duration-1000 ease-out flex items-center justify-center text-xs font-semibold text-white"
                      style={{ height: getBarHeight(item.kegagalan_menarik_minat) }}
                      title={`Kegagalan: ${item.kegagalan_menarik_minat}%`}
                    >
                      {item.kegagalan_menarik_minat > 15 && `${item.kegagalan_menarik_minat}%`}
                    </div>
                  )}
                  
                  {/* Keraguan & Pembatalan (Orange) - Middle */}
                  {item.keraguan_pembatalan > 0 && (
                    <div 
                      className="bg-orange-500 transition-all duration-1000 ease-out flex items-center justify-center text-xs font-semibold text-white"
                      style={{ height: getBarHeight(item.keraguan_pembatalan) }}
                      title={`Keraguan: ${item.keraguan_pembatalan}%`}
                    >
                      {item.keraguan_pembatalan > 15 && `${item.keraguan_pembatalan}%`}
                    </div>
                  )}
                  
                  {/* Konversi Sukses (Green) - Top */}
                  {item.konversi_sukses > 0 && (
                    <div 
                      className="bg-green-500 rounded-t-md transition-all duration-1000 ease-out flex items-center justify-center text-xs font-semibold text-white"
                      style={{ height: getBarHeight(item.konversi_sukses) }}
                      title={`Konversi: ${item.konversi_sukses}%`}
                    >
                      {item.konversi_sukses > 15 && `${item.konversi_sukses}%`}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Shelf Label */}
              <div className="mt-2 text-xs font-medium text-gray-600 transform -rotate-45 origin-center whitespace-nowrap">
                {item.shelf_id}
              </div>
              
              {/* Total Interactions */}
              <div className="mt-4 text-xs text-gray-500">
                ({item.total_interactions})
              </div>
            </div>
          ))}
        </div>
        
        {/* Y-axis label */}
        <div className="text-center mt-4">
          <p className="text-sm font-medium text-gray-700">Shelf ID</p>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-950 to-blue-800 border border-blue-700 rounded-2xl p-6">
        <h4 className="font-semibold text-white mb-3 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Journey Insights
        </h4>
        <ul className="text-sm text-blue-200 space-y-2">
          <li className="flex items-start">
            <span className="text-green-400 mr-2">•</span>
            <span>{bestShelf.shelf_id} memiliki konversi tertinggi ({bestShelf.konversi_sukses.toFixed(1)}%)</span>
          </li>
          <li className="flex items-start">
            <span className="text-orange-400 mr-2">•</span>
            <span>Area dengan keraguan tinggi perlu optimasi product placement</span>
          </li>
          <li className="flex items-start">
            <span className="text-red-400 mr-2">•</span>
            <span>Shelf dengan minat rendah membutuhkan strategi visual merchandising</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CustomerJourney;