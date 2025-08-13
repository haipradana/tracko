import React from "react";

interface TopActionsProps {
  analysisData: any;
}

const TopActions: React.FC<TopActionsProps> = ({ analysisData }) => {
  const actionSummary: Record<string, number> =
    analysisData?.action_summary ||
    analysisData?.behavioral_insights?.action_summary ||
    {};
  const totalInteractions: number =
    analysisData?.total_interactions ??
    analysisData?.behavioral_insights?.total_actions_detected ??
    Object.values(actionSummary).reduce((a: number, b: number) => a + (b as number), 0);
  const mapping: any[] = analysisData?.action_shelf_mapping || [];

  // Build shelf frequency per action
  const actionToShelfCounts: Record<string, Record<string, number>> = {};
  if (Array.isArray(mapping)) {
    for (const entry of mapping) {
      const act = entry?.[3];
      const shelf = entry?.[2];
      if (!act || !shelf) continue;
      if (!actionToShelfCounts[act]) actionToShelfCounts[act] = {};
      actionToShelfCounts[act][shelf] = (actionToShelfCounts[act][shelf] || 0) + 1;
    }
  }

  const entries = Object.entries(actionSummary)
    .map(([action, count]) => ({ action, count: Number(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((item) => {
      const shelves = actionToShelfCounts[item.action] || {};
      let topShelf = "-";
      let topCount = -1;
      for (const [shelfId, cnt] of Object.entries(shelves)) {
        if ((cnt as number) > topCount) {
          // Show numeric part if available, else the raw id
          try {
            const num = parseInt(String(shelfId).split("_").pop() || "", 10);
            topShelf = isNaN(num) ? String(shelfId) : String(num);
          } catch (_) {
            topShelf = String(shelfId);
          }
          topCount = cnt as number;
        }
      }
      const share = totalInteractions > 0 ? item.count / totalInteractions : 0;
      return { ...item, share, topShelf };
    });

  const leftCount = Math.ceil(entries.length / 2);
  const left = entries.slice(0, leftCount);
  const right = entries.slice(leftCount);

  const totalSharePct = Math.round(
    entries.reduce((acc, e) => acc + e.share, 0) * 100
  );

  return (
    <div
      className="bg-white rounded-3xl shadow-sm p-8"
      style={{ border: "1px solid #e6dfd2", background: "rgba(255,255,255,0.88)" }}
    >
      <div
        className="flex items-center justify-between"
        style={{ marginTop: -12, paddingBottom: 10, borderBottom: "1px solid #e6dfd2", marginBottom: 12 }}
      >
        <h3 className="text-lg font-semibold text-gray-900">Top Actions</h3>
        <span
          className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-xl text-sm"
          style={{ background: "#f6f2eb", border: "1px solid #e6dfd2", color: "#2a3556", marginLeft: "auto" }}
        >
          <span
            style={{ width: 8, height: 8, borderRadius: 999, background: "#1f49a6", display: "inline-block" }}
          />
          Actions Summary
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="text-sm text-gray-700">Tidak ada aksi terdeteksi.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[left, right].map((col, idx) => (
          <div key={idx} className="space-y-4">
            {col.map((item) => (
              <div key={item.action}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">{item.action}</div>
                  <div className="text-sm text-gray-600">
                    {item.count} ({Math.round(item.share * 100)}%)
                  </div>
                </div>
                <div
                  style={{
                    height: 10,
                    background: "#f4efe6",
                    border: "1px solid #e6dfd2",
                    borderRadius: 999,
                    overflow: "hidden",
                    padding: "2px",
                    marginTop: 6,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(4, Math.round(item.share * 100))}%`,
                      background: "linear-gradient(90deg,#1f49a6,#0a193a)",
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Top shelf: <b>{item.topShelf}</b>
                </div>
              </div>
            ))}
          </div>
        ))}
        </div>
      )}

      <div className="text-sm text-gray-700 mt-6">
        Top {entries.length} actions mencakup <b>{isNaN(totalSharePct) ? 0 : totalSharePct}%</b> dari semua aksi.
      </div>
    </div>
  );
};

export default TopActions;


