import { Sparkles } from "lucide-react";

const StaticInsightPlaceholder = () => {
  return (
    <div
      className="bg-white rounded-3xl shadow-sm p-8"
      style={{
        border: "1px solid #e6dfd2",
        background: "rgba(255,255,255,0.88)",
      }}
      id="insights"
    >
      <div
        className="flex items-center justify-between"
        style={{
          marginTop: -12,
          paddingBottom: 10,
          borderBottom: "1px solid #e6dfd2",
          marginBottom: 24, // Increased margin
        }}
      >
        <h3 className="text-lg font-semibold text-gray-900">
          AI Insights & Rekomendasi
        </h3>
        <span
          className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-xl text-sm"
          style={{
            background: "#f6f2eb",
            border: "1px solid #e6dfd2",
            color: "#2a3556",
            marginLeft: "auto",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#1f49a6",
              display: "inline-block",
            }}
          />
          AI Insights
        </span>
      </div>

      {/* Static Content */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-3 mb-4">
          <div
            className="p-3 rounded-2xl"
            style={{ background: "rgba(31,73,166,0.12)" }}
          >
            <Sparkles className="h-5 w-5" style={{ color: "#1f49a6" }} />
          </div>
          <h3
            className="text-2xl font-bold"
            style={{
              background: "linear-gradient(135deg, #1f49a6, #0a193a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            AI Insights
          </h3>
        </div>
        <p className="text-gray-800 text-lg mx-auto whitespace-normal md:whitespace-nowrap">
          Dapatkan rekomendasi AI dari data asli atau buat insight berbasis
          prompt.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          (Upload video untuk memulai analisis)
        </p>
      </div>
    </div>
  );
};

export default StaticInsightPlaceholder;
