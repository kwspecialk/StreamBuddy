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
  // Add state for tracking source indices and active matches
  const [sourceIndices, setSourceIndices] = useState({});

  const addVideoUrl = (url, match = null) => {
    if (url && !videoUrls.includes(url)) {
      setVideoUrls([...videoUrls, url]);
      if (match) {
        // Store the match data and initial source index
        setSourceIndices(prev => ({
          ...prev,
          [url]: { match, sourceIndex: 0 }
        }));
      }
    }
    document.querySelector("input[placeholder='Enter video URL']").value = '';
  };

  const handleDeleteUrl = (urlToDelete) => {
    setVideoUrls(videoUrls.filter(url => url !== urlToDelete));
    if (videoUrls.indexOf(urlToDelete) === activeVideoId) {
      setActiveVideoId(null);
    }
    // Clean up sourceIndices when a URL is deleted
    setSourceIndices(prev => {
      const newIndices = { ...prev };
      delete newIndices[urlToDelete];
      return newIndices;
    });
  };

  const handleVideoSelect = (videoId) => {
    setActiveVideoId(videoId === '' ? null : Number(videoId));
  };

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
  };

  const cycleSource = async (url, urlIndex) => {
    const urlData = sourceIndices[url];
    if (!urlData?.match?.sources) {
      console.warn('No source data available for URL:', url);
      return;
    }

    const nextIndex = (urlData.sourceIndex + 1) % urlData.match.sources.length;

    try {
      const source = urlData.match.sources[nextIndex];
      const response = await fetch(`https://streamed.su/api/stream/${source.source}/${source.id}`);
      const data = await response.json();

      if (data?.[0]?.embedUrl) {
        // Create new URLs array with replaced URL
        const newUrls = [...videoUrls];
        newUrls[urlIndex] = data[0].embedUrl;
        setVideoUrls(newUrls);

        // Update source index for new URL
        setSourceIndices(prev => ({
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
  };

  // Get only the videos that should be displayed based on layout
  const getDisplayedVideos = () => {
    if (layout === 'grid-infinite') {
      return videoUrls;
    }
    const maxWindows = LAYOUTS[layout]?.windows || 1;
    return videoUrls.slice(0, maxWindows);
  };

  const displayedVideos = getDisplayedVideos();

  const formatApiUrl = (url) => {
    try {
      if (url.includes('embedme.top')) {
        const match = url.match(/embedme\.top\/embed\/\w+\/(.+?)\/\d+$/);
        if (!match) return url;
        let title = match[1];
        title = title.replace(/^\d+-/, '');
        
        if (title.includes('-vs-') || title.includes('-v-')) {
          const parts = title.split(/-vs-|-v-/);
          if (parts.length === 2) {
            const team1 = parts[0].replace(/-/g, ' ').trim();
            const team2 = parts[1].replace(/-/g, ' ').trim();
            
            const capitalize = (str) => {
              return str.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            };
            
            return `${capitalize(team1)} vs ${capitalize(team2)}`;
          }
        }
        return title.replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      return url;
    } catch (error) {
      console.error('Error formatting URL:', error);
      return url;
    }
  };

  return (
    <div className="app">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        videoUrls={videoUrls}
        onReorderUrls={setVideoUrls}
        onDeleteUrl={handleDeleteUrl}
        activeVideoId={activeVideoId}
        onVideoSelect={handleVideoSelect}
        onAddUrl={addVideoUrl}
        sourceIndices={sourceIndices}
        onCycleSource={cycleSource}
        formatApiUrl={formatApiUrl}
      />

      <LayoutSelector
        onLayoutChange={handleLayoutChange}
        currentLayout={layout}
      />

      <div className={`video-grid ${layout}`}>
        {displayedVideos.map((url, index) => (
          <div key={index} className="video-container">
            <div className="video-number">{index + 1}</div>
            <iframe
              src={url}
              title={`Video ${index + 1}`}
              allowFullScreen
              allow="autoplay"
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
            />
            {/* Add live badge if URL has sources */}
            {sourceIndices[url] && (
              <div className="live-badge">LIVE</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;