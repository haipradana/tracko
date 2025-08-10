import React, { useCallback } from 'react';
import { Upload, FileVideo, X, Image } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File | null) => void;
  uploadedFile: File | null;
  compact?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, uploadedFile, compact = false }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
          onFileUpload(file);
        }
      }
    },
    [onFileUpload]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  const removeFile = () => {
    onFileUpload(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (uploadedFile && !compact) {
    return (
      <div className="rounded-2xl p-4" style={{ border:'1px solid #e6dfd2', background:'rgba(255,255,255,0.60)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#1f49a6,#0a193a)' }}>
              {uploadedFile.type.startsWith('video/') ? (
                <FileVideo className="h-5 w-5 text-white" />
              ) : (
                <Image className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{uploadedFile.name}</p>
              <p className="text-sm text-gray-600">{formatFileSize(uploadedFile.size)}</p>
            </div>
          </div>
          <button onClick={removeFile} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'rgba(239,68,68,.12)' }}>
            <X className="h-5 w-5 text-red-500" />
          </button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div onDrop={handleDrop} onDragOver={(e)=>e.preventDefault()} className="cursor-pointer">
        <input type="file" accept="video/*,image/*" onChange={handleFileSelect} className="hidden" id="file-upload" />
        <label htmlFor="file-upload" className="inline-flex items-center px-4 py-2 rounded-xl text-white" style={{ background:'linear-gradient(135deg,#1f49a6,#0a193a)' }}>Browse Files</label>
        {uploadedFile && (
          <span className="ml-3 text-gray-700">
            {uploadedFile.name} · {formatFileSize(uploadedFile.size)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div onDrop={handleDrop} onDragOver={(e)=>e.preventDefault()} className="cursor-pointer">
      <div className="rounded-2xl p-6 text-center" style={{ border:'1px dashed #d7d1c6', background:'rgba(255,255,255,.60)' }}>
        <div className="mx-auto w-16 h-16 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#1f49a6,#0a193a)' }}>
          <Upload className="h-8 w-8 text-white" />
        </div>
        <strong className="block mt-3 mb-1 text-gray-900">Drag & drop file di sini</strong>
        <p className="text-gray-600 mb-4">atau klik tombol di bawah</p>
        <input type="file" accept="video/*,image/*" onChange={handleFileSelect} className="hidden" id="file-upload" />
        <label htmlFor="file-upload" className="inline-flex items-center px-6 py-3 rounded-xl text-white" style={{ background:'linear-gradient(135deg,#1f49a6,#0a193a)' }}>Browse Files</label>
      </div>
    </div>
  );
};

export default FileUpload;