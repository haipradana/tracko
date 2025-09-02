import React, { useState } from 'react';
import { Download, AlertCircle } from 'lucide-react';

interface AnnotatedVideoProps {
  videoUrl?: string;
  analysisId?: string;
  downloadUrl?: string;
  originalUrl?: string;
}

const AnnotatedVideo: React.FC<AnnotatedVideoProps> = ({ videoUrl, analysisId, downloadUrl, originalUrl }) => {
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
      <div
        className="rounded-2xl p-6 text-center"
        style={{ border: '1px solid #e6dfd2', background: 'rgba(255,255,255,0.60)' }}
      >
        <AlertCircle className="h-10 w-10 text-blue-700 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-900 mb-1">Video Sedang Diproses</h3>
        <p className="text-gray-700">Video beranotasi sedang dibuat. Coba refresh setelah beberapa saat.</p>
      </div>
    );
  }

  if (videoError) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ border: '1px solid #e6dfd2', background: 'rgba(255,255,255,0.60)' }}
      >
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-900 mb-1">Gagal Memuat Video</h3>
        <p className="text-gray-700 mb-4">Terjadi kesalahan saat memuat video beranotasi</p>
        <button
          onClick={handleDownload}
          className="inline-flex items-center px-4 py-2 rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg,#1f49a6,#0a193a)' }}
        >
          <Download className="h-4 w-4 mr-2" />
          Coba Download
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/*
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-6 w-6 text-green-500" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Video Beranotasi</h3>
            <p className="text-gray-600">Video dengan tracking dan behavior analysis</p>
          </div>
        </div>
      </div>
      */}

      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ borderRadius: 14, padding: '1px', background: 'rgba(255,255,255,.60)' }}
      >
        {!videoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.75)' }}>
            <div className="text-center">
              <div
                className="animate-spin rounded-full h-8 w-8 mx-auto mb-1 flex items-center justify-center bg-white shadow-md"
                style={{ border: '2px solid #1f49a6', borderTop: '2px solid transparent' }}
              ></div>
              <p className="text-sm text-gray-800">Loading video...</p>
            </div>
          </div>
        )}

        <video
          controls
          className="w-full h-auto rounded-xl"
          style={{ border: '1px solid #e6dfd2', background: '#000' }}
          onError={() => setVideoError(true)}
          onLoadedData={() => setVideoLoaded(true)}
          preload="metadata"
          crossOrigin="anonymous"
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-center">
        <button
          onClick={handleDownload}
          className="inline-flex items-center px-4 py-2 rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg,#1f49a6,#0a193a)', boxShadow: '0 9px 15px 0 rgba(10,25,58,0.20)' }}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </button>
        {originalUrl && (
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 rounded-xl text-gray-900 font-semibold"
            style={{ background: '#fff', border: '1px solid #e6dfd2', boxShadow: '0 8px 20px 0 rgba(10,25,58,0.12)' }}
          >
            Lihat Video Asli
          </a>
        )}
      </div>
    </div>
  );
};

export default AnnotatedVideo;
