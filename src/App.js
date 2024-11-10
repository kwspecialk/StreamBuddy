import React, { useState } from 'react';
import VideoFeed from './VideoFeed';
import Sidebar from './Sidebar';
import LayoutSelector from './LayoutSelector';
import { LAYOUTS } from './layouts';
import './App.css';

const App = () => {
  const [videoUrls, setVideoUrls] = useState([]);
  const [layout, setLayout] = useState('single');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [volume, setVolume] = useState(100);

  const handleReorderUrls = (newUrls) => {
    setVideoUrls(newUrls);
  };

  const addVideoUrl = (url) => {
    if (url && !videoUrls.includes(url)) {
      setVideoUrls([...videoUrls, url]);
    }
    document.querySelector("input").value = '';
  };

  const handleDeleteUrl = (urlToDelete) => {
    setVideoUrls(videoUrls.filter(url => url !== urlToDelete));
    if (videoUrls.indexOf(urlToDelete) === activeVideoId) {
      setActiveVideoId(null);
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
  };

  const handleVideoSelect = (videoId) => {
    setActiveVideoId(videoId === '' ? null : Number(videoId));
  };

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const urls = e.target.result.split('\n')
          .map(url => url.trim())
          .filter(Boolean);
        setVideoUrls(prevUrls => [...new Set([...prevUrls, ...urls])]);
      };
      reader.readAsText(file);
    }
  };

  const handleExportUrls = () => {
    const blob = new Blob([videoUrls.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'video_urls.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const getDisplayedVideos = () => {
    // If it's infinite grid, return all videos
    if (layout === 'grid-infinite') {
      return videoUrls;
    }

    // Get the maximum windows for current layout
    const maxWindows = LAYOUTS[layout]?.windows || videoUrls.length;
    
    // Return only the videos that should be displayed
    return videoUrls.slice(0, maxWindows);
  };

  return (
    <div className="app">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        videoUrls={videoUrls}
        onReorderUrls={handleReorderUrls}
        onDeleteUrl={handleDeleteUrl}
        activeVideoId={activeVideoId}
        onVolumeChange={handleVolumeChange}
        onVideoSelect={handleVideoSelect}
        volume={volume}
        onAddUrl={addVideoUrl}
        onExportUrls={handleExportUrls}
        onFileUpload={handleFileUpload}
      />

      <LayoutSelector
        onLayoutChange={handleLayoutChange}
        currentLayout={layout}
      />

      <div className={`video-grid ${layout}`}>
        {getDisplayedVideos().map((url, index) => (
          <div key={index} className="video-container">
            <div className="video-number">{index + 1}</div>
            <VideoFeed url={url} />
            {activeVideoId === index && (
              <div className="video-muted-indicator">
                Active Audio
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;