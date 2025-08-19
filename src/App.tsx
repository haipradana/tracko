import { useEffect, useState, useRef } from "react";
import FileUpload from "./components/FileUpload";
import DurationSlider from "./components/DurationSlider";
import Heatmap from "./components/Heatmap";
import DwellTimeChart from "./components/DwellTimeChart";
import CustomerJourney from "./components/CustomerJourney";
import BehaviorArchetypes from "./components/BehaviorArchetypes";
import InsightRecommendations from "./components/InsightRecommendations";
import AnnotatedVideo from "./components/AnnotatedVideo";
import TopActions from "./components/TopActions";
import { AlertCircle, Sparkles, Settings } from "lucide-react";
import axios from "axios";

// API Configuration
const FASTAPI_URL =
  import.meta.env.VITE_FASTAPI_URL || "https://api.tracko.tech";
// import.meta.env.VITE_FASTAPI_URL || "https://c909f3baf58e.ngrok-free.app";

// --- FrameSkipSlider Component (similar to DurationSlider) ---
const FrameSkipSlider = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) => {
  const options = [
    { value: 0.5, label: "High Accuracy (Slowest)" },
    { value: 1, label: "Balanced (Default)" },
    { value: 2, label: "Fast (Recommended)" },
    { value: 4, label: "Fastest (Lower Accuracy)" },
  ];

  const currentIndex = options.findIndex((opt) => opt.value === value);

  return (
    <div className="space-y-3">
      <input
        type="range"
        min={0}
        max={options.length - 1}
        value={currentIndex}
        onChange={(e) => onChange(options[Number(e.target.value)].value)}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #1f49a6 0%, #1f49a6 ${
            (currentIndex / (options.length - 1)) * 100
          }%, #e5e7eb ${(currentIndex / (options.length - 1)) * 100}%, #e5e7eb 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-gray-600">
        {options.map((opt) => (
          <span
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`cursor-pointer ${
              value === opt.value ? "font-bold text-blue-800" : ""
            }`}
          >
            {opt.label.split(" ")[0]}
          </span>
        ))}
      </div>
      <div className="text-center font-medium text-gray-800">
        Processing Mode:{" "}
        <span className="font-bold text-blue-800">
          {options[currentIndex].label}
        </span>
      </div>
    </div>
  );
};
// --- End FrameSkipSlider ---

// Define the structure for the journey analysis data from the backend
interface JourneyOutcome {
  shelf_id: string;
  konversi_sukses: number;
  keraguan_pembatalan: number;
  kegagalan_menarik_minat: number;
  total_interactions: number;
}

interface JourneyAnalysis {
  journey_data: JourneyOutcome[];
}

interface AnalysisResult {
  unique_persons: number;
  total_interactions: number;
  action_summary: Record<string, number>;
  shelf_interactions: Record<string, number>;
  shelf_dwell_times?: Record<string, number>;
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
  action_shelf_mapping: any[];
  journey_analysis?: JourneyAnalysis; // Add the new pre-calculated field
  processing_info: {
    fps: number;
    total_tracks: number;
    total_shelf_interactions: number;
  };
  metadata: {
    analysis_id: string;
    original_filename: string;
    timestamp: string;
    max_duration: number;
    file_size: number;
    video_generated: boolean;
  };
  download_links?: {
    annotated_video_stream?: string;
    annotated_video_blob_path?: string;
    annotated_video_download?: string;
    heatmap_image?: string;
    shelf_map_image?: string;
    shelf_map_images?: string[];
    csv_report?: string;
    json_results?: string;
  };
}

enum AnalysisStep {
  UPLOAD = "upload",
  PROCESSING = "processing",
  COMPLETED = "completed",
  ERROR = "error",
}

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
  const [maxDuration, setMaxDuration] = useState(30);
  const [frameSkip, setFrameSkip] = useState(1.0); // State for new slider
  const [showSettings, setShowSettings] = useState(false);
  type SpeedMode = "high" | "balanced" | "fast";
  const modeFromValue = (v: number): SpeedMode => (v <= 0.75 ? "high" : v <= 1.5 ? "balanced" : "fast");
  const [speedMode, setSpeedMode] = useState<SpeedMode>(modeFromValue(frameSkip));
  const applyMode = (m: SpeedMode) => {
    setSpeedMode(m);
    const mapping: Record<SpeedMode, number> = { high: 0.5, balanced: 1.0, fast: 2.0 };
    setFrameSkip(mapping[m]);
  };
  useEffect(() => {
    setSpeedMode(modeFromValue(frameSkip));
  }, [frameSkip]);
  const [currentStep, setCurrentStep] = useState<AnalysisStep>(
    AnalysisStep.UPLOAD
  );
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [shelfMapIndex, setShelfMapIndex] = useState<number>(0);

  const uploadSectionRef = useRef<HTMLDivElement | null>(null);

  const handleDownload = () => {
    if (currentStep === AnalysisStep.COMPLETED) {
      // Reset back to start for new analysis
      resetAnalysis();
      setTimeout(() => {
        uploadSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
      return;
    }
    // Scroll to upload area and trigger file picker
    uploadSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    const input = document.getElementById(
      "file-upload"
    ) as HTMLInputElement | null;
    if (input) input.click();
  };

  const handleAnalyze = async () => {
    if (!uploadedFile) return;

    console.log("🚀 Starting analysis...");
    console.log(
      "📄 File:",
      uploadedFile.name,
      `(${(uploadedFile.size / 1024 / 1024).toFixed(1)} MB)`
    );

    setCurrentStep(AnalysisStep.PROCESSING);
    setIsAnalyzing(true);
    setProgress(5);
    setError("");
    setElapsedSeconds(0);

    // Create FormData
    const formData = new FormData();
    formData.append("video", uploadedFile);
    formData.append("max_duration", maxDuration.toString());
    formData.append("frame_skip_multiplier", frameSkip.toString()); // Add this
    formData.append("save_to_blob", "true");
    formData.append("generate_video", "true");

    console.log("📋 Form data prepared:", {
      filename: uploadedFile.name,
      maxDuration,
      frameSkip, // Log this
      fileSize: uploadedFile.size,
    });

    // Keep initial small start; further progress will be driven by timer below
    setProgress(5);

    try {
      console.log("📤 Sending request to:", `${FASTAPI_URL}/analyze`);
      console.log("⏱️ Timeout set to:", 900000, "ms (15 minutes)");

      const response = await axios.post(`${FASTAPI_URL}/analyze`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 900000, // 15 minutes

        // Monitor upload progress
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const uploadPercent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log("📤 Upload progress:", uploadPercent + "%");

            // Keep early phase small: start ~5%, cap ~30%
            if (uploadPercent <= 100) {
              const adjustedProgress = Math.min(5 + uploadPercent * 0.2, 30);
              setProgress(adjustedProgress);
            }
          }
        },
      });

      // Response received
      console.log("✅ Response received!");

      // Log response details
      console.log("📊 Response status:", response.status);
      console.log("📦 Response headers:", response.headers);

      if (response.data) {
        console.log("🔍 Response data keys:", Object.keys(response.data));
        console.log(
          "📏 Response size:",
          JSON.stringify(response.data).length,
          "bytes"
        );

        // Check for required fields
        if (!response.data.metadata) {
          console.warn("⚠️ No metadata in response");
        }

        if (
          !response.data.unique_persons &&
          response.data.unique_persons !== 0
        ) {
          console.warn("⚠️ No unique_persons in response");
        }

        // Set progress to 100% before updating state
        setProgress(100);

        // Update state
        setAnalysisResult(response.data);
        setCurrentStep(AnalysisStep.COMPLETED);

        console.log("🎉 Analysis completed successfully!");
        console.log("👥 Unique persons:", response.data.unique_persons);
        console.log("🔄 Total interactions:", response.data.total_interactions);
      } else {
        throw new Error("No data received from analysis");
      }
    } catch (err: any) {
      console.error("❌ Analysis failed:", err);

      // Detailed error logging
      if (err.response) {
        console.error("📥 Response status:", err.response.status);
        console.error("📥 Response headers:", err.response.headers);
        console.error("📥 Response data:", err.response.data);
      } else if (err.request) {
        console.error("📤 Request details:", {
          readyState: err.request.readyState,
          status: err.request.status,
          statusText: err.request.statusText,
        });
      } else {
        console.error("⚙️ Setup error:", err.message);
      }

      // Set appropriate error messages
      let errorMessage = "Analysis failed";

      if (err.code === "ECONNABORTED") {
        errorMessage =
          "Request timeout - file mungkin terlalu besar atau server sedang busy";
      } else if (err.response?.status === 413) {
        errorMessage = "File terlalu besar - maksimal 50MB";
      } else if (err.response?.status === 500) {
        errorMessage = "Server error - coba lagi dalam beberapa menit";
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setCurrentStep(AnalysisStep.ERROR);
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
      console.log("🏁 Analysis process finished");
    }
  };

  const resetAnalysis = () => {
    setCurrentStep(AnalysisStep.UPLOAD);
    setAnalysisResult(null);
    setUploadedFile(null);
    setOriginalVideoUrl(null);
    setError("");
    setProgress(0);
    setIsAnalyzing(false);
  };

  // Build local preview URL for the uploaded (original) video
  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setOriginalVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return;
  }, [uploadedFile]);

  // Run processing timer while in processing state
  useEffect(() => {
    if (currentStep === AnalysisStep.PROCESSING) {
      const intervalId = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(intervalId);
    }
    return;
  }, [currentStep]);

  const formatElapsed = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const generateDwellTimeData = (result: AnalysisResult) => {
    // Gunakan data dwell time per rak yang sudah dihitung oleh backend
    const shelfDwellTimes = result.shelf_dwell_times || {};

    // Ubah format dari object ke array yang dibutuhkan oleh chart
    const dwellData = Object.entries(shelfDwellTimes).map(
      ([shelfId, timeInSeconds]) => ({
        shelf: shelfId,
        time: timeInSeconds,
      })
    );

    // Urutkan berdasarkan waktu terlama
    return dwellData.sort((a, b) => b.time - a.time);
  };

  const generateJourneyData = (result: AnalysisResult): JourneyOutcome[] => {
    // OPTIMIZED: Directly use pre-calculated data from the backend
    if (result.journey_analysis && result.journey_analysis.journey_data) {
      // Data is already processed, just sort it by total interactions for display
      return [...result.journey_analysis.journey_data].sort(
        (a, b) => b.total_interactions - a.total_interactions
      );
    }

    // Fallback to an empty array if the data isn't available for any reason
    console.warn("Journey analysis data not found in the backend response.");
    return [];
  };

  return (
    <div
      className="min-h-screen"
      style={{
        position: "relative",
        overflowX: "hidden",
        background: "#FBF7F0",
      }}
    >
      {/* Aurora disabled */}
      <style>{`
@keyframes spin{to{transform:rotate(1turn)}}
/* Navbar spans full width with fluid padding scaling by viewport width */
.nav-inner{width:100%;padding:clamp(12px,1.2vw,28px) clamp(24px,5vw,128px);margin:0 auto}
/* Hero/content kept centered with larger side paddings to avoid hugging left */
.hero-inner{max-width:1140px;padding-left:24px;padding-right:24px;margin:0 auto}
@media (min-width:1280px){.hero-inner{max-width:1240px;padding-left:36px;padding-right:36px}}
@media (min-width:1536px){.hero-inner{max-width:1380px;padding-left:48px;padding-right:48px}}
@media (min-width:1920px){.hero-inner{max-width:1600px;padding-left:64px;padding-right:64px}}
      `}</style>

      {/* Glass navbar */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backdropFilter: "saturate(140%) blur(12px)",
          background: "rgba(251,247,240,0.68)",
          borderBottom: "2px solid #e8e3d9",
        }}
      >
        <div
          className="nav-inner"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 15,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 700,
            }}
          >
            <div
              style={{
                display: "grid",
                placeItems: "center",
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg,#1f49a6,#0a193a)",
                color: "#fff",
                boxShadow: "0 10px 22px rgba(31,73,166,.20)",
              }}
            >
              🟦
            </div>
            <b>Tracko</b>
          </div>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <a
              href="#features"
              style={{
                color: "#2a3345",
                textDecoration: "none",
                fontSize: 14,
                opacity: 0.9,
              }}
            >
              Fitur
            </a>
            <a
              href="#results"
              style={{
                color: "#2a3345",
                textDecoration: "none",
                fontSize: 14,
                opacity: 0.9,
              }}
            >
              Hasil
            </a>
            <a
              href="#insights"
              style={{
                color: "#2a3345",
                textDecoration: "none",
                fontSize: 14,
                opacity: 0.9,
              }}
            >
              AI Insights
            </a>
          </div>
        </div>
      </nav>

      {/* spacer to offset fixed navbar height */}
      <div style={{ height: 60 }} />

      {/* Hero */}
      <header
        className="hero-inner"
        style={{
          position: "relative",
          zIndex: 1,
          margin: "0 auto",
          paddingTop: "50px",
          paddingBottom: "6px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            gap: 7,
            alignItems: "center",
            background: "rgba(255,255,255,.80)",
            border: "1px solid #e0dbd2",
            color: "#1e2b48",
            padding: "7px 16px",
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: ".1px",
          }}
        >
          <i
            style={{
              width: 7,
              height: 7,
              background: "linear-gradient(135deg,#1f49a6,#0a193a)",
              display: "inline-block",
              borderRadius: "50%",
            }}
          />{" "}
          <span
            style={{
              background: "linear-gradient(90deg,#1f49a6,#0a193a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 600,
              fontSize: 16.5,
              marginRight: 3,
              // fontFamily stays default (do not override)
            }}
          >
            Tracko
          </span>
          — Track Your Store
        </span>
        <h1
          style={{
            fontSize: 48,
            lineHeight: 1.08,
            margin: "10px 0",
            letterSpacing: ".1px",
            color: "#0b1220",
            fontWeight: 500,
            fontFamily: "'Poppins', 'Segoe UI', 'Montserrat', 'Helvetica Neue', Arial, sans-serif",
            textShadow: "0 2px 16px rgba(31,73,166,0.08)",
          }}
        >
          {currentStep === AnalysisStep.COMPLETED ? (
            <>Hasil analisis video CCTV Anda</>
          ) : (
            <>
              Upload video pelanggan, dapatkan{" "}
              <span
                style={{
                  background: "linear-gradient(90deg,#1f49a6,#0a193a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: 600,
                  fontFamily: "'Poppins', 'Segoe UI', 'Montserrat', 'Helvetica Neue', Arial, sans-serif",
                  letterSpacing: ".5px",
                }}
              >
                insight AI
              </span>{" "}
              untuk optimasi toko
            </>
          )}
        </h1>
        <p
          style={{
            margin: "0 0 18px",
            color: "#5b6475",
            maxWidth: 760,
            fontSize: 17,
          }}
        >
          {currentStep === AnalysisStep.COMPLETED ? (
            <>
              Analisis selesai untuk video CCTV toko Anda, insight AI siap
              membantu optimasi toko.
            </>
          ) : (
            <>
              Insight cerdas dari CCTV toko Anda, untuk membantu keputusan
              bisnis lebih cepat dan akurat.
            </>
          )}
        </p>
      </header>

      {/* CTA under hero */}
      <div
        className="hero-inner"
        style={{ textAlign: "left", marginBottom: 4 }}
      >
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 rounded-xl text-white"
            style={{
              background: "linear-gradient(135deg,#1f49a6,#0a193a)",
              boxShadow: "0 9px 15px 0 rgba(10,25,58,0.32)",
            }}
          >
            {/* <Download className="h-4 w-4 mr-2" /> */}
            {currentStep === AnalysisStep.COMPLETED
              ? "Analisis CCTV Lainnya"
              : "Analisis CCTV Toko Anda"}
          </button>
          <button
            className="inline-flex items-center px-4 py-2 rounded-xl bg-white text-gray-900 font-semibold shadow-md"
            style={{
              border: "1px solid #e6dfd2",
              boxShadow: "0 8px 20px 0 rgba(10,25,58,0.32)",
            }}
          >
            Lihat Demo
          </button>
        </div>
      </div>

      <main
        className="max-w-7xl mx-auto px-6 py-12"
        style={{ position: "relative", zIndex: 1 }}
      >
        {/* Progress Steps removed for cleaner UI */}

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Analysis Failed</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={resetAnalysis}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload + Status Section (shown during upload and processing) */}
        {(currentStep === AnalysisStep.UPLOAD ||
          currentStep === AnalysisStep.PROCESSING) && (
          <div ref={uploadSectionRef} className="space-y-8">
            {/* Desktop Layout: Upload & Duration on left, Processing on right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upload + Max Duration (mengikuti referensi) */}
              <div
                className="bg-white rounded-3xl shadow-sm p-6 md:p-8"
                style={{
                  border: "1px solid #e6dfd2",
                  background: "rgba(255,255,255,0.88)",
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{
                    marginTop: -12,
                    paddingBottom: 10,
                    borderBottom: "1px solid #e6dfd2",
                    marginBottom: 12,
                  }}
                >
                  <h3 className="font-semibold text-gray-900">Upload Video</h3>
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-xl"
                    style={{
                      background: "#f6f2eb",
                      border: "1px solid #e6dfd2",
                      color: "#2a3556",
                      marginLeft: "auto",
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: "#1f49a6",
                        display: "inline-block",
                      }}
                    />
                    <span className="text-sm">MP4 · AVI · MOV (≤100MB)</span>
                  </span>
                </div>
                {/* Upload di atas, slider di bawah, dibungkus border putus-putus */}
                <div className="grid gap-4 mt-3">
                  <div
                    style={{
                      border: "1px dashed #d7d1c6",
                      borderRadius: 14,
                      padding: "18px 16px",
                      background: "rgba(255,255,255,.60)",
                      position: "relative",
                    }}
                  >
                    {/* Settings (gear) button */}
                    <button
                      onClick={() => setShowSettings(true)}
                      title="Pengaturan Lanjutan"
                      className="absolute right-5 top-5 inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 bg-white border"
                      style={{ borderColor: "#e6dfd2" }}
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <div className="grid gap-5">
                      <FileUpload
                        onFileUpload={setUploadedFile}
                        uploadedFile={uploadedFile}
                        compact
                      />
                      {/* Mode Cepat radios, bound to frameSkip */}
                      <div>
                        <div className="text-sm text-gray-700 mb-2 font-medium">Mode Cepat</div>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="speed-mode"
                              checked={speedMode === "balanced"}
                              onChange={() => applyMode("balanced")}
                            />
                            <span>Balanced (Default)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="speed-mode"
                              checked={speedMode === "fast"}
                              onChange={() => applyMode("fast")}
                            />
                            <span>Fast</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="speed-mode"
                              checked={speedMode === "high"}
                              onChange={() => applyMode("high")}
                            />
                            <span>High Quality</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* <div className="grid gap-2"> */}
                  {/* <div style={{height:10, background:'#f4efe6', border:'1px solid #e6dfd2', borderRadius:999, overflow:'hidden'}}>
                      <div style={{height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#1f49a6,#0a193a)'}} />
                    </div> */}
                  {/* <small className="text-gray-600">Status: <b>Processing</b> — {Math.round(progress)}% Complete</small> */}
                  {/* </div>  */}
                </div>

                {/* Tombol Mulai Analisis */}
                <div className="text-center mt-6">
                  <button
                    onClick={handleAnalyze}
                    disabled={!uploadedFile || isAnalyzing}
                    className={`inline-flex items-center px-10 py-3 rounded-2xl font-semibold text-base transition-all duration-300 ${
                      !uploadedFile || isAnalyzing
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-800 to-blue-950 text-white"
                    } ${!uploadedFile || isAnalyzing ? "" : "hover:scale-105"}`}
                  >
                    {isAnalyzing ? (
                      <>
                        <div
                          className="animate-spin rounded-full h-6 w-6 mr-3 flex items-center justify-center bg-white shadow-md"
                          style={{
                            border: "2px solid #1f49a6",
                            borderTop: "2px solid transparent",
                            boxShadow: "0 2px 8px 0 rgba(10,25,58,0.10)",
                          }}
                        ></div>
                        <span className="text-gray-900">Menganalisis...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        <span>Mulai Analisis</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Processing status card */}
              <div
                className="bg-white rounded-3xl shadow-sm p-6 md:p-8"
                style={{
                  border: "1px solid #e6dfd2",
                  background: "rgba(255,255,255,0.88)",
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{
                    marginTop: -12,
                    paddingBottom: 10,
                    borderBottom: "1px solid #e6dfd2",
                    marginBottom: 12,
                  }}
                >
                  <h3 className="font-semibold text-gray-900">
                    Tahap Analisis
                  </h3>
                </div>
                <div className="grid gap-4 mt-4">
                  {/* Upload row */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg"
                      style={{
                        background: "rgba(251,247,240,0.6)",
                        border: "1px solid #e6dfd2",
                        color: "#1e2b48",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: uploadedFile ? "#16a34a" : "#cbd5e1",
                          display: "inline-block",
                        }}
                      />{" "}
                      Upload
                    </span>
                    <div
                      className="flex-1"
                      style={{
                        height: 10,
                        background: "#f4efe6",
                        border: "1px solid #e6dfd2",
                        borderRadius: 999,
                        overflow: "hidden",
                        padding: "2px",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: uploadedFile ? "100%" : "5%",
                          background: "linear-gradient(90deg,#1f49a6,#0a193a)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Processing row with time-driven progress: reach ~90% at 120s */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg"
                      style={{
                        background: "rgba(251,247,240,0.6)",
                        border: "1px solid #e6dfd2",
                        color: "#1e2b48",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: isAnalyzing ? "#16a34a" : "#cbd5e1",
                          display: "inline-block",
                        }}
                      />{" "}
                      Processing
                    </span>
                    <div
                      className="flex-1"
                      style={{
                        height: 10,
                        background: "#f4efe6",
                        border: "1px solid #e6dfd2",
                        borderRadius: 999,
                        overflow: "hidden",
                        padding: "2px",
                      }}
                    >
                      {(() => {
                        // target 90% at 120s => per second gain = 90/120 = 0.75
                        const timeDriven = Math.min(
                          90,
                          5 + elapsedSeconds * 0.75
                        );
                        const width = isAnalyzing
                          ? Math.max(5, Math.min(90, timeDriven))
                          : 5;
                        return (
                          <div
                            style={{
                              height: "100%",
                              width: `${width}%`,
                              background:
                                "linear-gradient(90deg,#1f49a6,#0a193a)",
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                  {isAnalyzing && (
                    <div className="text-gray-800 font-medium mt-1">
                      Waktu proses: {formatElapsed(elapsedSeconds)}
                    </div>
                  )}
                  <p className="text-gray-600 mt-1">
                    Durasi lebih panjang memberi analisis lebih komprehensif,
                    namun memerlukan waktu proses yang lebih lama.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Removed separate Processing Section; progress updates in the status card */}

        {/* Results Section */}
        {currentStep === AnalysisStep.COMPLETED && analysisResult && (
          <div className="space-y-8">
            {/* Annotated Video + Shelf Map: stacked on mobile, side-by-side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {(analysisResult.download_links?.annotated_video_stream ||
                analysisResult.download_links?.annotated_video_blob_path ||
                analysisResult.download_links?.annotated_video_download) && (
                <div
                  className="bg-white rounded-3xl shadow-sm p-8"
                  style={{
                    border: "1px solid #e6dfd2",
                    background: "rgba(255,255,255,0.88)",
                  }}
                >
                  <div
                    className="flex items-center justify-between"
                    style={{
                      marginTop: -12,
                      paddingBottom: 10,
                      borderBottom: "1px solid #e6dfd2",
                      marginBottom: 12,
                    }}
                  >
                    <div className="flex items-center">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Annotated Video
                      </h3>
                    </div>
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
                      Tracking + Behaviour
                    </span>
                  </div>
                  {(() => {
                    const links = analysisResult.download_links || {};
                    const url = links.annotated_video_stream
                      ? `${FASTAPI_URL}${links.annotated_video_stream}`
                      : links.annotated_video_blob_path
                      ? `${FASTAPI_URL}/stream?blob=${encodeURIComponent(
                          links.annotated_video_blob_path
                        )}`
                      : undefined;
                    return (
                      <AnnotatedVideo
                        videoUrl={url}
                        downloadUrl={links.annotated_video_download}
                        analysisId={analysisResult.metadata?.analysis_id}
                        originalUrl={originalVideoUrl || undefined}
                      />
                    );
                  })()}
                </div>
              )}

              {(analysisResult.download_links?.shelf_map_images ||
                analysisResult.download_links?.shelf_map_image) && (
                <div
                  className="bg-white rounded-3xl shadow-sm p-8"
                  style={{
                    border: "1px solid #e6dfd2",
                    background: "rgba(255,255,255,0.88)",
                  }}
                >
                  <div
                    className="flex items-center justify-between"
                    style={{
                      marginTop: -12,
                      paddingBottom: 10,
                      borderBottom: "1px solid #e6dfd2",
                      marginBottom: 12,
                    }}
                  >
                    <h3 className="text-lg font-semibold text-gray-900">
                      Shelf Map
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
                      Shelf Map
                    </span>
                  </div>
                  {(() => {
                    const imgs =
                      analysisResult.download_links?.shelf_map_images ||
                      [analysisResult.download_links?.shelf_map_image].filter(
                        Boolean
                      );
                    const safeImgs = imgs.filter(Boolean) as string[];
                    return (
                      <div>
                        {/* Current image */}
                        {safeImgs.length > 0 && (
                          <img
                            src={
                              safeImgs[
                                Math.min(shelfMapIndex, safeImgs.length - 1)
                              ]
                            }
                            alt={`Shelf Map ${
                              Math.min(shelfMapIndex, safeImgs.length - 1) + 1
                            }`}
                            className="w-full h-full object-contain rounded-xl"
                            style={{ display: "block", background: "#f8f7f4" }}
                          />
                        )}
                        {/* Actions */}
                        <div className="mt-6 flex gap-3 justify-center">
                          {safeImgs.length > 0 && (
                            <a
                              href={
                                safeImgs[
                                  Math.min(shelfMapIndex, safeImgs.length - 1)
                                ]
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 rounded-xl text-white"
                              style={{
                                background:
                                  "linear-gradient(135deg,#1f49a6,#0a193a)",
                              }}
                            >
                              Download
                            </a>
                          )}
                          {safeImgs.length > 1 && (
                            <button
                              onClick={() =>
                                setShelfMapIndex(
                                  (prev) => (prev + 1) % safeImgs.length
                                )
                              }
                              className="inline-flex items-center px-4 py-2 rounded-xl text-gray-900 font-semibold"
                              style={{
                                background: "#fff",
                                border: "1px solid #e6dfd2",
                              }}
                            >
                              Other
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Statistics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                className="rounded-2xl p-6 text-white"
                style={{
                  background: "linear-gradient(135deg,#1f49a6,#0a193a)",
                }}
              >
                <h4 className="text-lg font-semibold mb-2">Unique Persons</h4>
                <p className="text-3xl font-bold">
                  {analysisResult.unique_persons}
                </p>
                <p className="text-blue-200 text-sm">Detected in video</p>
              </div>
              <div
                className="rounded-2xl p-6 text-white"
                style={{
                  background: "linear-gradient(135deg,#1f49a6,#0a193a)",
                }}
              >
                <h4 className="text-lg font-semibold mb-2">Detected Actions</h4>
                <p className="text-3xl font-bold">
                  {analysisResult.total_interactions}
                </p>
                <p className="text-blue-200 text-sm">Customer actions</p>
              </div>
              <div
                className="rounded-2xl p-6 text-white"
                style={{
                  background: "linear-gradient(135deg,#1f49a6,#0a193a)",
                }}
              >
                <h4 className="text-lg font-semibold mb-2">Avg Dwell Time</h4>
                <p className="text-3xl font-bold">
                  {analysisResult.dwell_time_analysis?.average_dwell_time?.toFixed(
                    1
                  ) || 0}
                  s
                </p>
                <p className="text-blue-200 text-sm">Per customer</p>
              </div>
            </div>

            {/* Top Actions (before Journey) */}
            <TopActions analysisData={analysisResult} />

            {/* Visualizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Heatmap */}
              <div
                className="bg-white rounded-3xl shadow-sm p-8"
                style={{
                  border: "1px solid #e6dfd2",
                  background: "rgba(255,255,255,0.88)",
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{
                    marginTop: -12,
                    paddingBottom: 10,
                    borderBottom: "1px solid #e6dfd2",
                    marginBottom: 12,
                  }}
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    Customer Traffic Heatmap
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
                    Traffic Heatmap
                  </span>
                </div>
                <Heatmap
                  data={analysisResult.heatmap_data}
                  heatmapImageUrl={analysisResult.download_links?.heatmap_image}
                />
              </div>

              {/* Dwell Time Chart */}
              <div
                className="bg-white rounded-3xl shadow-sm p-8"
                style={{
                  border: "1px solid #e6dfd2",
                  background: "rgba(255,255,255,0.88)",
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{
                    marginTop: -12,
                    paddingBottom: 10,
                    borderBottom: "1px solid #e6dfd2",
                    marginBottom: 12,
                  }}
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    Dwell Time per Area
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
                    Dwell Time
                  </span>
                </div>
                <DwellTimeChart
                  data={generateDwellTimeData(analysisResult)}
                  altData={(() => {
                    const load =
                      (analysisResult as any).shelf_dwell_load_seconds || {};
                    const asArr = Object.entries(load).map(
                      ([shelf, seconds]) => ({ shelf, time: seconds as number })
                    );
                    return asArr.sort((a, b) => b.time - a.time);
                  })()}
                />
              </div>
            </div>

            {/* Customer Journey */}
            <div
              className="bg-white rounded-3xl shadow-sm p-8"
              style={{
                border: "1px solid #e6dfd2",
                background: "rgba(255,255,255,0.88)",
              }}
            >
              <CustomerJourney
                journeyData={generateJourneyData(analysisResult)}
              />
            </div>

            {/* Behavior Archetypes */}
            <div
              className="bg-white rounded-3xl shadow-sm p-8"
              style={{
                border: "1px solid #e6dfd2",
                background: "rgba(255,255,255,0.88)",
              }}
            >
              <div
                className="flex items-center justify-between"
                style={{
                  marginTop: -12,
                  paddingBottom: 10,
                  borderBottom: "1px solid #e6dfd2",
                  marginBottom: 12,
                }}
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  Behavioral Archetypes
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
                  Archetypes
                </span>
              </div>
              <BehaviorArchetypes analysisData={analysisResult} />
            </div>

            {/* AI Insights */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-lg p-8 text-white">
              <div
                className="flex items-center justify-between"
                style={{
                  marginTop: -12,
                  paddingBottom: 10,
                  borderBottom: "1px solid rgba(255,255,255,0.18)",
                  marginBottom: 12,
                }}
              >
                <h3 className="text-lg font-semibold">
                  AI Insights & Rekomendasi
                </h3>
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
              <InsightRecommendations analysisData={analysisResult} />
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.35)" }}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6"
              style={{ border: "1px solid #e6dfd2", background: "#fff" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Pengaturan Lanjutan</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>
              <div className="grid gap-6">
                <div>
                  <div className="text-sm text-gray-700 mb-2 font-medium">Max Duration</div>
                  <DurationSlider value={maxDuration} onChange={setMaxDuration} fileSize={uploadedFile?.size} />
                </div>
                <div>
                  <div className="text-sm text-gray-700 mb-2 font-medium">Processing Speed</div>
                  <FrameSkipSlider value={frameSkip} onChange={setFrameSkip} />
                  <div className="mt-2 text-xs text-gray-500">Terkait dengan Mode Cepat: {speedMode === "high" ? "High Quality" : speedMode === "fast" ? "Fast" : "Balanced (Default)"}</div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-xl bg-white text-gray-900"
                  style={{ border: "1px solid #e6dfd2" }}
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
