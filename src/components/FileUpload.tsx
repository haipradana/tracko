import React, { useCallback } from 'react';
import { Upload, FileVideo, X, Image, Plus } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (files: File[] | null) => void;
  uploadedFiles: File[];
  compact?: boolean;
  multiple?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, uploadedFiles, compact = false, multiple = false }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      const videoFiles = files.filter(file => file.type.startsWith('video/') || file.type.startsWith('image/'));
      
      if (videoFiles.length > 0) {
        if (multiple) {
          onFileUpload([...uploadedFiles, ...videoFiles]);
        } else {
          onFileUpload([videoFiles[0]]);
        }
      }
    },
    [onFileUpload, multiple, uploadedFiles]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const videoFiles = fileArray.filter(file => file.type.startsWith('video/') || file.type.startsWith('image/'));
      
      if (multiple) {
        onFileUpload([...uploadedFiles, ...videoFiles]);
      } else {
        onFileUpload([videoFiles[0]]);
      }
    }
  };

  const removeFile = (index?: number) => {
    if (index !== undefined) {
      const newFiles = uploadedFiles.filter((_, i) => i !== index);
      onFileUpload(newFiles.length > 0 ? newFiles : null);
    } else {
      onFileUpload(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (uploadedFiles.length > 0 && !compact) {
    return (
      <div className="space-y-3">
        {uploadedFiles.map((file, index) => (
          <div key={index} className="rounded-2xl p-4" style={{ border:'1px solid #e6dfd2', background:'rgba(255,255,255,0.60)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#1f49a6,#0a193a)' }}>
                  {file.type.startsWith('video/') ? (
                    <FileVideo className="h-5 w-5 text-white" />
                  ) : (
                    <Image className="h-5 w-5 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button onClick={() => removeFile(index)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'rgba(239,68,68,.12)' }}>
                <X className="h-5 w-5 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {multiple && (
          <div onDrop={handleDrop} onDragOver={(e)=>e.preventDefault()} className="cursor-pointer">
            <div className="rounded-2xl p-4 text-center" style={{ border:'1px dashed #d7d1c6', background:'rgba(255,255,255,.60)' }}>
              <div className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#1f49a6,#0a193a)' }}>
                <Plus className="h-6 w-6 text-white" />
              </div>
              <p className="text-gray-600 mt-2 mb-3">Tambah video lainnya</p>
              <input type="file" accept="video/*,image/*" onChange={handleFileSelect} className="hidden" id="add-more-files" multiple={multiple} />
              <label htmlFor="add-more-files" className="inline-flex items-center px-4 py-2 rounded-xl text-white" style={{ background:'linear-gradient(135deg,#1f49a6,#0a193a)' }}>Browse Files</label>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div onDrop={handleDrop} onDragOver={(e)=>e.preventDefault()} className="cursor-pointer">
        <input type="file" accept="video/*,image/*" onChange={handleFileSelect} className="hidden" id="file-upload" multiple={multiple} />
        <label htmlFor="file-upload" className="inline-flex items-center px-4 py-2 rounded-xl text-white" style={{ background:'linear-gradient(135deg,#1f49a6,#0a193a)' }}>
          {multiple ? 'Upload CCTV Tokomu' : 'Upload CCTV Tokomu'}
        </label>
        {uploadedFiles.length > 0 && (
          <span className="ml-3 text-gray-700">
            {uploadedFiles.length === 1 
              ? `${uploadedFiles[0].name} · ${formatFileSize(uploadedFiles[0].size)}`
              : `${uploadedFiles.length} video dipilih`
            }
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
        <strong className="block mt-3 mb-1 text-gray-900">
          {multiple ? 'Drag & drop multiple files di sini' : 'Drag & drop file di sini'}
        </strong>
        <p className="text-gray-600 mb-4">atau klik tombol di bawah</p>
        <input type="file" accept="video/*,image/*" onChange={handleFileSelect} className="hidden" id="file-upload" multiple={multiple} />
        <label htmlFor="file-upload" className="inline-flex items-center px-6 py-3 rounded-xl text-white" style={{ background:'linear-gradient(135deg,#1f49a6,#0a193a)' }}>
          {multiple ? 'Browse Multiple Files' : 'Browse Files'}
        </label>
      </div>
    </div>
  );
};

export default FileUpload;