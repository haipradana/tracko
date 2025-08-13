import React from 'react';
import { Clock } from 'lucide-react';

interface DurationSliderProps {
  value: number;
  onChange: (value: number) => void;
  fileSize?: number;
}

const DurationSlider: React.FC<DurationSliderProps> = ({ value, onChange, fileSize }) => {
  const isLargeFile = fileSize && fileSize > 7000000; // 7MB
  const fileSizeMB = fileSize ? (fileSize / 1024 / 1024).toFixed(1) : '0';
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min="10"
          max="300"
          step="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 h-3 rounded-full appearance-none cursor-pointer"
          style={{ background:'#e7dfd2' }}
        />
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-gray-900 font-semibold shadow-md"
            style={{
              border: '1px solid #e6dfd2',
              boxShadow: '0 1px 10px 0 rgba(10,25,58,0.32)',
            }}>
            <Clock className="h-4 w-4" />
            <b>{value}</b>
            <span className="opacity-80">detik</span>
          </span>
        </div>
      {fileSize && (
        <div className="text-sm text-gray-600">
          File Size: {fileSizeMB} MB · {isLargeFile ? 'Estimasi 5-10 menit' : 'Estimasi 2-5 menit'}
        </div>
      )}
    </div>
  );
};

export default DurationSlider;