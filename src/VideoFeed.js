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
  const [visibleStreams, setVisibleStreams] = useState(new Set());
  const [isError, setIsError] = useState(false);
  const maxConcurrentStreams = 4;
  
  const playbackConfig = {
    hlsPlayback: {
      enableWorker: true,
      autoStartLoad: true,
      startPosition: -1,
      debug: false,
      maxBufferLength: 30,
      maxMaxBufferLength: 600,
      maxBufferSize: 60 * 1000 * 1000,
    }
  };

  // Move isElementInViewport outside component or memoize with no dependencies
  const isElementInViewport = useCallback((el) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }, []); 

  // Store displayedVideos length in ref to avoid dependency cycles
  const displayedVideosLengthRef = useRef(displayedVideos.length);
  useEffect(() => {
    displayedVideosLengthRef.current = displayedVideos.length;
  }, [displayedVideos.length]);

  // Memoize stream management function with minimal dependencies
  const manageStreamResources = useCallback(() => {
    const activeStreams = new Set();
    const length = displayedVideosLengthRef.current;

    for (let index = 0; index < length; index++) {
      if (activeStreams.size >= maxConcurrentStreams) break;
      
      const element = document.querySelector(`.video-container:nth-child(${index + 1})`);
      if (element && isElementInViewport(element)) {
        activeStreams.add(index);
      }
    }

    setVisibleStreams(prev => {
      const hasChanges = [...prev].some(id => !activeStreams.has(id)) || 
                        [...activeStreams].some(id => !prev.has(id));
      return hasChanges ? activeStreams : prev;
    });
  }, [isElementInViewport]);

  const fetchStreamData = useCallback(async (streamUrl) => {
    try {
      const response = await throttler.throttledFetch(streamUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn('Stream fetch error:', error);
      return null;
    }
  }, []);

  const cycleSource = useCallback(async (url, urlIndex) => {
    const urlData = sourceIndices[url];
    if (!urlData?.match?.sources) {
      console.warn('No source data available for URL:', url);
      return;
    }

    const nextIndex = (urlData.sourceIndex + 1) % urlData.match.sources.length;
    const source = urlData.match.sources[nextIndex];

    try {
      const data = await fetchStreamData(`https://streamed.su/api/stream/${source.source}/${source.id}`);
      
      if (data?.[0]?.embedUrl) {
        onUpdateUrls(prev => {
          const newUrls = [...prev];
          newUrls[urlIndex] = data[0].embedUrl;
          return newUrls;
        });

        onUpdateSourceIndices(prev => ({
          ...prev,
          [data[0].embedUrl]: {
            match: urlData.match,
            sourceIndex: nextIndex
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching alternate stream:', error);
    }
  }, [sourceIndices, fetchStreamData, onUpdateUrls, onUpdateSourceIndices]);

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
          if (iframeRef.current) {
            iframeRef.current.src = sourceUrl;
            setIsError(false);
          }
        }, 2000);
      };
    } catch (error) {
      console.error('Error loading iframe:', error);
      setIsError(true);
    }
  }, []);

  // Stream management effect
  useEffect(() => {
    const throttledManage = throttler.throttle(manageStreamResources, 200);
    throttledManage();

    window.addEventListener('scroll', throttledManage);
    window.addEventListener('resize', throttledManage);

    return () => {
      window.removeEventListener('scroll', throttledManage);
      window.removeEventListener('resize', throttledManage);
    };
  }, [manageStreamResources]);

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
    if (url && iframeRef.current) {
      loadIframe(iframeRef.current, url);
    }
    
    return () => {
      const iframe = iframeRef.current;
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