import React, { useEffect, useRef, useState, useCallback } from 'react';
import { throttler } from './utils/requestThrottler';

const VideoFeed = ({ 
  url, 
  isActive, 
  displayedVideos = [],
  onUpdateUrls,
  sourceIndices,
  onUpdateSourceIndices
}) => {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const [isError, setIsError] = useState(false);
  
  // Add error handling for sandbox detection
  useEffect(() => {
    const handleSandboxError = (event) => {
      if (event.data && event.data.type === 'sandboxError') {
        console.warn('Sandbox detection attempted');
      }
    };

    window.addEventListener('message', handleSandboxError);
    return () => window.removeEventListener('message', handleSandboxError);
  }, []);

  // Modify iframe loading strategy
  const loadIframe = useCallback((iframeElement, sourceUrl) => {
    if (!iframeElement || !sourceUrl) return;

    try {
      setIsError(false);
      iframeElement.src = sourceUrl;
      
      iframeElement.onerror = (error) => {
        console.warn('Iframe loading error:', error);
        setIsError(true);
        setTimeout(() => {
          const currentIframe = iframeRef.current;
          if (currentIframe) {
            currentIframe.src = sourceUrl;
            setIsError(false);
          }
        }, 2000);
      };
    } catch (error) {
      console.error('Error loading iframe:', error);
      setIsError(true);
    }
  }, []);

  // Visibility observer effect
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const iframe = iframeRef.current;
          if (!entry.isIntersecting && !isActive && iframe) {
            iframe.src = '';
          } else if (entry.isIntersecting && iframe) {
            loadIframe(iframe, url);
          }
        });
      },
      {
        root: null,
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [url, isActive, loadIframe]);

  // Initial load effect
  useEffect(() => {
    const iframe = iframeRef.current;
    if (url && iframe) {
      loadIframe(iframe, url);
    }
    
    return () => {
      if (iframe) {
        iframe.src = '';
      }
    };
  }, [url, loadIframe]);

  return (
    <div 
      ref={containerRef}
      className="video-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      <iframe
        ref={iframeRef}
        title="Video Player"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        // sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox"
        loading={isActive ? "eager" : "lazy"}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          pointerEvents: 'auto',
          transition: 'filter 0.3s ease'
        }}
      />
      {isError && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            textAlign: 'center'
          }}
        >
          <p>Stream temporarily unavailable. Attempting to reconnect...</p>
        </div>
      )}
    </div>
  );
};

if (!throttler.throttle) {
  throttler.throttle = (func, limit) => {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  };
}

export default VideoFeed;