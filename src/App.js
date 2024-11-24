import React, { useState, useEffect } from 'react';
import VideoFeed from './VideoFeed';
import Sidebar from './Sidebar';
import LayoutSelector from './LayoutSelector';
import { LAYOUTS } from './layouts';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import OnDemandBrowser from './components/OnDemandBrowser';
import MovieDetailsModal from './components/MovieDetailsModal';
import EpisodeSelector from './components/EpisodeSelector.js';
import OnDemandVideoFeed from './OnDemandVideoFeed';

const App = () => {
  const [videoUrls, setVideoUrls] = useState(() => {
    // Try to load saved URLs from localStorage on initial render
  const savedUrls = localStorage.getItem('savedVideoUrls');
  return savedUrls ? JSON.parse(savedUrls) : [];
});
const [layout, setLayout] = useState(() => {
  const savedLayout = localStorage.getItem('savedLayout');
  return savedLayout || 'single';
});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [sourceIndices, setSourceIndices] = useState({});
  const [streamRetries, setStreamRetries] = useState({});
  const [showEpisodeSelector, setShowEpisodeSelector] = useState(false);
  const [selectedShow, setSelectedShow] = useState(null);

  

  const handleStreamRecovery = (index) => {
    setStreamRetries(prev => {
      const currentRetries = prev[index] || 0;
      if (currentRetries < 3) {  // Limit retries
        const newUrls = [...videoUrls];
        const currentUrl = newUrls[index];
        // Force stream refresh
        newUrls[index] = '';
        setVideoUrls(newUrls);
        setTimeout(() => {
          newUrls[index] = currentUrl;
          setVideoUrls(newUrls);
        }, 1000);
        return { ...prev, [index]: currentRetries + 1 };
      }
      return prev;
    });
  };

  const handleReorderUrls = (newUrls) => {
    setVideoUrls(prevUrls => {
      const reorderedUrls = newUrls.map(url => prevUrls[prevUrls.indexOf(url)]);
      return reorderedUrls;
    });
  };

  const addVideoUrl = (url, matchInfo = null) => {
    if (url && !videoUrls.includes(url)) {
      setVideoUrls(prev => [...prev, url]);
      if (matchInfo) {
        setSourceIndices(prev => ({
          ...prev,
          [url]: { 
            match: matchInfo,
            sourceIndex: 0 
          }
        }));
      }
    }
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

  const cycleSource = async (url, urlIndex, newSourceIndices) => {
    if (newSourceIndices) {
      setSourceIndices(newSourceIndices);
    }
  };
  const clearSavedState = () => {
    localStorage.removeItem('savedVideoUrls');
    localStorage.removeItem('savedLayout');
    setVideoUrls([]);
    setLayout('single');
    setActiveVideoId(null);
    setSourceIndices({});
    setStreamRetries({});
    setMovieDetails(null);
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

useEffect(() => {
  // Cleanup function to run when component unmounts
  return () => {
    // Force garbage collection of video elements
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        if (iframe.contentWindow) {
          iframe.src = '';
        }
      } catch (e) {
        console.warn('Cleanup failed:', e);
      }
    });
  };
}, []);

useEffect(() => {
  // Save URLs to localStorage whenever they change
  localStorage.setItem('savedVideoUrls', JSON.stringify(videoUrls));
}, [videoUrls]);

useEffect(() => {
  localStorage.setItem('savedLayout', layout);
}, [layout]);


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
        onShowMovieDetails={setMovieDetails}
        onClearState={clearSavedState}
      />

      <LayoutSelector
        onLayoutChange={handleLayoutChange}
        currentLayout={layout}
      />

      <div className={`video-grid ${layout}`}>
        {getDisplayedVideos().map((url, index) => {
          const isOnDemand = url.includes('vidsrc.xyz') || url.includes('2embed.cc');
          
          return (
            <div key={url} className="video-container">
              <div className="video-number">{index + 1}</div>
              <ErrorBoundary>
                {isOnDemand ? (
                  <OnDemandVideoFeed 
                    url={url}
                    isActive={activeVideoId === index}
                    onVideoSelect={() => handleVideoSelect(index)}
                  />
                ) : (
                  <VideoFeed 
                    url={url}
                    isActive={activeVideoId === index}
                  />
                )}
              </ErrorBoundary>
            </div>
          );
        })}
      </div>

      <OnDemandBrowser 
        onAddUrl={addVideoUrl} 
        onShowMovieDetails={setMovieDetails}
      />

      {/* Movie Details Modal */}
      {movieDetails && (
        <div 
          className="modal-backdrop" 
          onClick={() => setMovieDetails(null)}
        >
          <div 
            className="modal-content"
            onClick={e => e.stopPropagation()}
          >
            <MovieDetailsModal
              movieDetails={movieDetails}
              onClose={() => setMovieDetails(null)}
              onAddUrl={addVideoUrl}  // Pass the addVideoUrl function here
            />
              
            <div className="movie-content">
              <div className="movie-poster">
                <img 
                  src={`https://image.tmdb.org/t/p/w300${movieDetails.posterPath}`}
                  alt={movieDetails.title}
                />
              </div>
              
              <div className="movie-info">
                <h1>{movieDetails.title}</h1>
                <div className="movie-meta">
                  <span className="year">{movieDetails.year}</span>
                  {movieDetails.type === 'movie' && <span className="badge">Movie</span>}
                  {movieDetails.type === 'tv' && <span className="badge">TV Series</span>}
                </div>
                
                <p className="overview">{movieDetails.overview}</p>
                
                <div className="action-buttons">
                  <button
                    className="watch-now-btn"
                    onClick={() => {
                      if (movieDetails.type === 'movie') {
                        addVideoUrl(`https://vidsrc.xyz/embed/movie/${movieDetails.tmdb}`);
                      } else {
                        setSelectedShow(movieDetails);
                        setShowEpisodeSelector(true);
                      }
                      setMovieDetails(null);
                    }}
                  >
                    Watch Now
                  </button>
                  <button
                    className="close-btn"
                    onClick={() => setMovieDetails(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showEpisodeSelector && selectedShow && (
            <MovieDetailsModal
              show={selectedShow}
              onSelectMovie={(url) => {
                addVideoUrl(url);
                setShowEpisodeSelector(false);
                setSelectedShow(null);
              }}
              onClose={() => {
                setShowEpisodeSelector(false);
                setSelectedShow(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default App;