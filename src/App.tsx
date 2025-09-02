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
import TrackGallery from "./components/TrackGallery";
import StaticInsightPlaceholder from "./components/StaticInsightPlaceholder"; // Import the new component
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
  // New: server-provided processing + gallery for filtering
  processing?: {
    tracks: Record<string, Array<{ frame: number; bbox: number[]; pid: number }>>;
    action_preds: Record<string, Array<{ start: number; end: number; pred: number; action_name?: string }>>;
    shelf_boxes_per_frame: Record<string, Array<[string, number[]]>>;
    fps: number;
    frame_size?: [number, number] | null;
  };
  track_gallery?: Array<{ pid: number; frame: number; bbox: number[]; duration_s: number; thumbnail_url: string }>;
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

interface BatchAnalysisResult {
  analysis_type: 'batch_analysis';
  batch_id: string;
  total_files: number;
  individual_results: AnalysisResult[];
  aggregate_metrics: {
    total_unique_persons: number;
    total_interactions: number;
    average_dwell_time_across_videos: number;
    most_common_action_overall: string;
    total_analysis_duration: number;
    files_analyzed: number;
    action_distribution?: Record<string, number>;
    per_file_summary?: Array<{
      filename: string;
      unique_persons: number;
      total_interactions: number;
      avg_dwell_time: number;
      most_common_action: string;
    }>;
  };
  batch_metadata: {
    timestamp: string;
    processing_time: number;
    files_info: Array<{
      filename: string;
      file_size: number;
      analysis_id: string;
    }>;
  };
}

enum AnalysisStep {
  UPLOAD = "upload",
  PROCESSING = "processing",
  COMPLETED = "completed",
  ERROR = "error",
}

function App() {
  // File management
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [originalVideoUrls, setOriginalVideoUrls] = useState<string[]>([]);
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  
  // Analysis settings
  const [maxDuration, setMaxDuration] = useState(30);
  const [frameSkip, setFrameSkip] = useState(1.0);
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
  
  // Analysis state
  const [currentStep, setCurrentStep] = useState<AnalysisStep>(
    AnalysisStep.UPLOAD
  );
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [batchResult, setBatchResult] = useState<BatchAnalysisResult | null>(
    null
  );
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'individual' | 'comparison' | 'summary'>('individual');
  
  // UI state
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [shelfMapIndex, setShelfMapIndex] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [excludedIds, setExcludedIds] = useState<Array<number>>([]);

  const uploadSectionRef = useRef<HTMLDivElement | null>(null);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    resetAnalysis();
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

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

  // Get current analysis data based on view mode
  const getCurrentAnalysisData = (): AnalysisResult | null => {
    if (batchResult && viewMode === 'individual') {
      return batchResult.individual_results[selectedFileIndex] || null;
    }
    return analysisResult;
  };

  // Get current file info
  const getCurrentFileInfo = () => {
    if (uploadedFiles.length === 0) return null;
    if (isMultipleMode && viewMode === 'individual') {
      return uploadedFiles[selectedFileIndex] || uploadedFiles[0];
    }
    return uploadedFiles[0];
  };

  // Use getCurrentFileInfo to avoid unused variable warning
  const currentFileInfo = getCurrentFileInfo();
  
  // Suppress unused variable warnings
  void currentFileInfo;
  void progress;

  const handleAnalyze = async () => {
    if (uploadedFiles.length === 0) return;

    // Determine if we should use batch or single analysis
    const isBatch = uploadedFiles.length > 1;

    console.log("🚀 Starting analysis...");
    if (isBatch) {
      console.log(
        "📄 Batch Files:",
        uploadedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`).join(', ')
      );
    } else {
      console.log(
        "📄 File:",
        uploadedFiles[0].name,
        `(${(uploadedFiles[0].size / 1024 / 1024).toFixed(1)} MB)`
      );
    }

    setCurrentStep(AnalysisStep.PROCESSING);
    setIsAnalyzing(true);
    setProgress(5);
    setError("");
    setElapsedSeconds(0);

    // Create FormData
    const formData = new FormData();
    if (isBatch) {
      uploadedFiles.forEach(file => {
        formData.append("videos", file);
      });
    } else {
      formData.append("video", uploadedFiles[0]);
    }
    formData.append("max_duration", maxDuration.toString());
    formData.append("frame_skip_multiplier", frameSkip.toString());
    formData.append("save_to_blob", "true");
    formData.append("generate_video", "true");

    console.log("📋 Form data prepared:", {
      filenames: uploadedFiles.map(f => f.name),
      fileCount: uploadedFiles.length,
      maxDuration,
      frameSkip,
      totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
      isBatch
    });

    // Keep initial small start; further progress will be driven by timer below
    setProgress(5);

    try {
      const endpoint = isBatch ? `${FASTAPI_URL}/analyze-batch` : `${FASTAPI_URL}/analyze`;
      console.log("📤 Sending request to:", endpoint);
      console.log("⏱️ Timeout set to:", 900000, "ms (15 minutes)");

      const response = await axios.post(endpoint, formData, {
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

        // Update state based on response type
        if (response.data.analysis_type === 'batch_analysis') {
          setBatchResult(response.data);
          setAnalysisResult(null);
        } else {
          setAnalysisResult(response.data);
          setBatchResult(null);
        }
        setCurrentStep(AnalysisStep.COMPLETED);

        console.log("🎉 Analysis completed successfully!");
        if (response.data.analysis_type === 'batch_analysis') {
          console.log("📊 Batch Analysis:", response.data.total_files, "files processed");
          console.log("👥 Total unique persons:", response.data.aggregate_metrics.total_unique_persons);
        } else {
          console.log("👥 Unique persons:", response.data.unique_persons);
        }
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
    setBatchResult(null);
    setUploadedFiles([]);
    setOriginalVideoUrls([]);
    setSelectedFileIndex(0);
    setViewMode('individual');
    setVideoDuration(null);
    setError("");
    setProgress(0);
    setIsAnalyzing(false);
    setExcludedIds([]);
  };

  const handleFileUpload = (files: File[] | null) => {
    if (files && files.length > 0) {
      setUploadedFiles(files);
      setIsMultipleMode(files.length > 1);
    } else {
      setUploadedFiles([]);
      setIsMultipleMode(false);
    }
  };

  // Build local preview URLs for uploaded videos
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      const urls = uploadedFiles.map(file => URL.createObjectURL(file));
      setOriginalVideoUrls(urls);

      // Auto-detect video duration for first video
      if (uploadedFiles[0]) {
        const videoElement = document.createElement("video");
        videoElement.src = urls[0];
        videoElement.onloadedmetadata = () => {
          setVideoDuration(videoElement.duration);
        };
      }

      return () => {
        urls.forEach(url => URL.revokeObjectURL(url));
        setVideoDuration(null);
      };
    } else {
      setOriginalVideoUrls([]);
      setVideoDuration(null);
    }
    return;
  }, [uploadedFiles]);

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

  // --- Track Gallery handlers ---
  const toggleExcludePid = async (pid: number) => {
    const currentData = getCurrentAnalysisData();
    if (!currentData) return;
    const next = excludedIds.includes(pid)
      ? excludedIds.filter((x) => x !== pid)
      : [...excludedIds, pid];
    setExcludedIds(next);
    
    // Call backend to recompute
    try {
      const currentData = getCurrentAnalysisData();
      if (!currentData) return;
      
      const payload = {
        analysis_id: currentData.metadata?.analysis_id,
        excluded_track_ids: next.map(id => String(id)), // Ensure IDs are strings
        processing: currentData.processing,
      };
      
      const resp = await axios.post(`${FASTAPI_URL}/apply-filters`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000,
      });
      
      if (resp?.data) {
        // Deep merge download_links, otherwise the new response (with only heatmap_image) will overwrite other links
        const newDownloadLinks = {
          ...(currentData.download_links || {}),
          ...(resp.data.download_links || {})
        };
        
        const merged: AnalysisResult = {
          ...currentData,
          ...resp.data,
          download_links: newDownloadLinks
        };

        // Update single file analysis if exists
        setAnalysisResult((prev) => {
          if (!prev) return prev;
          return merged;
        });
        
        // Update batch analysis if exists
        setBatchResult((prev) => {
          if (!prev || viewMode !== 'individual') return prev;
          
          const updatedResults = [...prev.individual_results];
          updatedResults[selectedFileIndex] = merged;
          
          return {
            ...prev,
            individual_results: updatedResults
          };
        });
      }
    } catch (e: any) {
      console.error('❌ Failed to apply filters:', e);
      if (e.response) {
        console.error('📥 Error response:', e.response.status, e.response.data);
      }
    }
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
      .nav-inner{width:100%;padding:clamp(8px,0.8vw,16px) clamp(24px,5vw,128px);margin:0 auto}
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
          <a href="/" onClick={handleHomeClick} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
            <img src="/logo3.svg" alt="Tracko Logo" style={{ height: 43, width: 'auto', objectFit: 'contain' }} />
          </a>
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
              Demo
            </a>
            <a
              href="#insights"
              onClick={(e) => handleNavClick(e, 'insights')}
              style={{
                background: "linear-gradient(135deg,#1f49a6,#0a193a)",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "15px",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
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
                        onFileUpload={handleFileUpload}
                        uploadedFiles={uploadedFiles}
                        multiple={true}
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
                    disabled={uploadedFiles.length === 0 || isAnalyzing}
                    className={`inline-flex items-center px-10 py-3 rounded-2xl font-semibold text-base transition-all duration-300 ${
                      uploadedFiles.length === 0 || isAnalyzing
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-800 to-blue-950 text-white"
                    } ${uploadedFiles.length === 0 || isAnalyzing ? "" : "hover:scale-105"}`}
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
                          background: uploadedFiles.length > 0 ? "#16a34a" : "#cbd5e1",
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
                          width: uploadedFiles.length > 0 ? "100%" : "5%",
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
                  {/* --- Analysis Details --- */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-700">
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <dt className="font-medium text-gray-500">Files</dt>
                        <dd className="truncate text-right">
                          {uploadedFiles.length === 1 
                            ? uploadedFiles[0].name 
                            : `${uploadedFiles.length} files selected`
                          }
                        </dd>

                        <dt className="font-medium text-gray-500">Durasi video</dt>
                        <dd className="text-right">
                          {videoDuration
                            ? `${Math.floor(videoDuration / 60)}m ${Math.round(
                                videoDuration % 60
                              )}s`
                            : "Mendeteksi..."}
                        </dd>

                        <dt className="font-medium text-gray-500">Ukuran file</dt>
                        <dd className="text-right">
                          {uploadedFiles.length === 1 
                            ? `${(uploadedFiles[0].size / 1024 / 1024).toFixed(1)} MB`
                            : `${(uploadedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1)} MB total`
                          }
                        </dd>

                        <dt className="font-medium text-gray-500">Mode Cepat</dt>
                        <dd className="text-right font-semibold">
                          {speedMode === "high"
                            ? "High Quality"
                            : speedMode === "fast"
                            ? "Fast"
                            : "Balanced (Default)"}
                        </dd>
                      </dl>
                    </div>
                  )}
                  {/* --- End Analysis Details --- */}
                </div>
              </div>
            </div>
            <StaticInsightPlaceholder /> 
          </div>
        )}

        {/* Removed separate Processing Section; progress updates in the status card */}

        {/* File Selector for Batch Analysis */}
          {currentStep === AnalysisStep.COMPLETED && batchResult && (
            <div className="hero-inner space-y-8 pb-7">
              <div className="bg-white rounded-3xl shadow-sm p-8" style={{ border: '1px solid #e6dfd2', background: 'rgba(255,255,255,0.88)' }}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Batch Analysis Results</h2>
                  
                  {/* View Mode Toggle */}
                  <div className="flex gap-4 mb-6">
                    <button
                      onClick={() => setViewMode('individual')}
                      className={`px-4 py-2 rounded-xl font-medium transition-all ${
                        viewMode === 'individual'
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={viewMode === 'individual' ? { background: 'linear-gradient(135deg,#1f49a6,#0a193a)' } : {}}
                    >
                      Individual Files
                    </button>
                    <button
                      onClick={() => setViewMode('comparison')}
                      className={`px-4 py-2 rounded-xl font-medium transition-all ${
                        viewMode === 'comparison'
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={viewMode === 'comparison' ? { background: 'linear-gradient(135deg,#1f49a6,#0a193a)' } : {}}
                    >
                      Comparison
                    </button>
                    <button
                      onClick={() => setViewMode('summary')}
                      className={`px-4 py-2 rounded-xl font-medium transition-all ${
                        viewMode === 'summary'
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={viewMode === 'summary' ? { background: 'linear-gradient(135deg,#1f49a6,#0a193a)' } : {}}
                    >
                      Summary
                    </button>
                  </div>

                  {/* File Selector for Individual View */}
                  {viewMode === 'individual' && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">Select File to Analyze:</h3>
                      <div className="grid gap-3">
                        {batchResult.individual_results.map((result, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedFileIndex(idx)}
                            className={`p-4 rounded-xl text-left transition-all ${
                              selectedFileIndex === idx
                                ? 'bg-blue-50 border-2 border-blue-200'
                                : 'bg-white border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1f49a6,#0a193a)' }}>
                                  <span className="text-white font-bold">{idx + 1}</span>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {result.metadata?.original_filename || 
                                     (uploadedFiles[idx] ? uploadedFiles[idx].name : `File ${idx + 1}`)}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {result.unique_persons} persons • {Object.keys(result.shelf_interactions).length} shelves
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-700">
                                  {result.dwell_time_analysis.average_dwell_time.toFixed(1)}s avg dwell
                                </p>
                                <p className="text-xs text-gray-500">
                                  {result.metadata?.file_size ? 
                                    `${(result.metadata.file_size / 1024 / 1024).toFixed(1)} MB` :
                                    (uploadedFiles[idx] ? `${(uploadedFiles[idx].size / 1024 / 1024).toFixed(1)} MB` : 'Unknown size')
                                  }
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comparison View */}
                  {viewMode === 'comparison' && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-4">Side-by-Side Comparison</h3>
                      <div className="flex flex-wrap justify-center gap-4">
                        {batchResult.individual_results.map((result, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 w-full sm:w-80 max-w-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1f49a6,#0a193a)' }}>
                                <span className="text-white font-bold text-sm">{idx + 1}</span>
                              </div>
                              <h4 className="font-semibold text-gray-900 text-sm truncate">
                                {result.metadata?.original_filename || 
                                 (uploadedFiles[idx] ? uploadedFiles[idx].name : `File ${idx + 1}`)}
                              </h4>
                            </div>
                            
                            {/* Mini Heatmap */}
                            <div className="mb-3">
                              <div className="aspect-square bg-gray-100 rounded-lg p-2">
                                {result.download_links?.heatmap_image ? (
                                  <img 
                                    src={result.download_links.heatmap_image} 
                                    alt="Traffic Heatmap"
                                    className="w-full h-full object-cover rounded"
                                    onError={(e) => {
                                       e.currentTarget.style.display = 'none';
                                       const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                       if (nextElement) {
                                         nextElement.style.display = 'flex';
                                       }
                                     }}
                                  />
                                ) : null}
                                <div 
                                  className="w-full h-full flex items-center justify-center text-gray-400 text-xs"
                                  style={{ display: result.download_links?.heatmap_image ? 'none' : 'flex' }}
                                >
                                  No heatmap image
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 text-center">Traffic Heatmap</p>
                            </div>
                            
                            {/* Key Metrics */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">Persons:</span>
                                <span className="text-sm font-semibold" style={{ color: '#1f49a6' }}>{result.unique_persons}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">Interactions:</span>
                                <span className="text-sm font-semibold" style={{ color: '#1f49a6' }}>{result.total_interactions}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">Avg Dwell:</span>
                                <span className="text-sm font-semibold" style={{ color: '#1f49a6' }}>
                                  {result.dwell_time_analysis.average_dwell_time.toFixed(1)}s
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">Top Action:</span>
                                <span className="text-xs font-medium text-gray-800 truncate">
                                  {result.behavioral_insights.most_common_action}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">Shelves:</span>
                                <span className="text-sm font-semibold" style={{ color: '#1f49a6' }}>
                                  {Object.keys(result.shelf_interactions).length}
                                </span>
                              </div>
                            </div>
                            
                            {/* View Details Button */}
                            <button
                              onClick={() => {
                                setSelectedFileIndex(idx);
                                setViewMode('individual');
                              }}
                              className="w-full mt-3 px-3 py-2 text-white rounded-lg text-xs font-medium transition-colors hover:opacity-90"
                              style={{ background: 'linear-gradient(135deg,#1f49a6,#0a193a)' }}
                            >
                              View Details
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary View */}
                  {viewMode === 'summary' && (
                    <div className="mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="p-6 rounded-xl" style={{ background: 'linear-gradient(135deg,#1f49a6,#0a193a)' }}>
                          <h4 className="font-semibold text-white mb-2">Total Files</h4>
                          <p className="text-3xl font-bold text-white">{batchResult.total_files}</p>
                        </div>
                        <div className="p-6 rounded-xl" style={{ background: 'linear-gradient(135deg,#1f49a6,#0a193a)' }}>
                          <h4 className="font-semibold text-white mb-2">Total Persons</h4>
                          <p className="text-3xl font-bold text-white">{batchResult.aggregate_metrics.total_unique_persons}</p>
                        </div>
                        <div className="p-6 rounded-xl" style={{ background: 'linear-gradient(135deg,#1f49a6,#0a193a)' }}>
                          <h4 className="font-semibold text-white mb-2">Avg Dwell Time</h4>
                          <p className="text-3xl font-bold text-white">{batchResult.aggregate_metrics.average_dwell_time_across_videos.toFixed(1)}s</p>
                        </div>
                      </div>
                      
                      {/* Per-File Summary Table */}
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h4 className="font-semibold text-gray-900">Per-File Summary</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Persons</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Dwell</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Top Action</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {batchResult.aggregate_metrics.per_file_summary?.map((fileSummary, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {fileSummary.filename === 'unknown' && uploadedFiles[idx] ? 
                                      uploadedFiles[idx].name : 
                                      fileSummary.filename
                                    }
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: '#1f49a6' }}>
                                    {fileSummary.unique_persons}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: '#1f49a6' }}>
                                    {fileSummary.total_interactions}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: '#1f49a6' }}>
                                    {fileSummary.avg_dwell_time.toFixed(1)}s
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {fileSummary.most_common_action}
                                  </td>
                                </tr>
                              )) || []}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            </div>
          )}

          {/* Results Section */}
          {currentStep === AnalysisStep.COMPLETED && (analysisResult || (batchResult && viewMode === 'individual')) && (
          <div className="hero-inner space-y-8">
            {/* Annotated Video + Shelf Map: stacked on mobile, side-by-side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {(() => {
                const currentData = getCurrentAnalysisData();
                return currentData && (currentData.download_links?.annotated_video_stream ||
                  currentData.download_links?.annotated_video_blob_path ||
                  currentData.download_links?.annotated_video_download);
              })() && (
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
                    const currentData = getCurrentAnalysisData();
                    if (!currentData) return null;
                    const links = currentData.download_links || {};
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
                        analysisId={currentData.metadata?.analysis_id}
                        originalUrl={originalVideoUrls[selectedFileIndex] || originalVideoUrls[0] || undefined}
                      />
                    );
                  })()}
                </div>
              )}

              {(() => {
                const currentData = getCurrentAnalysisData();
                return currentData && (currentData.download_links?.shelf_map_images ||
                  currentData.download_links?.shelf_map_image);
              })() && (
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
                      const currentData = getCurrentAnalysisData();
                      const imgs = currentData?.download_links?.shelf_map_images ||
                        [currentData?.download_links?.shelf_map_image].filter(Boolean) || [];
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

                        {/* Track Gallery moved to its own full-width section below */}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Full-width Track Gallery */}
            {(() => {
              const currentData = getCurrentAnalysisData();
              return currentData?.track_gallery && currentData.track_gallery.length > 0;
            })() && (
              <div className="bg-white rounded-3xl shadow-sm p-8" style={{ border: '1px solid #e6dfd2', background: 'rgba(255,255,255,0.88)' }}>
                <TrackGallery
                  items={getCurrentAnalysisData()?.track_gallery || []}
                  excludedIds={excludedIds}
                  onToggleExclude={toggleExcludePid}
                />
              </div>
            )}

            {/* Statistics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                className="rounded-2xl p-6 text-white relative"
                style={{
                  background: "linear-gradient(135deg,#1f49a6,#0a193a)",
                }}
              >
                {excludedIds.length > 0 && (
                  <span className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded text-xs bg-white/20 text-white">
                    Filtered
                  </span>
                )}
                <h4 className="text-lg font-semibold mb-2">Unique Persons</h4>
                <p className="text-3xl font-bold">
                  {getCurrentAnalysisData()?.unique_persons || 0}
                </p>
                <p className="text-blue-200 text-sm">Detected in video</p>
              </div>
              <div
                className="rounded-2xl p-6 text-white relative"
                style={{
                  background: "linear-gradient(135deg,#1f49a6,#0a193a)",
                }}
              >
                {excludedIds.length > 0 && (
                  <span className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded text-xs bg-white/20 text-white">
                    Filtered
                  </span>
                )}
                <h4 className="text-lg font-semibold mb-2">Detected Actions</h4>
                <p className="text-3xl font-bold">
                  {getCurrentAnalysisData()?.total_interactions || 0}
                </p>
                <p className="text-blue-200 text-sm">Customer actions</p>
              </div>
              <div
                className="rounded-2xl p-6 text-white relative"
                style={{
                  background: "linear-gradient(135deg,#1f49a6,#0a193a)",
                }}
              >
                {excludedIds.length > 0 && (
                  <span className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded text-xs bg-white/20 text-white">
                    Filtered
                  </span>
                )}
                <h4 className="text-lg font-semibold mb-2">Avg Dwell Time</h4>
                <p className="text-3xl font-bold">
                  {getCurrentAnalysisData()?.dwell_time_analysis?.average_dwell_time?.toFixed(
                    1
                  ) || 0}
                  s
                </p>
                <p className="text-blue-200 text-sm">Per customer</p>
              </div>
            </div>

            {/* Top Actions (before Journey) */}
            {getCurrentAnalysisData() && (
                  <TopActions analysisData={getCurrentAnalysisData()!} />
                )}

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
                  data={getCurrentAnalysisData()?.heatmap_data}
                  heatmapImageUrl={getCurrentAnalysisData()?.download_links?.heatmap_image}
                  shelfMapImageUrl={getCurrentAnalysisData()?.download_links?.shelf_map_image}
                  isFiltered={excludedIds.length > 0}
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
                {(() => {
                  const currentData = getCurrentAnalysisData();
                  if (!currentData) return null;
                  return (
                    <DwellTimeChart
                      data={generateDwellTimeData(currentData)}
                      altData={(() => {
                        const load =
                          (currentData as any).shelf_dwell_load_seconds || {};
                        const asArr = Object.entries(load).map(
                          ([shelf, seconds]) => ({ shelf, time: seconds as number })
                        );
                        return asArr.sort((a, b) => b.time - a.time);
                      })()}
                    />
                  );
                })()}
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
                journeyData={getCurrentAnalysisData() ? generateJourneyData(getCurrentAnalysisData()!) : undefined}
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
              {getCurrentAnalysisData() && (
                  <BehaviorArchetypes analysisData={getCurrentAnalysisData()!} />
                )}
            </div>

            {/* AI Insights */}
            <div id="insights" className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-lg p-8 text-white">
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
              {getCurrentAnalysisData() && (
                <InsightRecommendations analysisData={getCurrentAnalysisData()!} />
              )}
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
                  <DurationSlider 
                  value={maxDuration} 
                  onChange={setMaxDuration} 
                  fileSize={uploadedFiles.length > 0 ? uploadedFiles[0].size : undefined} 
                />
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
