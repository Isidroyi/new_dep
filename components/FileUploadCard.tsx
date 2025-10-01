
import React, { useMemo, useRef } from 'react';
import { UploadIcon, FileIcon } from './icons';

interface FileUploadCardProps {
  title: string;
  description: string;
  id: string;
  accept?: string;
  file?: File | null;
  files?: File[];
  multiple?: boolean;
  onFileSelect?: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
}

const FileUploadCard: React.FC<FileUploadCardProps> = ({
  title,
  description,
  file = null,
  files = [],
  onFileSelect,
  onFilesSelect,
  id,
  accept,
  multiple = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files ? Array.from(event.target.files) : [];
    if (multiple) {
      onFilesSelect?.(fileList);
    } else if (fileList[0]) {
      onFileSelect?.(fileList[0]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const fileNames = useMemo(() => {
    if (!multiple) {
      return file ? [file.name] : [];
    }
    return files.map((item) => item.name);
  }, [file, files, multiple]);

  return (
    <div 
      className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-sky-500 transition-colors duration-300 flex flex-col items-center justify-center h-full"
      onClick={handleClick}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        id={id}
        accept={accept || 'application/pdf,image/png,image/jpeg,image/webp'}
        multiple={multiple}
      />
      {fileNames.length > 0 ? (
        <div className="flex flex-col items-center space-y-3 w-full">
          <FileIcon className="w-12 h-12 text-sky-400" />
          <p className="text-slate-300 font-semibold">{title}</p>
          <div className="max-h-40 w-full overflow-y-auto bg-slate-900/40 border border-slate-700 rounded-md p-3 text-left">
            <ul className="space-y-1 text-sm text-slate-300">
              {fileNames.map((name, index) => (
                <li key={`${name}-${index}`} className="truncate" title={name}>
                  {name}
                </li>
              ))}
            </ul>
            {multiple && fileNames.length > 1 && (
              <p className="mt-2 text-xs text-slate-500 text-right">Всего файлов: {fileNames.length}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-2">
          <UploadIcon className="w-12 h-12 text-slate-500" />
          <p className="text-slate-300 font-semibold">{title}</p>
          <p className="text-slate-400 text-sm text-center">{description}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploadCard;
