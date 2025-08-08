import { useEffect, useState } from 'react';
import FileUpload from './components/FileUpload';
import DurationSlider from './components/DurationSlider';
import Heatmap from './components/Heatmap';
import DwellTimeChart from './components/DwellTimeChart';
import CustomerJourney from './components/CustomerJourney';
import BehaviorArchetypes from './components/BehaviorArchetypes';
import InsightRecommendations from './components/InsightRecommendations';
import AnnotatedVideo from './components/AnnotatedVideo';
import { BarChart3, Loader2, CheckCircle, AlertCircle, Upload, Sparkles, Users } from 'lucide-react';
import axios from 'axios';

// API Configuration
const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || "http://70.153.8.238:8000";

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
    csv_report?: string;
    json_results?: string;
  };
}

enum AnalysisStep {
  UPLOAD = 'upload',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
  const [maxDuration, setMaxDuration] = useState(30);
  const [currentStep, setCurrentStep] = useState<AnalysisStep>(AnalysisStep.UPLOAD);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
  if (!uploadedFile) return;
  
  console.log('🚀 Starting analysis...');
  console.log('📄 File:', uploadedFile.name, `(${(uploadedFile.size / 1024 / 1024).toFixed(1)} MB)`);
  
  setCurrentStep(AnalysisStep.PROCESSING);
  setIsAnalyzing(true);
  setProgress(10);
  setError('');

  // Create FormData
  const formData = new FormData();
  formData.append('video', uploadedFile);
  formData.append('max_duration', maxDuration.toString());
  formData.append('save_to_blob', 'true');
  formData.append('generate_video', 'true');
  
  console.log('📋 Form data prepared:', {
    filename: uploadedFile.name,
    maxDuration,
    fileSize: uploadedFile.size
  });

  // Progress simulation with slower increment for large files
  const isLargeFile = uploadedFile.size > 5500000; // 5MB
  let progressInterval: ReturnType<typeof setInterval> | undefined = undefined;
  
  const startProgressSimulation = () => {
    progressInterval = setInterval(() => {
      setProgress(prev => {
        // Stop at 90% and wait for actual response
        if (prev >= 90) return prev;
        
        // Slower progress for large files
        const increment = isLargeFile ? 3 : 8;
        const newProgress = prev + Math.random() * increment;
        
        console.log('📊 Progress update:', Math.round(newProgress) + '%');
        return Math.min(newProgress, 90);
      });
    }, isLargeFile ? 3000 : 2000); // Slower updates for large files
  };

  startProgressSimulation();
  setProgress(30);

  try {
    console.log('📤 Sending request to:', `${FASTAPI_URL}/analyze`);
    console.log('⏱️ Timeout set to:', 900000, 'ms (15 minutes)');

    const response = await axios.post(`${FASTAPI_URL}/analyze`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 900000, // 15 minutes
      
      // Monitor upload progress
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const uploadPercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log('📤 Upload progress:', uploadPercent + '%');
          
          // Update progress bar for upload phase (0-30%)
          if (uploadPercent <= 100) {
            const adjustedProgress = Math.min(30 + (uploadPercent * 0.3), 60);
            setProgress(adjustedProgress);
          }
        }
      }
    });

    // Clear progress interval immediately when response received
    if (progressInterval) clearInterval(progressInterval);
    console.log('✅ Response received!');
    
    // Log response details
    console.log('📊 Response status:', response.status);
    console.log('📦 Response headers:', response.headers);
    
    if (response.data) {
      console.log('🔍 Response data keys:', Object.keys(response.data));
      console.log('📏 Response size:', JSON.stringify(response.data).length, 'bytes');
      
      // Check for required fields
      if (!response.data.metadata) {
        console.warn('⚠️ No metadata in response');
      }
      
      if (!response.data.unique_persons && response.data.unique_persons !== 0) {
        console.warn('⚠️ No unique_persons in response');
      }

      // Set progress to 100% before updating state
      setProgress(100);
      
      // Update state
      setAnalysisResult(response.data);
      setCurrentStep(AnalysisStep.COMPLETED);
      
      console.log('🎉 Analysis completed successfully!');
      console.log('👥 Unique persons:', response.data.unique_persons);
      console.log('🔄 Total interactions:', response.data.total_interactions);
      
    } else {
      throw new Error('No data received from analysis');
    }

  } catch (err: any) {
    if (progressInterval) clearInterval(progressInterval);
    console.error('❌ Analysis failed:', err);
    
    // Detailed error logging
    if (err.response) {
      console.error('📥 Response status:', err.response.status);
      console.error('📥 Response headers:', err.response.headers);
      console.error('📥 Response data:', err.response.data);
    } else if (err.request) {
      console.error('📤 Request details:', {
        readyState: err.request.readyState,
        status: err.request.status,
        statusText: err.request.statusText
      });
    } else {
      console.error('⚙️ Setup error:', err.message);
    }

    // Set appropriate error messages
    let errorMessage = 'Analysis failed';
    
    if (err.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout - file mungkin terlalu besar atau server sedang busy';
    } else if (err.response?.status === 413) {
      errorMessage = 'File terlalu besar - maksimal 50MB';
    } else if (err.response?.status === 500) {
      errorMessage = 'Server error - coba lagi dalam beberapa menit';
    } else if (err.response?.data?.detail) {
      errorMessage = err.response.data.detail;
    } else if (err.message) {
      errorMessage = err.message;
    }

    setCurrentStep(AnalysisStep.ERROR);
    setError(errorMessage);
    
  } finally {
    if (progressInterval) clearInterval(progressInterval);
    setIsAnalyzing(false);
    console.log('🏁 Analysis process finished');
  }
};

  const resetAnalysis = () => {
    setCurrentStep(AnalysisStep.UPLOAD);
    setAnalysisResult(null);
    setUploadedFile(null);
    setOriginalVideoUrl(null);
    setError('');
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

  const generateDwellTimeData = (result: AnalysisResult) => {
    // Gunakan data dwell time per rak yang sudah dihitung oleh backend
    const shelfDwellTimes = result.shelf_dwell_times || {};

    // Ubah format dari object ke array yang dibutuhkan oleh chart
    const dwellData = Object.entries(shelfDwellTimes).map(([shelfId, timeInSeconds]) => ({
      shelf: shelfId,
      time: timeInSeconds,
    }));
    
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-950 to-blue-800 rounded-2xl mb-4">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Retail Behavior Analysis</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upload video pelanggan di supermarket dan dapatkan insight AI yang mendalam untuk optimasi toko Anda
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Progress Steps */}
        {currentStep !== AnalysisStep.UPLOAD && (
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-8">
              {[
                { step: AnalysisStep.UPLOAD, label: 'Upload', icon: Upload },
                { step: AnalysisStep.PROCESSING, label: 'Processing', icon: Loader2 },
                { step: AnalysisStep.COMPLETED, label: 'Results', icon: CheckCircle },
              ].map(({ step, label, icon: Icon }, index) => {
                const isActive = currentStep === step;
                const isCompleted = Object.values(AnalysisStep).indexOf(currentStep) > Object.values(AnalysisStep).indexOf(step);
                const isError = currentStep === AnalysisStep.ERROR;
                
                return (
                  <div key={step} className="flex items-center">
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                      isCompleted ? 'bg-green-100 text-green-800' :
                      isActive ? 'bg-blue-100 text-blue-800' :
                      isError ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      <Icon className={`h-5 w-5 ${step === AnalysisStep.PROCESSING && isActive ? 'animate-spin' : ''}`} />
                      <span className="font-medium">{label}</span>
                    </div>
                    {index < 2 && (
                      <div className={`w-8 h-0.5 mx-2 ${
                        isCompleted ? 'bg-green-400' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

        {/* Upload Section */}
        {currentStep === AnalysisStep.UPLOAD && (
          <div className="space-y-8">
            {/* Desktop Layout: Upload and Duration side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upload Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-4">
                    <span className="text-2xl font-bold text-blue-600">1</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload Video</h2>
                  <p className="text-gray-600">Upload video rekaman pelanggan berbelanja di toko</p>
                </div>
                <FileUpload onFileUpload={setUploadedFile} uploadedFile={uploadedFile} />
              </div>

              {/* Duration Configuration */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-4">
                    <span className="text-2xl font-bold text-blue-600">2</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Atur Max Duration</h2>
                  <p className="text-gray-600">Tentukan durasi maksimal analisis video</p>
                </div>
                {/* // Di bagian Duration Configuration section, update line ini: */}
                <DurationSlider 
                  value={maxDuration} 
                  onChange={setMaxDuration}
                  fileSize={uploadedFile?.size} // Add this prop
                />
              </div>
            </div>

            {/* Analyze Button */}
            <div className="text-center">
              <button
                onClick={handleAnalyze}
                disabled={!uploadedFile || isAnalyzing}
                className={`inline-flex items-center px-12 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                  !uploadedFile || isAnalyzing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-6 w-6 mr-3" />
                    <span>Mulai Analisis</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Processing Section */}
        {currentStep === AnalysisStep.PROCESSING && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-950 to-blue-800 rounded-3xl mb-6">
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Analyzing Video...</h2>
            <p className="text-lg text-gray-600 mb-8">
              Sedang menganalisis perilaku pelanggan di video Anda
            </p>
            <div className="max-w-md mx-auto bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-600 to-blue-800 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% Complete</p>
          </div>
        )}

        {/* Results Section */}
        {currentStep === AnalysisStep.COMPLETED && analysisResult && (
          <div className="space-y-8">
            {/* Results Header */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">Hasil Analisis</h2>
              <p className="text-lg text-gray-600 mb-6">
                Analisis selesai untuk video berdurasi {maxDuration} detik
              </p>
              <button
                onClick={resetAnalysis}
                className="inline-flex items-center px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Analisis Baru
              </button>
            </div>

            {/* Side-by-side Videos (Desktop) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Original Video (Before) */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                  <h3 className="text-xl font-semibold text-gray-900">Original Video</h3>
                </div>
                {originalVideoUrl ? (
                  <video
                    controls
                    className="w-full h-auto rounded-xl"
                    preload="metadata"
                  >
                    <source src={originalVideoUrl} type="video/mp4" />
                  </video>
                ) : (
                  <div className="text-gray-500">No original video available</div>
                )}
              </div>

              {/* Annotated Video (After) */}
              {(analysisResult.download_links?.annotated_video_stream || analysisResult.download_links?.annotated_video_blob_path || analysisResult.download_links?.annotated_video_download) && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <h3 className="text-xl font-semibold text-gray-900">Annotated Video</h3>
                  </div>
                  {(() => {
                    const links = analysisResult.download_links || {};
                    const url = links.annotated_video_stream
                      ? `${FASTAPI_URL}${links.annotated_video_stream}`
                      : links.annotated_video_blob_path
                        ? `${FASTAPI_URL}/stream?blob=${encodeURIComponent(links.annotated_video_blob_path)}`
                        : undefined;
                    return (
                      <AnnotatedVideo
                        videoUrl={url}
                        downloadUrl={links.annotated_video_download}
                        analysisId={analysisResult.metadata?.analysis_id}
                      />
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Statistics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-950 to-blue-800 rounded-2xl p-6 text-white">
                <h4 className="text-lg font-semibold mb-2">Unique Persons</h4>
                <p className="text-3xl font-bold">{analysisResult.unique_persons}</p>
                <p className="text-blue-200 text-sm">Detected in video</p>
              </div>
              <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl p-6 text-white">
                <h4 className="text-lg font-semibold mb-2">Detected Actions</h4>
                <p className="text-3xl font-bold">{analysisResult.total_interactions}</p>
                <p className="text-blue-200 text-sm">Customer actions</p>
              </div>
              <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-2xl p-6 text-white">
                <h4 className="text-lg font-semibold mb-2">Avg Dwell Time</h4>
                <p className="text-3xl font-bold">{analysisResult.dwell_time_analysis?.average_dwell_time?.toFixed(1) || 0}s</p>
                <p className="text-blue-200 text-sm">Per customer</p>
              </div>
            </div>

            {/* Visualizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Heatmap */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <h3 className="text-xl font-semibold text-gray-900">Customer Traffic Heatmap</h3>
                </div>
                <Heatmap 
                  data={analysisResult.heatmap_data} 
                  heatmapImageUrl={analysisResult.download_links?.heatmap_image}
                />
              </div>

              {/* Dwell Time Chart */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <h3 className="text-xl font-semibold text-gray-900">Dwell Time per Area</h3>
                </div>
                <DwellTimeChart 
                  data={generateDwellTimeData(analysisResult)} 
                />
              </div>
            </div>

            {/* Customer Journey */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <CustomerJourney 
                journeyData={generateJourneyData(analysisResult)}
              />
            </div>

            {/* Behavior Archetypes */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center mb-6">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <h3 className="text-xl font-semibold text-gray-900">Behavioral Archetypes</h3>
              </div>
              <BehaviorArchetypes analysisData={analysisResult} />
            </div>

            {/* AI Insights */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-lg p-8 text-white">
              <div className="flex items-center mb-6">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                <h3 className="text-xl font-semibold">AI Insights & Rekomendasi</h3>
              </div>
              <InsightRecommendations analysisData={analysisResult} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;