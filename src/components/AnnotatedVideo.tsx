import React, { useState } from 'react';
import { Download, Play, AlertCircle, CheckCircle } from 'lucide-react';

interface AnnotatedVideoProps {
  videoUrl?: string;
  analysisId?: string;
  downloadUrl?: string;
}

const AnnotatedVideo: React.FC<AnnotatedVideoProps> = ({ videoUrl, analysisId, downloadUrl }) => {
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const handleDownload = () => {
    const url = downloadUrl || videoUrl;
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `annotated-video-${analysisId || 'analysis'}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!videoUrl) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 text-center">
        <AlertCircle className="h-12 w-12 text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-blue-600 mb-2">Video Sedang Diproses</h3>
        <p className="text-blue-500">
          Video beranotasi sedang dibuat. Coba refresh setelah beberapa saat.
        </p>
      </div>
    );
  }

  if (videoError) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Video</h3>
        <p className="text-red-500 mb-4">Failed to load annotated video</p>
        <button
          onClick={handleDownload}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          Try Download
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-6 w-6 text-green-500" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Video Beranotasi</h3>
            <p className="text-gray-600">Video dengan tracking dan behavior analysis</p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl hover:from-blue-700 hover:to-blue-900 transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </button>
      </div>

      <div className="relative bg-gray-900 rounded-2xl overflow-hidden">
        {!videoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto mb-2"></div>
              <p className="text-sm">Loading video...</p>
            </div>
          </div>
        )}
        
        <video
          controls
          className="w-full h-auto"
          onError={() => setVideoError(true)}
          onLoadedData={() => setVideoLoaded(true)}
          preload="metadata"
          crossOrigin="anonymous"
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {videoLoaded && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-lg text-sm">
            <Play className="h-4 w-4 inline mr-1" />
            Analysis ID: {analysisId || 'Unknown'}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnotatedVideo;
