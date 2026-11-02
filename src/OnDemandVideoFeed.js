import React from 'react';

const OnDemandVideoFeed = ({ url, isActive, onVideoSelect }) => (
  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <iframe
      src={url}
      title="Video Player"
      frameBorder="0"
      allowFullScreen
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        pointerEvents: isActive ? 'auto' : 'none'
      }}
    />
    {!isActive && (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          cursor: 'pointer',
          zIndex: 1
        }}
        onClick={() => onVideoSelect && onVideoSelect()}
      />
    )}
  </div>
);

export default OnDemandVideoFeed;
