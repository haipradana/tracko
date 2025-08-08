import React, { useCallback } from 'react';
import { Upload, FileVideo, X, Image } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File | null) => void;
  uploadedFile: File | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, uploadedFile }) => {
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

  if (uploadedFile) {
    return (
      <div className="bg-gradient-to-r from-blue-950 to-blue-800 border-2 border-blue-700 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-700 to-blue-600 rounded-xl flex items-center justify-center">
              {uploadedFile.type.startsWith('video/') ? (
                <FileVideo className="h-6 w-6 text-white" />
              ) : (
                <Image className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <p className="font-semibold text-white text-lg">{uploadedFile.name}</p>
              <p className="text-sm text-blue-200">{formatFileSize(uploadedFile.size)}</p>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="flex-shrink-0 w-10 h-10 bg-red-500/20 hover:bg-red-500/30 rounded-xl flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-red-300" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-300 cursor-pointer group"
    >
      <div className="space-y-6">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-950 to-blue-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Upload className="h-10 w-10 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload file video atau gambar</h3>
          <p className="text-gray-600">Drag and drop file di sini, atau klik untuk browse</p>
        </div>
        <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <FileVideo className="h-4 w-4" />
            <span>MP4, AVI, MOV</span>
          </div>
          <div className="flex items-center space-x-2">
            <Image className="h-4 w-4" />
            <span>JPG, PNG</span>
          </div>
          <div>Max 100MB</div>
        </div>
        <input
          type="file"
          accept="video/*,image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-950 to-blue-800 text-white rounded-xl hover:from-blue-900 hover:to-blue-700 font-medium cursor-pointer transition-all shadow-sm"
        >
          Browse Files
        </label>
      </div>
    </div>
  );
};

export default FileUpload;