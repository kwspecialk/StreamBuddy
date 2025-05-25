import React, { useState, useCallback } from 'react';

const CachedImage = ({
  src,
  alt,
  className = '',
  fallbackElement = null,
  onLoad = () => {},
  onError = () => {},
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
    onLoad();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setImageError(true);
    onError();
  }, [onError]);

  // If image failed and we have a fallback element, show it
  if (imageError && fallbackElement) {
    return fallbackElement;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} ${imageLoaded ? 'loaded' : ''}`}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
};

export default CachedImage;