import React from 'react';

const VideoFeed = ({ url }) => {
  return (
    <iframe
      src={url}
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
  );
};

export default VideoFeed;