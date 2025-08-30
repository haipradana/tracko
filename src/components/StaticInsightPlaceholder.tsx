import { Sparkles } from "lucide-react";

const StaticInsightPlaceholder = () => {
  return (
    <div
      className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-lg p-8 text-white"
      id="insights"
    >
      <div
        className="flex items-center justify-between"
        style={{
          marginTop: -12,
          paddingBottom: 10,
          borderBottom: "1px solid rgba(255,255,255,0.18)",
          marginBottom: 24, // Increased margin
        }}
      >
        <h3 className="text-lg font-semibold">AI Insights & Rekomendasi</h3>
        <span
          className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-xl text-sm"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.20)",
            color: "#fff",
            marginLeft: "auto",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#facc15",
              display: "inline-block",
            }}
          />
          AI Insights
        </span>
      </div>

      {/* Static Content */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-3 mb-4">
          <div className="p-3 bg-yellow-400/20 rounded-2xl">
            <Sparkles className="h-6 w-6 text-yellow-400" />
          </div>
          <h3 className="text-2xl font-bold">AI Insights</h3>
        </div>
        <p className="text-gray-300 text-lg mx-auto whitespace-normal md:whitespace-nowrap">
          Dapatkan rekomendasi AI dari data asli atau buat insight berbasis
          prompt.
        </p>
        <p className="text-sm text-gray-400 mt-4">
          (Upload video untuk memulai analisis)
        </p>
      </div>
    </div>
  );
};

export default StaticInsightPlaceholder;
