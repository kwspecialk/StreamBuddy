import React, { useEffect, useMemo } from 'react';

const VideoFeed = ({ url }) => {
  const proxyUrl = useMemo(() => {
    try {
      const originalUrl = new URL(url);
      
      // Replace the domain with our proxy
      if (originalUrl.hostname === 'embedme.top') {
        return `/embed-proxy${originalUrl.pathname}${originalUrl.search}`;
      }
      
      if (originalUrl.hostname === 'rr.vipstreams.in') {
        return `/stream-proxy${originalUrl.pathname}${originalUrl.search}`;
      }
      
      // For other domains, use the generic proxy
      return `/proxy/${originalUrl.hostname}${originalUrl.pathname}${originalUrl.search}`;
    } catch (e) {
      console.error('Error processing URL:', e);
      return url;
    }
  }, [url]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'volume_update') {
        const video = document.querySelector('video');
        if (video) {
          video.volume = event.data.volume / 100;
          video.muted = event.data.muted;
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div className="video-container">
      <iframe
        src={proxyUrl}
        title="Video"
        allowFullScreen
        allow="autoplay"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          pointerEvents: 'auto',
          scrolling: 'no',
          overflow: 'hidden'
        }}
      />
    </div>
  );
};

export default VideoFeed;