import React from 'react';

// React sets src once per URL. Setting it again reloads the player, so keep it declarative.
const VideoFeed = ({ url }) => (
  <div
    className="video-container"
    style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden'
    }}
  >
    <iframe
      src={url}
      title="Video Player"
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        pointerEvents: 'auto',
        transition: 'filter 0.3s ease'
      }}
    />
  </div>
);

export default VideoFeed;