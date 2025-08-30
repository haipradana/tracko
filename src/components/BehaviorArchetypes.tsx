import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type JourneyOutcome = {
  shelf_id: string;
  konversi_sukses: number;
  keraguan_pembatalan: number;
  kegagalan_menarik_minat: number;
  total_interactions: number;
};

type AnalysisData = {
  shelf_dwell_times?: Record<string, number>;
  action_shelf_mapping?: Array<[number|string, number, string, string]>; // [pid, frame, shelf_id, action]
  journey_analysis?: { journey_data: JourneyOutcome[] };
};

interface BehaviorArchetypesProps {
  analysisData: AnalysisData | null;
}

const formatShelfName = (shelfId: string) => {
  return shelfId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const BehaviorArchetypes: React.FC<BehaviorArchetypesProps> = ({ analysisData }) => {
  const { rows, highPerformers, needAttention, stableZones } = useMemo(() => {
    if (!analysisData) {
      return {
        rows: [],
        highPerformers: [],
        needAttention: [],
        stableZones: [],
      };
    }

    const dwellTimes = analysisData.shelf_dwell_times || {};
    const actionMap = analysisData.action_shelf_mapping || [];
    const journey = analysisData.journey_analysis?.journey_data || [];

    // unique visitors per shelf
    const shelfToVisitors: Record<string, Set<string | number>> = {};
    for (const item of actionMap) {
      const [pid, _frame, shelf_id] = item;
      if (!shelfToVisitors[shelf_id]) shelfToVisitors[shelf_id] = new Set();
      shelfToVisitors[shelf_id].add(pid);
    }

    const shelfToUnique: Record<string, number> = {};
    Object.entries(shelfToVisitors).forEach(([shelf, set]) => {
      shelfToUnique[shelf] = set.size;
    });

    // outcomes per shelf
    const shelfToOutcome: Record<string, JourneyOutcome> = {};
    for (const j of journey) shelfToOutcome[j.shelf_id] = j;

    // build rows (merge shelves seen anywhere)
    const shelves = new Set<string>([
      ...Object.keys(dwellTimes),
      ...Object.keys(shelfToUnique),
      ...journey.map(j => j.shelf_id)
    ]);

    const computeArchetype = (shelf: string): { archetype: string; trend: 'up' | 'down' | 'stable' } => {
      const dwell = dwellTimes[shelf] ?? 0;
      const unique = shelfToUnique[shelf] ?? 0;
      const outcome = shelfToOutcome[shelf];

      if (!outcome) {
        return {
          archetype: dwell > 3.0 ? 'Passive Attention (No Physical Engagement)' : 'Low Engagement Zone',
          trend: 'stable'
        };
      }

      if (outcome.konversi_sukses > 20) {
        return { archetype: 'High Conversion', trend: 'up' };
      }
      if (outcome.keraguan_pembatalan > 50) {
        return { archetype: 'High Interest, Low Conversion', trend: 'down' };
      }
      if (unique > 10) {
        return { archetype: 'High Traffic, Low Engagement', trend: 'stable' };
      }
      return { archetype: 'Low Engagement Zone', trend: 'stable' };
    };

    const data = Array.from(shelves).map(shelf => {
      const unique = shelfToUnique[shelf] ?? 0;
      const dwell = Number((dwellTimes[shelf] ?? 0).toFixed(2));
      const { archetype, trend } = computeArchetype(shelf);
      return { shelf, unique, dwell, archetype, trend };
    });

    // sort by unique visitors desc
    const sortedRows = data.sort((a, b) => b.unique - a.unique);

    const highPerformers = sortedRows.filter(r => r.trend === 'up').map(r => r.shelf);
    const needAttention = sortedRows.filter(r => r.trend === 'down').map(r => r.shelf);
    const stableZones = sortedRows.filter(r => r.trend === 'stable').map(r => r.shelf);

    return { rows: sortedRows, highPerformers, needAttention, stableZones };
  }, [analysisData]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-emerald-600 bg-emerald-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Rak
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Interaksi Unik
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Rata-rata Dwell Time (s)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Arketipe Perilaku
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((item, index) => (
                <tr key={index} className="hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-950 to-blue-800 rounded-full mr-3"></div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatShelfName(item.shelf)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.unique}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.dwell.toFixed(1)}s
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs font-medium">
                      {item.archetype}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${getTrendColor(item.trend)}`}>
                      {getTrendIcon(item.trend)}
                      <span className="text-sm font-semibold">
                        {item.trend === 'up' ? 'Naik' : item.trend === 'down' ? 'Turun' : 'Stabil'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-950 to-blue-800 rounded-2xl p-6 text-white">
          <div className="flex items-center mb-3">
            <div className="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
            <h4 className="font-semibold">High Performers</h4>
          </div>
          <p className="text-sm text-blue-200 font-mono">
            {highPerformers.length > 0 ? highPerformers.map(formatShelfName).join(', ') : 'Tidak ada'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-950 to-blue-800 rounded-2xl p-6 text-white">
          <div className="flex items-center mb-3">
            <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
            <h4 className="font-semibold">Need Attention</h4>
          </div>
          <p className="text-sm text-blue-200 font-mono">
            {needAttention.length > 0 ? needAttention.map(formatShelfName).join(', ') : 'Tidak ada'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-950 to-blue-800 rounded-2xl p-6 text-white">
          <div className="flex items-center mb-3">
            <div className="w-3 h-3 bg-gray-300 rounded-full mr-3"></div>
            <h4 className="font-semibold">Stable Zones</h4>
          </div>
          <p className="text-sm text-blue-200 font-mono">
            {stableZones.length > 0 ? stableZones.map(formatShelfName).join(', ') : 'Tidak ada'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BehaviorArchetypes;