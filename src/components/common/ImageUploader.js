import React, { useState } from 'react';
import '../../styles/components/ImageUploader.css';

const ImageUploader = ({
  images = [],
  onUpload,
  onRemove,
  multiple = true,
  maxSize = 5242880, // 5MB
  accept = "image/*"
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const validFiles = Array.from(files).filter(file => {
      if (file.size > maxSize) {
        alert(`檔案 ${file.name} 超過大小限制`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onUpload(validFiles);
    }
  };

  return (
    <div className="image-uploader">
      <div 
        className={`upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleChange}
          className="file-input"
        />
        <div className="upload-message">
          <span className="upload-icon">+</span>
          <p>拖曳或點擊上傳圖片</p>
          <p className="upload-hint">支援 jpg、png 格式，單檔最大 5MB</p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="image-preview-list">
          {images.map((image, index) => (
            <div key={index} className="image-preview-item">
              <img src={image.url || image} alt={`Preview ${index}`} />
              <button
                type="button"
                className="remove-image"
                onClick={() => onRemove(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader; 