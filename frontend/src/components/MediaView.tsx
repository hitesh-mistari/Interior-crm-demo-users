import { useState, useRef } from 'react';
import { Upload, Trash2, X, FileText, Image as ImageIcon, File } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatLongDate } from '../utils/dates';
import { MediaFile } from '../types';

export default function MediaView() {
  const { currentUser } = useApp();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewingFile, setViewingFile] = useState<MediaFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === 'admin';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newMediaFile: MediaFile = {
          id: crypto.randomUUID(),
          file_name: file.name,
          file_type: file.type,
          file_url: event.target?.result as string,
          file_size: file.size,
          uploaded_by: currentUser?.id || '',
          uploaded_at: new Date().toISOString(),
          deleted: false,
        };
        setMediaFiles((prev) => [newMediaFile, ...prev]);
      };
      reader.readAsDataURL(file);
    });

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectFile = (id: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleBulkDelete = () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`Delete ${selectedFiles.size} selected file(s)?`)) return;

    setMediaFiles((prev) =>
      prev.filter((file) => !selectedFiles.has(file.id))
    );
    setSelectedFiles(new Set());
  };

  const handleDeleteSingle = (id: string) => {
    if (!confirm('Delete this file?')) return;
    setMediaFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-blue-500" />;
    }
    if (fileType === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    return <File className="w-8 h-8 text-slate-500" />;
  };

  const filteredFiles = mediaFiles.filter((file) => !file.deleted);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Media Library</h2>
          <p className="text-slate-600 mt-1">
            {filteredFiles.length} file(s) • Upload and manage your media
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {selectedFiles.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedFiles.size})
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Upload Files'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}
      </div>

      {filteredFiles.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
          <Upload className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No files uploaded yet.</p>
          {isAdmin && (
            <p className="text-slate-400 text-sm mt-2">
              Click "Upload Files" to add media
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className={`bg-white rounded-lg shadow-sm border-2 transition-all cursor-pointer ${
                selectedFiles.has(file.id)
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                onClick={() => setViewingFile(file)}
                className="p-4 flex flex-col items-center"
              >
                {file.file_type.startsWith('image/') ? (
                  <img
                    src={file.file_url}
                    alt={file.file_name}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center bg-slate-50 rounded mb-2">
                    {getFileIcon(file.file_type)}
                  </div>
                )}
                <p className="text-sm font-medium text-slate-800 truncate w-full text-center">
                  {file.file_name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatFileSize(file.file_size)}
                </p>
              </div>
              {isAdmin && (
                <div className="flex border-t border-slate-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectFile(file.id);
                    }}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      selectedFiles.has(file.id)
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {selectedFiles.has(file.id) ? 'Selected' : 'Select'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSingle(file.id);
                    }}
                    className="flex-1 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors border-l border-slate-200"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {viewingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {viewingFile.file_name}
                </h3>
                <p className="text-sm text-slate-600">
                  {formatFileSize(viewingFile.file_size)} • Uploaded{' '}
                  {formatLongDate(viewingFile.uploaded_at)}
                </p>
              </div>
              <button
                onClick={() => setViewingFile(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-6">
              {viewingFile.file_type.startsWith('image/') ? (
                <img
                  src={viewingFile.file_url}
                  alt={viewingFile.file_name}
                  className="w-full h-auto rounded"
                />
              ) : viewingFile.file_type === 'application/pdf' ? (
                <iframe
                  src={viewingFile.file_url}
                  className="w-full h-[600px] rounded"
                  title={viewingFile.file_name}
                />
              ) : (
                <div className="text-center py-12">
                  <File className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">
                    Preview not available for this file type
                  </p>
                  <a
                    href={viewingFile.file_url}
                    download={viewingFile.file_name}
                    className="inline-block mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
