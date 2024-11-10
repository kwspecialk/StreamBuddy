import React, { useEffect } from 'react';

const VideoFeed = ({ url }) => {
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
      
        const iframe = document.querySelector('iframe');
        iframe.addEventListener('load', () => {
          iframe.contentWindow.postMessage({
            type: 'unmute',
          }, '*');
        });
      
        return () => {
          window.removeEventListener('message', handleMessage);
        };
      }, []);

  return (
    <div className="video-container">
      <iframe
        src={url}
        title="Video"
        allowFullScreen
        allow="autoplay"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          pointerEvents: 'auto',
          overflow: 'hidden'
        }}
      />
    </div>
  );
};

export default VideoFeed;