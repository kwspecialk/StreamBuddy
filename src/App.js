import React, { useState, useEffect } from 'react';
import VideoFeed from './VideoFeed';
import LayoutSelector from './LayoutSelector';
import { LAYOUTS } from './layouts';
import './App.css';
import './components/QuickStart.css';
import './components/LayoutSelector.css';
import './components/StreamHomepage.css';
import './components/StreamViewHeader.css';
import './components/AddStreamButton.css';
import './components/StreamBrowserModal.css';
import './components/EditStreamsModal.css';
import ErrorBoundary from './components/ErrorBoundary';
import OnDemandBrowser from './components/OnDemandBrowser';
import MovieDetailsModal from './components/MovieDetailsModal';
import EpisodeSelector from './components/EpisodeSelector.js';
import OnDemandVideoFeed from './OnDemandVideoFeed';
import QuickStart from './components/QuickStart';
import StreamHomepage from './components/StreamHomepage';
import DebugHomepage from './components/DebugHomepage';
import StreamBrowserModal from './components/StreamBrowserModal';
import EditStreamsModal from './components/EditStreamsModal';
import { Plus } from 'lucide-react';
import { Analytics } from "@vercel/analytics/react";

const App = () => {
  // App view state - 'homepage' or 'stream-view'
  const [currentView, setCurrentView] = useState(() => {
    const savedUrls = localStorage.getItem('savedVideoUrls');
    const hasStreams = savedUrls && JSON.parse(savedUrls).length > 0;
    return hasStreams ? 'stream-view' : 'homepage';
  });

  // Check if user has completed setup before
  const [showQuickStart, setShowQuickStart] = useState(() => {
    const hasCompletedSetup = localStorage.getItem('streambuddy_setup_completed');
    const hasSavedUrls = localStorage.getItem('savedVideoUrls');
    return !hasCompletedSetup && (!hasSavedUrls || JSON.parse(hasSavedUrls).length === 0);
  });

  // Modal states
  const [showStreamBrowser, setShowStreamBrowser] = useState(false);
  const [showEditStreams, setShowEditStreams] = useState(false);

  // Matches data for QuickStart, Homepage, and Stream Browser
  const [matches, setMatches] = useState([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  const [videoUrls, setVideoUrls] = useState(() => {
    const savedUrls = localStorage.getItem('savedVideoUrls');
    return savedUrls ? JSON.parse(savedUrls) : [];
  });

  const [layout, setLayout] = useState(() => {
    const savedLayout = localStorage.getItem('savedLayout');
    return savedLayout || 'single';
  });

  const [activeVideoId, setActiveVideoId] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [sourceIndices, setSourceIndices] = useState({});
  const [streamRetries, setStreamRetries] = useState({});
  const [showEpisodeSelector, setShowEpisodeSelector] = useState(false);
  const [selectedShow, setSelectedShow] = useState(null);

  // Fetch matches for QuickStart, Homepage, and Stream Browser
  const fetchMatches = async () => {
    if (matches.length > 0) return;
    
    try {
      setIsLoadingMatches(true);
      const response = await fetch('https://streamed.su/api/matches/live');
      if (!response.ok) return;
      
      const data = await response.json();
      const uniqueMatches = new Map();
      
      data.forEach(match => {
        const uniqueKey = `${match.teams?.home?.name}-${match.teams?.away?.name}-${match.title}`.toLowerCase();
        
        if (!uniqueMatches.has(uniqueKey) || 
            (match.sources?.length > uniqueMatches.get(uniqueKey).sources?.length)) {
          const isLive = match.title.toLowerCase().includes('live');
          const cleanTitle = match.title.replace(/LIVE/i, '').trim();
          
          uniqueMatches.set(uniqueKey, {
            ...match,
            id: match.id,
            title: cleanTitle,
            popular: match.popular || isLive,
            isLive: isLive,
            sources: match.sources?.filter(Boolean) || []
          });
        }
      });

      setMatches(Array.from(uniqueMatches.values()));
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  // Helper function to auto-switch layout based on stream count
  const autoSwitchLayout = (streamCount) => {
    const currentMaxWindows = LAYOUTS[layout]?.windows || 1;
    if (streamCount > currentMaxWindows && layout !== 'grid-infinite') {
      // Find the best layout for the current stream count
      const layoutOptions = [
        { id: 'single', windows: 1 },
        { id: 'dual', windows: 2 },
        { id: 'triple', windows: 3 },
        { id: 'quad', windows: 4 },
        { id: 'two-plus-four', windows: 6 },
        { id: 'grid-3x3', windows: 9 },
        { id: 'grid-5x2', windows: 10 },
        { id: 'grid-infinite', windows: Infinity }
      ];
      
      // Find the smallest layout that can accommodate all streams
      const bestLayout = layoutOptions.find(l => l.windows >= streamCount);
      if (bestLayout && bestLayout.id !== layout) {
        setLayout(bestLayout.id);
        console.log(`Auto-switched layout from ${layout} to ${bestLayout.id} to accommodate ${streamCount} streams`);
        return bestLayout.id;
      }
    }
    return layout;
  };

  // Load matches when needed
  useEffect(() => {
    if (currentView === 'homepage' || showQuickStart || showStreamBrowser) {
      fetchMatches();
    }
  }, [currentView, showQuickStart, showStreamBrowser]);

  const handleQuickStartComplete = async (setupData) => {
    const { selectedContent, selectedLayout, skipWizard } = setupData;
    
    localStorage.setItem('streambuddy_setup_completed', 'true');
    
    if (!skipWizard && selectedContent.length > 0) {
      setLayout(selectedLayout);
      
      for (const match of selectedContent) {
        if (match.sources && match.sources.length > 0) {
          try {
            const source = match.sources[0];
            const response = await fetch(`https://streamed.su/api/stream/${source.source}/${source.id}`);
            
            if (response.ok) {
              const data = await response.json();
              if (data?.[0]?.embedUrl) {
                addVideoUrl(data[0].embedUrl, match);
              }
            }
          } catch (error) {
            console.error('Error fetching stream for', match.title, error);
          }
        }
      }
      
      setCurrentView('stream-view');
    }
    
    setShowQuickStart(false);
    
    if (skipWizard) {
      setCurrentView('homepage');
    }
  };

  const handleStreamSelect = async (itemOrUrl, itemDataIfUrl = null) => {
    let urlToAdd = null;
    let dataForStream = null;
    let streamSuccessfullyProcessed = false;

    if (typeof itemOrUrl === 'string') {
      // Movie/TV show with pre-constructed URL
      urlToAdd = itemOrUrl;
      dataForStream = itemDataIfUrl;
      if (urlToAdd) {
        addVideoUrl(urlToAdd, dataForStream); // addVideoUrl handles duplicates
        streamSuccessfullyProcessed = true;
      } else {
        console.warn('[App.js] handleStreamSelect: Received string itemOrUrl but it was empty.');
      }
    } else if (itemOrUrl && itemOrUrl.sources && itemOrUrl.sources.length > 0) {
      // Sports match object
      dataForStream = itemOrUrl; // itemOrUrl is the match object
      try {
        // Basic source selection: use the first one. Could be more sophisticated.
        const sourceToFetch = dataForStream.sources.find(s => s.source && s.id);
        if (sourceToFetch) {
          const response = await fetch(`https://streamed.su/api/stream/${sourceToFetch.source}/${sourceToFetch.id}`);
          if (response.ok) {
            const responseData = await response.json();
            if (responseData?.[0]?.embedUrl) {
              urlToAdd = responseData[0].embedUrl;
              addVideoUrl(urlToAdd, dataForStream);
              streamSuccessfullyProcessed = true;
            } else {
              console.error('[App.js] API response for sports stream did not contain embedUrl:', responseData);
            }
          } else {
            console.error('[App.js] Failed to fetch sports stream:', response.status, await response.text().catch(() => ''));
          }
        } else {
          console.error('[App.js] Sports item has sources, but no valid source found (missing source.source or source.id):', dataForStream.sources);
        }
      } catch (error) {
        console.error('[App.js] Error fetching stream for', dataForStream.title || 'sports item', error);
      }
    } else {
      console.warn('[App.js] handleStreamSelect: Invalid itemOrUrl or itemDataIfUrl provided.', itemOrUrl, itemDataIfUrl);
    }

    if (streamSuccessfullyProcessed) {
      console.log('[App.js] handleStreamSelect: Stream processed successfully. About to call handleEnterStreamView. Current view:', currentView);
      handleEnterStreamView();
      return true;
    } else {
      console.warn('[App.js] handleStreamSelect: Failed to process stream. Not navigating. Item/URL:', itemOrUrl);
      return false;
    }
  };

  const handleEnterStreamView = () => {
    console.log('[App.js] handleEnterStreamView: Setting currentView to stream-view. Previous view:', currentView);
    setCurrentView('stream-view');
  };

  const handleReturnToHomepage = () => {
    setCurrentView('homepage');
  };

  const handleOpenStreamBrowser = () => {
    setShowStreamBrowser(true);
  };

  const handleCloseStreamBrowser = () => {
    setShowStreamBrowser(false);
  };

  const handleOpenEditStreams = () => {
    setShowEditStreams(true);
  };

  const handleCloseEditStreams = () => {
    setShowEditStreams(false);
  };

  const handleStreamRecovery = (index) => {
    setStreamRetries(prev => {
      const currentRetries = prev[index] || 0;
      if (currentRetries < 3) {
        const newUrls = [...videoUrls];
        const currentUrl = newUrls[index];
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
    setVideoUrls(newUrls);
    autoSwitchLayout(newUrls.length);
  };

  const addVideoUrl = (url, matchInfo = null) => {
    if (url && !videoUrls.includes(url)) {
      const newUrls = [...videoUrls, url];
      setVideoUrls(newUrls);
      autoSwitchLayout(newUrls.length);
      
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
    setSourceIndices(prev => {
      const newIndices = { ...prev };
      delete newIndices[urlToDelete];
      return newIndices;
    });
    
    // If no more streams, return to homepage
    if (videoUrls.length <= 1) {
      setCurrentView('homepage');
    }
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
    } else {
      // If no newSourceIndices provided, handle cycling internally
      const urlData = sourceIndices[url];
      if (urlData?.match?.sources?.length > 1) {
        const currentSource = urlData.sourceIndex;
        const nextIndex = (currentSource + 1) % urlData.match.sources.length;
        
        try {
          const source = urlData.match.sources[nextIndex];
          const response = await fetch(`https://streamed.su/api/stream/${source.source}/${source.id}`);
          const data = await response.json();

          if (data?.[0]?.embedUrl) {
            const newUrls = [...videoUrls];
            newUrls[urlIndex] = data[0].embedUrl;
            setVideoUrls(newUrls);

            setSourceIndices(prev => {
              const updated = { ...prev };
              delete updated[url]; // Remove old URL
              updated[data[0].embedUrl] = {
                match: urlData.match,
                sourceIndex: nextIndex
              };
              return updated;
            });
          }
        } catch (error) {
          console.error('Error cycling source:', error);
        }
      }
    }
  };

  const clearSavedState = () => {
    localStorage.removeItem('savedVideoUrls');
    localStorage.removeItem('savedLayout');
    localStorage.removeItem('streambuddy_setup_completed');
    setVideoUrls([]);
    setLayout('single');
    setActiveVideoId(null);
    setSourceIndices({});
    setStreamRetries({});
    setMovieDetails(null);
    setCurrentView('homepage');
    setShowQuickStart(false);
  };

  const getDisplayedVideos = () => {
    if (layout === 'grid-infinite') {
      return videoUrls;
    }
    const maxWindows = LAYOUTS[layout]?.windows || 1;
    return videoUrls.slice(0, maxWindows);
  };

  const displayedVideos = getDisplayedVideos();

  useEffect(() => {
    return () => {
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

  // Show QuickStart if needed
  if (showQuickStart) {
    return (
      <div className="app">
        <QuickStart 
          onComplete={handleQuickStartComplete}
          matches={matches}
          isLoading={isLoadingMatches}
        />
        <Analytics />
      </div>
    );
  }

  // Show Homepage
  if (currentView === 'homepage') {
    return (
      <div className="app">
        <StreamHomepage
          onStreamSelect={handleStreamSelect}
          onEnterStreamView={handleEnterStreamView}
          matches={matches}
          isLoading={isLoadingMatches}
          onAddUrl={addVideoUrl}
        />
        <Analytics />
      </div>
    );
  }

  // Show Stream View (multi-stream interface with modal browser)
  return (
    <div className="app stream-view">
      {/* Stream View Header - with Edit button */}
      <div className="stream-view-header">
        <div className="header-left">
          <button 
            className="back-to-home-btn"
            onClick={handleReturnToHomepage}
          >
            ← StreamBuddy
          </button>
        </div>
        
        <div className="header-right">
          <button 
            className="add-stream-btn-header"
            onClick={handleOpenStreamBrowser}
            title="Add Stream"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
          
          <button 
            className="edit-streams-btn"
            onClick={handleOpenEditStreams}
          >
            <span className="edit-btn-text-full">Manage Streams</span>
            <span className="edit-btn-text-short">Manage</span>
          </button>
          
          <LayoutSelector
            onLayoutChange={handleLayoutChange}
            currentLayout={layout}
          />
        </div>
      </div>

      {/* Stream Browser Modal */}
      <StreamBrowserModal
        isOpen={showStreamBrowser}
        onClose={handleCloseStreamBrowser}
        onAddStream={addVideoUrl}
        matches={matches}
        isLoading={isLoadingMatches}
        onShowMovieDetails={setMovieDetails}
      />

      {/* Edit Streams Modal */}
      <EditStreamsModal
        isOpen={showEditStreams}
        onClose={handleCloseEditStreams}
        videoUrls={videoUrls}
        onDeleteStream={handleDeleteUrl}
        onRefreshStream={handleStreamRecovery}
        onReorderStreams={handleReorderUrls}
        onOpenStreamBrowser={() => {
          setShowEditStreams(false);
          setShowStreamBrowser(true);
        }}
        formatApiUrl={formatApiUrl}
        sourceIndices={sourceIndices}
        onCycleSource={cycleSource}
        currentLayout={layout}
        onLayoutChange={handleLayoutChange}
      />

      {/* Video Grid */}
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

      {/* Keep existing OnDemandBrowser for backward compatibility */}
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
              onAddUrl={addVideoUrl}
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
      
      <Analytics />
    </div>
  );
};

export default App;