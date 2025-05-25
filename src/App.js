import React, { useState, useEffect } from 'react';
import VideoFeed from './VideoFeed';
import LayoutSelector from './LayoutSelector';
import { LAYOUTS } from './layouts';
import './App.css';
import './components/LayoutSelector.css';
import './components/StreamHomepage.css';
import './components/StreamViewHeader.css';
import './components/AddStreamButton.css';
import './components/StreamBrowserModal.css';
import './components/EditStreamsModal.css';
import './components/wizard/QuickstartWizard.css';
import ErrorBoundary from './components/ErrorBoundary';
import OnDemandBrowser from './components/OnDemandBrowser';
import MovieDetailsModal from './components/MovieDetailsModal';
import EpisodeSelector from './components/EpisodeSelector.js';
import OnDemandVideoFeed from './OnDemandVideoFeed';
import StreamHomepage from './components/StreamHomepage';
import DebugHomepage from './components/DebugHomepage';
import StreamBrowserModal from './components/StreamBrowserModal';
import EditStreamsModal from './components/EditStreamsModal';
import { Plus, Maximize, Minimize, HelpCircle } from 'lucide-react';
import { Analytics } from "@vercel/analytics/react";
import QuickstartWizard from './components/wizard/QuickstartWizard';
import PlayerViewWizard from './components/wizard/PlayerViewWizard';
import './components/wizard/PlayerViewWizard.css';

const App = () => {
  // App view state - 'homepage' or 'stream-view'
  const [currentView, setCurrentView] = useState(() => {
    const savedUrls = localStorage.getItem('savedVideoUrls');
    const hasStreams = savedUrls && JSON.parse(savedUrls).length > 0;
    return hasStreams ? 'stream-view' : 'homepage';
  });

  // Modal states
  const [showStreamBrowser, setShowStreamBrowser] = useState(false);
  const [showEditStreams, setShowEditStreams] = useState(false);

  // Matches data for Homepage and Stream Browser
  const [matches, setMatches] = useState([]);
  const [playerViewWizardResetToken, setPlayerViewWizardResetToken] = useState(0);
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
  const [isActuallyFullscreen, setIsActuallyFullscreen] = useState(false);
  const [isHeaderVisibleInFullscreen, setIsHeaderVisibleInFullscreen] = useState(false);
  const [showQuickstartWizard, setShowQuickstartWizard] = useState(() => {
    const quickstartCompleted = localStorage.getItem('streambuddy_quickstart_completed');
    console.log('[App.js Init] quickstartCompleted from localStorage:', quickstartCompleted, 'Setting showQuickstartWizard to:', quickstartCompleted !== 'true');
    return quickstartCompleted !== 'true';
  });

  const [showPlayerViewWizard, setShowPlayerViewWizard] = useState(() => {
    const pvwCompleted = localStorage.getItem('streambuddy_player_wizard_completed') === 'true';
    console.log('[App.js Init] Initializing showPlayerViewWizard. Completed status:', pvwCompleted);
    return !pvwCompleted; // Show wizard if not completed
  });

  // Fullscreen logic
  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        // Optionally, inform the user that fullscreen failed
      }
    } else {
      if (document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch (err) {
          console.error(`Error attempting to disable full-screen mode: ${err.message} (${err.name})`);
        }
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsActuallyFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);    // Firefox
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);   // IE/Edge

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Ref for checking current header visibility in callbacks
  const isHeaderVisibleInFullscreenRef = React.useRef(isHeaderVisibleInFullscreen);
  useEffect(() => {
    isHeaderVisibleInFullscreenRef.current = isHeaderVisibleInFullscreen;
  }, [isHeaderVisibleInFullscreen]);

  // Effect for auto-hiding header in fullscreen stream view
  useEffect(() => {
    const HOVER_THRESHOLD_PX = 70;
    let hideTimeoutId = null;
    let lastKnownMouseY = window.innerHeight; // Initialize safely

    const handleMouseMove = (event) => {
      lastKnownMouseY = event.clientY;
      if (event.clientY < HOVER_THRESHOLD_PX) {
        if (!isHeaderVisibleInFullscreenRef.current) {
          setIsHeaderVisibleInFullscreen(true);
        }
        if (hideTimeoutId) clearTimeout(hideTimeoutId);
        hideTimeoutId = setTimeout(() => {
          if (lastKnownMouseY >= HOVER_THRESHOLD_PX) {
            setIsHeaderVisibleInFullscreen(false);
          }
        }, 2000); // Hide after 2s if mouse not in top area
      } else {
        if (isHeaderVisibleInFullscreenRef.current && !hideTimeoutId) {
          setIsHeaderVisibleInFullscreen(false);
        }
      }
    };

    if (isActuallyFullscreen && currentView === 'stream-view') {
      document.addEventListener('mousemove', handleMouseMove);
      // Initial state based on mouse position
      if (lastKnownMouseY < HOVER_THRESHOLD_PX) {
        setIsHeaderVisibleInFullscreen(true);
        // Schedule a hide if it moves out
        if (hideTimeoutId) clearTimeout(hideTimeoutId);
        hideTimeoutId = setTimeout(() => {
            if (lastKnownMouseY >= HOVER_THRESHOLD_PX) setIsHeaderVisibleInFullscreen(false);
        }, 2000);
      } else {
        setIsHeaderVisibleInFullscreen(false);
      }
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      setIsHeaderVisibleInFullscreen(false);
      if (hideTimeoutId) clearTimeout(hideTimeoutId);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (hideTimeoutId) clearTimeout(hideTimeoutId);
    };
  }, [isActuallyFullscreen, currentView]); // isHeaderVisibleInFullscreen removed from deps

  // Wizard Handlers & Logic
  const handleCloseQuickstartWizard = () => {
    console.log('[App.js handleCloseQuickstartWizard] Closing QuickstartWizard');
    setShowQuickstartWizard(false);
    localStorage.setItem('streambuddy_quickstart_wizard_completed', 'true');
  };

  const handleOpenPlayerViewWizardManual = () => {
    console.log('[App.js] Manually opening PlayerViewWizard via help button.');
    // Ensure PVW doesn't show if QSW is active and not completed
    const qswCompleted = localStorage.getItem('streambuddy_quickstart_wizard_completed') === 'true';
    if (showQuickstartWizard && !qswCompleted) {
      console.log('[App.js] Quickstart wizard is active and not completed, not opening PVW manually.');
      return; // Don't open PVW if QSW should be active
    }
    setPlayerViewWizardResetToken(prevToken => prevToken + 1);
    setShowPlayerViewWizard(true);
    // Consider if PVW should reset to its first step when opened manually.
    // This might require passing a prop or a ref to PlayerViewWizard to call a reset function.
  };

  const handleClosePlayerViewWizard = () => {
    console.log('[App.js handleClosePlayerViewWizard] Closing PlayerViewWizard');
    setShowPlayerViewWizard(false);
    localStorage.setItem('streambuddy_player_wizard_completed', 'true');
  };

  useEffect(() => {
    const qswCompleted = localStorage.getItem('streambuddy_quickstart_completed') === 'true';
    const pvwCompleted = localStorage.getItem('streambuddy_player_wizard_completed') === 'true';

    console.log('[App.js Wizards useEffect] Checking states:', {
      currentView, 
      qswCompleted,
      pvwCompleted,
      showQuickstartWizard_state: showQuickstartWizard,
      showPlayerViewWizard_state: showPlayerViewWizard
    });

    // Handle QuickstartWizard (homepage only)
    if (currentView === 'homepage') {
      // Hide PlayerViewWizard if somehow shown on homepage
      if (showPlayerViewWizard) {
        console.log('[App.js] Hiding PlayerViewWizard on homepage');
        setShowPlayerViewWizard(false);
      }
      
      // Show QuickstartWizard if not completed
      if (!qswCompleted && !showQuickstartWizard) {
        console.log('[App.js] Showing QuickstartWizard (first time on homepage)');
        setShowQuickstartWizard(true);
      }
    } 
    // Handle PlayerViewWizard (stream-view only)
    else if (currentView === 'stream-view') {
      // Hide QuickstartWizard if shown in stream-view
      if (showQuickstartWizard) {
        console.log('[App.js] Hiding QuickstartWizard in stream-view');
        setShowQuickstartWizard(false);
      }
      
      // Show PlayerViewWizard if not completed
      if (!pvwCompleted && !showPlayerViewWizard) {
        console.log('[App.js] Showing PlayerViewWizard (first time in stream-view)');
        setShowPlayerViewWizard(true);
      }
    }
  }, [currentView, showQuickstartWizard, showPlayerViewWizard]);

  // Fetch matches for Homepage and Stream Browser
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
    if (currentView === 'homepage' || showStreamBrowser) {
      fetchMatches();
    }
  }, [currentView, showStreamBrowser]);

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
    const pvwCompleted = localStorage.getItem('streambuddy_player_wizard_completed') === 'true';
    console.log('[App.js] handleEnterStreamView: PlayerViewWizard completed status:', pvwCompleted);
    
    // Set the view to stream-view
    setCurrentView('stream-view');
    
    // Only show the wizard if it hasn't been completed
    if (!pvwCompleted) {
      console.log('[App.js] handleEnterStreamView: Showing PlayerViewWizard');
      setShowPlayerViewWizard(true);
    }
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


  const handleStreamRecovery = (urlToRefresh, index) => {
    setStreamRetries(prev => {
      const currentRetries = prev[index] || 0;
      // Keeping retry limit, but can be removed if refresh should always be allowed.
      if (currentRetries < 5) { // Increased retry limit slightly, or remove for unlimited retries
        const newUrls = [...videoUrls];
        
        // Use urlToRefresh as the source of truth for the original URL
        let originalUrl = urlToRefresh;

        // Remove any existing refresh_id query param to prevent them from stacking up
        let baseOriginalUrl = originalUrl.split('?refresh_id=')[0];
        baseOriginalUrl = baseOriginalUrl.split('&refresh_id=')[0]; // In case it's not the first param

        // Append a new unique query parameter to force reload
        const refreshedUrl = `${baseOriginalUrl}${baseOriginalUrl.includes('?') ? '&' : '?'}refresh_id=${Date.now()}`;
        
        newUrls[index] = refreshedUrl;
        setVideoUrls([...newUrls]); // Ensure a new array instance for React state update

        // The URL will now contain refresh_id. If this becomes an issue for display
        // or long-term storage, a mechanism to revert it after a delay could be added,
        // but that adds complexity and potential race conditions.
        // Forcing a reload is the primary goal here.

        return { ...prev, [index]: currentRetries + 1 };
      }
      return prev;
    });
  };

  const handleReorderUrls = (newUrls) => {
    setVideoUrls(newUrls);
    // autoSwitchLayout(newUrls.length); // Temporarily commented out for debugging DND
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

  const handleClearAllStreams = () => {
    setVideoUrls([]);
    setActiveVideoId(null);
    setSourceIndices({});
    setStreamRetries({});
    setCurrentView('homepage');
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
    localStorage.removeItem('streambuddy_quickstart_completed');
    setVideoUrls([]);
    setLayout('single');
    setActiveVideoId(null);
    setSourceIndices({});
    setStreamRetries({});
    setMovieDetails(null);
    setCurrentView('homepage');
  };

  const handleShowQuickstartWizard = () => {
    setShowQuickstartWizard(true);
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

// Render common components that should persist across views
const renderQuickstartWizard = () => {
  console.log('[App.js render] QuickstartWizard isOpen prop:', showQuickstartWizard);
  return (
  <QuickstartWizard
    isOpen={showQuickstartWizard}
    onClose={handleCloseQuickstartWizard} // Uses the new handler
    currentView={currentView}
    isMovieDetailsModalOpen={!!movieDetails} // Only pass necessary props
  />
); // End of renderQuickstartWizard function
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
        onShowQuickstartWizard={handleShowQuickstartWizard}
      />
      {renderQuickstartWizard()}
      <Analytics />
    </div>
  );
}

// Show Stream View (multi-stream interface with modal browser)
console.log('[App.js] Rendering PlayerViewWizard with props:', {
  isOpen: showPlayerViewWizard,
  currentView,
  showStreamBrowser,
  showEditStreams
});

return (
  <div className="app stream-view">
    <PlayerViewWizard
      isOpen={showPlayerViewWizard}
      onClose={handleClosePlayerViewWizard}
      forceReset={playerViewWizardResetToken}
      currentView={currentView}
      showStreamBrowser={showStreamBrowser}
      showEditStreams={showEditStreams}
    />
    {/* Stream View Header - with Edit button */}
    <div className={`stream-view-header ${
      isActuallyFullscreen && currentView === 'stream-view' && !isHeaderVisibleInFullscreen ? 'header-hidden-fullscreen' : ''
    }`.trim()}>
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
          
          <button 
            className="fullscreen-btn header-icon-btn"
            onClick={toggleFullScreen} 
            title={isActuallyFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isActuallyFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>

          {/* Help button for PlayerViewWizard - only in stream-view */}
          {currentView === 'stream-view' && (
            <button onClick={handleOpenPlayerViewWizardManual} className="action-btn help-btn" title="Player View Tour">
              <HelpCircle size={20} />
            </button>
          )}

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
        onClearAllStreams={handleClearAllStreams}
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
      <div 
        className={`video-grid ${layout}`}
        style={(() => {
          const HEADER_HEIGHT = 60; // px

          let marginTop = 0;
          let availableHeight = '100vh';

          const isImmersiveFullscreen = isActuallyFullscreen && currentView === 'stream-view' && !isHeaderVisibleInFullscreen;

          if (isImmersiveFullscreen) {
            // Fullscreen, stream view, header hidden
            marginTop = 0;
            availableHeight = '100vh';
          } else {
            // Not immersive fullscreen OR fullscreen with header visible
            if (isActuallyFullscreen && currentView === 'stream-view' && isHeaderVisibleInFullscreen) {
              // Fullscreen, stream view, header visible on hover
              marginTop = 0; // Header overlays
              availableHeight = '100vh'; // Video grid takes full height behind header
            } else {
              // Not fullscreen (standard view)
              marginTop = HEADER_HEIGHT; // Header pushes content down
              availableHeight = `calc(100vh - ${HEADER_HEIGHT}px)`;
            }
          }

          return {
            marginTop: `${marginTop}px`,
            height: availableHeight
          };
        })()}
      >
        {getDisplayedVideos().map((url, index) => {
          const isOnDemand = url.includes('vidsrc.xyz') || url.includes('2embed.cc');
          
          return (
            <div key={url} className="video-container">
              {showEditStreams && <div className="video-number">{index + 1}</div>}
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

      {/* Movie Details Modal */}
      {movieDetails && (
        <MovieDetailsModal
          movieDetails={movieDetails}
          onClose={() => setMovieDetails(null)}
          onPlayStream={handleStreamSelect}
        />
      )}
      
      {/* Quickstart Wizard */}
      {renderQuickstartWizard()}
      
      <Analytics />
    </div>
  );
};

export default App;