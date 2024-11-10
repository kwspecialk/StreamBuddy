import React, { useState, useEffect } from 'react';
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

  // In App.js, modify the useEffect hook
useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'volume_update') {
        console.log('Volume updated in iframe:', event.data);
      }
    };
  
    // Add this function to handle iframe loads
    const handleIframeLoad = () => {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe, index) => {
        try {
          // Unmute on load but set volume based on active video
          iframe.contentWindow.postMessage({
            volume: index === activeVideoId ? volume : 0,
            muted: index !== activeVideoId
          }, '*');
        } catch (error) {
          console.error('Error controlling iframe volume:', error);
        }
      });
    };
  
    // Add load event listeners to iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      iframe.addEventListener('load', handleIframeLoad);
    });
  
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      iframes.forEach(iframe => {
        iframe.removeEventListener('load', handleIframeLoad);
      });
    };
  }, [activeVideoId, volume]);

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
  
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      iframe.contentWindow.postMessage({
        type: 'volume_update',
        volume: newVolume,
        muted: newVolume === 0,
      }, '*');
    });
  };

  const handleVideoSelect = (videoId) => {
    setActiveVideoId(videoId);
  
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe, index) => {
      iframe.contentWindow.postMessage({
        type: 'volume_update',
        volume: index === videoId ? volume : 0,
        muted: index !== videoId,
      }, '*');
    });
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
    
    // Return only the URLs, not the JSX
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