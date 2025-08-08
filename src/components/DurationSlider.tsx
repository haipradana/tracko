import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface DurationSliderProps {
  value: number;
  onChange: (value: number) => void;
  fileSize?: number;
}

const DurationSlider: React.FC<DurationSliderProps> = ({ value, onChange, fileSize }) => {
  const isLargeFile = fileSize && fileSize > 5000000; // 5MB
  const fileSizeMB = fileSize ? (fileSize / 1024 / 1024).toFixed(1) : '0';
  
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-950 to-blue-800 px-6 py-3 rounded-2xl border border-blue-700">
          <Clock className="h-6 w-6 text-white" />
          <span className="text-2xl font-bold text-white">{value}</span>
          <span className="text-lg text-blue-200">detik</span>
        </div>
      </div>
      
      <div className="relative px-4">
        <input
          type="range"
          min="10"
          max="300"
          step="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-sm text-gray-500 mt-4 px-2">
          <span className="font-medium">10s</span>
          <span className="font-medium">60s</span>
          <span className="font-medium">120s</span>
          <span className="font-medium">180s</span>
          <span className="font-medium">300s</span>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-950 to-blue-800 border border-blue-700 rounded-2xl p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
            <span className="text-white text-xs font-bold">💡</span>
          </div>
          <div>
            <p className="font-medium text-white mb-1">Tips Analisis</p>
            <p className="text-sm text-blue-200">
              Durasi yang lebih panjang memberikan analisis yang lebih komprehensif, 
              namun membutuhkan waktu pemrosesan yang lebih lama.
            </p>
          </div>
        </div>
      </div>

      {/* File size info */}
      {fileSize && (
        <div className={`border rounded-2xl p-4 ${
          isLargeFile 
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200' 
            : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
        }`}>
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
              isLargeFile ? 'bg-amber-500' : 'bg-green-500'
            }`}>
              {isLargeFile ? (
                <AlertTriangle className="h-3 w-3 text-white" />
              ) : (
                <span className="text-white text-xs font-bold">✓</span>
              )}
            </div>
            <div>
              <p className={`font-medium mb-1 ${
                isLargeFile ? 'text-amber-800' : 'text-green-800'
              }`}>
                File Size: {fileSizeMB} MB
              </p>
              <p className={`text-sm ${
                isLargeFile ? 'text-amber-700' : 'text-green-700'
              }`}>
                {isLargeFile 
                  ? `File besar terdeteksi. Estimasi waktu pemrosesan: 5-10 menit.`
                  : `Ukuran file optimal. Estimasi waktu pemrosesan: 2-5 menit.`
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DurationSlider;