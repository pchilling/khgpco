import React, { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { LeftOutlined, RightOutlined, WarningOutlined } from '@ant-design/icons';
import '../styles/ImageSlider.css';

const ImageSlider = ({ images = [], fullWidth = false }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!images || images.length === 0) {
      setError('沒有可用的圖片');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadedImages([]);

    const imagePromises = images.map((src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(src);
        img.onerror = () => reject(new Error(`無法載入圖片: ${src}`));
      });
    });

    Promise.allSettled(imagePromises)
      .then((results) => {
        const successfulImages = results
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value);

        if (successfulImages.length === 0) {
          setError('所有圖片載入失敗');
        } else if (successfulImages.length < images.length) {
          message.warning(`部分圖片載入失敗 (${images.length - successfulImages.length}/${images.length})`);
        }

        setLoadedImages(successfulImages);
        setIsLoading(false);
      });
  }, [images]);

  const handlePrevClick = () => {
    if (loadedImages.length === 0) return;
    
    setCurrentImageIndex((prevIndex) => {
      if (prevIndex === 0) {
        return loadedImages.length - 1;
      } else {
        return prevIndex - 1;
      }
    });
  };

  const handleNextClick = () => {
    if (loadedImages.length === 0) return;
    
    setCurrentImageIndex((prevIndex) => {
      if (prevIndex === loadedImages.length - 1) {
        return 0;
      } else {
        return prevIndex + 1;
      }
    });
  };

  const handleDotClick = (index) => {
    setCurrentImageIndex(index);
  };

  if (error) {
    return (
      <div className="image-slider-loading">
        <WarningOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
        <div>{error}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="image-slider-loading">
        <Spin size="large" />
        <div>載入圖片中...</div>
      </div>
    );
  }

  if (loadedImages.length === 0) {
    return (
      <div className="image-slider-loading">
        <WarningOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
        <div>沒有可用的圖片</div>
      </div>
    );
  }

  return (
    <div className={fullWidth ? 'full-width' : 'image-slider'}>
      <img
        src={loadedImages[currentImageIndex]}
        alt={`圖片 ${currentImageIndex + 1}`}
        className={fullWidth ? 'full-width-image' : ''}
      />

      {loadedImages.length > 1 && (
        <>
          <button className="arrow left-arrow" onClick={handlePrevClick}>
            <LeftOutlined />
          </button>
          <button className="arrow right-arrow" onClick={handleNextClick}>
            <RightOutlined />
          </button>
          <div className="dots-container">
            {loadedImages.map((_, index) => (
              <div
                key={index}
                className={`dot ${currentImageIndex === index ? 'active' : ''}`}
                onClick={() => handleDotClick(index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageSlider; 
 
 
 