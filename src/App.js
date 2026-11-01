import React, { useState, useEffect, useCallback } from 'react';
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
import ErrorBoundary from './components/ErrorBoundary';
import MovieDetailsModal from './components/MovieDetailsModal';
import OnDemandVideoFeed from './OnDemandVideoFeed';
import StreamHomepage from './components/StreamHomepage';
import StreamBrowserModal from './components/StreamBrowserModal';
import EditStreamsModal from './components/EditStreamsModal';
import { Plus, Maximize, Minimize, HelpCircle, Settings, Volume2, VolumeX } from 'lucide-react';
import { Analytics } from "@vercel/analytics/react";
import PlayerViewWizard from './components/wizard/PlayerViewWizard';
import './components/wizard/PlayerViewWizard.css';
import { fetchLiveMatches, findMatchForUrl, formatEmbedTitle } from './utils/ppvApi';
import usePipWindow from './usePipWindow';
import useStreamAudio, { getStreamKey } from './useStreamAudio';
import ExtensionChip from './components/ExtensionChip';
import { useMatchScores } from './useMatchScores';

const MATCH_REFRESH_INTERVAL_MS = 60000;
const PIP_RESIZE_CORNERS = ['nw', 'ne', 'sw', 'se'];

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
  const hasLoadedMatchesRef = React.useRef(false);
  const scoredMatches = useMatchScores(matches, currentView === 'homepage' || showStreamBrowser);

  const [videoUrls, setVideoUrls] = useState(() => {
    const savedUrls = localStorage.getItem('savedVideoUrls');
    return savedUrls ? JSON.parse(savedUrls) : [];
  });

  const [layout, setLayout] = useState(() => {
    const savedLayout = localStorage.getItem('savedLayout');
    return savedLayout || 'single';
  });

  const pipWindow = usePipWindow(layout === 'pip');
  const streamAudio = useStreamAudio(videoUrls);

  const [activeVideoId, setActiveVideoId] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [sourceIndices, setSourceIndices] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('savedSourceIndices')) || {};
    } catch {
      return {};
    }
  });
  const [keepStreamsRunning, setKeepStreamsRunning] = useState(
    () => localStorage.getItem('keepStreamsRunning') !== 'false'
  );
  const [, setStreamRetries] = useState({});
  const [isActuallyFullscreen, setIsActuallyFullscreen] = useState(false);
  const [isHeaderVisibleInFullscreen, setIsHeaderVisibleInFullscreen] = useState(false);

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
  const handleOpenPlayerViewWizardManual = () => {
    console.log('[App.js] Manually opening PlayerViewWizard via help button.');
    setPlayerViewWizardResetToken(prevToken => prevToken + 1);
    setShowPlayerViewWizard(true);
  };

  const handleClosePlayerViewWizard = () => {
    console.log('[App.js handleClosePlayerViewWizard] Closing PlayerViewWizard');
    setShowPlayerViewWizard(false);
    localStorage.setItem('streambuddy_player_wizard_completed', 'true');
  };

  useEffect(() => {
    const pvwCompleted = localStorage.getItem('streambuddy_player_wizard_completed') === 'true';
    
    // Check if user is on mobile
    const isMobile = window.innerWidth <= 768;

    console.log('[App.js Wizards useEffect] Checking states:', {
      currentView, 
      pvwCompleted,
      isMobile,
      showPlayerViewWizard_state: showPlayerViewWizard
    });

    // Disable wizards on mobile devices
    if (isMobile) {
      if (showPlayerViewWizard) {
        console.log('[App.js] Hiding PlayerViewWizard on mobile');
        setShowPlayerViewWizard(false);
      }
      return;
    }

    // Handle PlayerViewWizard (stream-view only)
    if (currentView === 'stream-view') {
      // Show PlayerViewWizard if not completed
      if (!pvwCompleted && !showPlayerViewWizard) {
        console.log('[App.js] Showing PlayerViewWizard (first time in stream-view)');
        setShowPlayerViewWizard(true);
      }
    } else {
      // Hide PlayerViewWizard on other views
      if (showPlayerViewWizard) {
        console.log('[App.js] Hiding PlayerViewWizard');
        setShowPlayerViewWizard(false);
      }
    }
  }, [currentView, showPlayerViewWizard]);

  // Fetch matches for Homepage and Stream Browser
  const fetchMatches = useCallback(async () => {
    try {
      // Later refreshes update the list in the background
      if (!hasLoadedMatchesRef.current) setIsLoadingMatches(true);
      setMatches(await fetchLiveMatches());
      hasLoadedMatchesRef.current = true;
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setIsLoadingMatches(false);
    }
  }, []);

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

  // Helper function to auto-downsize layout when streams are removed
  const autoDownsizeLayout = (streamCount) => {
    if (layout === 'grid-infinite') return layout; // Don't auto-downsize infinite grid
    if (layout === 'pip' && streamCount >= 2) return layout; // PiP fits any count, so only leave it for a lone stream

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
    
    // Find the smallest layout that can fit the remaining streams
    const bestLayout = layoutOptions.find(l => l.windows >= streamCount);
    if (bestLayout && bestLayout.id !== layout) {
      setLayout(bestLayout.id);
      console.log(`Auto-downsized layout from ${layout} to ${bestLayout.id} for ${streamCount} streams`);
      return bestLayout.id;
    }
    return layout;
  };

  // Load matches when needed
  useEffect(() => {
    if (currentView === 'homepage' || showStreamBrowser) {
      fetchMatches();
      const refreshTimer = setInterval(fetchMatches, MATCH_REFRESH_INTERVAL_MS);
      return () => clearInterval(refreshTimer);
    }
  }, [currentView, showStreamBrowser, fetchMatches]);

  // Saved streams need the match list too, to recover their titles and sources
  useEffect(() => {
    if (currentView === 'stream-view') {
      fetchMatches();
    }
  }, [currentView, fetchMatches]);

  // Link streams that have no match info yet to their live match
  useEffect(() => {
    const recovered = {};
    videoUrls.forEach(url => {
      const found = url && !sourceIndices[url] && findMatchForUrl(matches, url);
      if (found) recovered[url] = found;
    });

    if (Object.keys(recovered).length > 0) {
      setSourceIndices(prev => ({ ...prev, ...recovered }));
    }
  }, [matches, videoUrls, sourceIndices]);

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
      urlToAdd = dataForStream.sources[0].embedUrl;
      addVideoUrl(urlToAdd, dataForStream);
      streamSuccessfullyProcessed = true;
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
      const newUrls = [url, ...videoUrls];
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
    const newUrls = videoUrls.filter(url => url !== urlToDelete);
    setVideoUrls(newUrls);
    streamAudio.forgetStream(urlToDelete);
    if (videoUrls.indexOf(urlToDelete) === activeVideoId) {
      setActiveVideoId(null);
    }
    setSourceIndices(prev => {
      const newIndices = { ...prev };
      delete newIndices[urlToDelete];
      return newIndices;
    });
    
    // If no more streams, return to homepage
    if (newUrls.length === 0) {
      setCurrentView('homepage');
    } else {
      // Auto-downsize layout to match remaining stream count
      autoDownsizeLayout(newUrls.length);
    }
  };

  const handleClearAllStreams = () => {
    setVideoUrls([]);
    streamAudio.forgetAllStreams();
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
        const nextUrl = urlData.match.sources[nextIndex].embedUrl;

        const newUrls = [...videoUrls];
        newUrls[urlIndex] = nextUrl;
        setVideoUrls(newUrls);
        streamAudio.moveStream(url, nextUrl);

        setSourceIndices(prev => {
          const updated = { ...prev };
          delete updated[url]; // Remove old URL
          updated[nextUrl] = {
            match: urlData.match,
            sourceIndex: nextIndex
          };
          return updated;
        });
      }
    }
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
    localStorage.setItem('savedSourceIndices', JSON.stringify(sourceIndices));
  }, [sourceIndices]);

  useEffect(() => {
    localStorage.setItem('keepStreamsRunning', keepStreamsRunning);
  }, [keepStreamsRunning]);

  useEffect(() => {
    localStorage.setItem('savedLayout', layout);
  }, [layout]);

  const formatApiUrl = (url) => {
    try {
      return formatEmbedTitle(url);
    } catch (error) {
      console.error('Error formatting URL:', error);
      return url;
    }
};

const isStreamView = currentView === 'stream-view';

// Render players in a fixed order and place them with CSS. Moving an iframe in the
// DOM reloads it, so reordering must not change their order in the markup.
const renderedVideos = (keepStreamsRunning ? videoUrls : isStreamView ? displayedVideos : [])
  .filter(Boolean)
  .sort();

return (
  <div className={`app${isStreamView ? ' stream-view' : ''}`}>
    {streamAudio.isCheckDone && !streamAudio.hasExtension && !isActuallyFullscreen && <ExtensionChip />}

    {!isStreamView && (
      <StreamHomepage
        onStreamSelect={handleStreamSelect}
        onEnterStreamView={handleEnterStreamView}
        matches={scoredMatches}
        isLoading={isLoadingMatches}
        onAddUrl={addVideoUrl}
      />
    )}

    {/* Stream View (multi-stream interface with modal browser) */}
    {isStreamView && (<>
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
            ← <img src="/logo.png" alt="StreamBuddy Logo" style={{ height: '24px', verticalAlign: 'middle' }} />
          </button>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn btn--md btn--primary"
            onClick={handleOpenStreamBrowser}
            title="Add Stream"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
          
          <button 
            className="btn btn--md--settings btn--secondary--settings"
            onClick={handleOpenEditStreams}
          >
            <Settings size={20} />
            <span>Manage</span>
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
        matches={scoredMatches}
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
        keepStreamsRunning={keepStreamsRunning}
        onKeepStreamsRunningChange={setKeepStreamsRunning}
        streamAudio={streamAudio}
      />
    </>)}

      {/* Video Grid - stays mounted so hidden streams keep running */}
      <div
        ref={pipWindow.gridRef}
        className={`video-grid ${layout}${pipWindow.isInteracting ? ' pip-interacting' : ''}`}
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
            display: isStreamView ? undefined : 'none',
            marginTop: `${marginTop}px`,
            height: availableHeight
          };
        })()}
      >
        {displayedVideos.length === 0 && (
          <div className="player-empty">
            <h1>Nothing playing yet</h1>
            <p>Add a live game, movie or show to start watching.</p>
            <button className="btn btn--lg btn--primary" onClick={handleOpenStreamBrowser}>
              <Plus size={18} />
              <span>Add a stream</span>
            </button>
          </div>
        )}
        {renderedVideos.map((url) => {
          const index = videoUrls.indexOf(url);
          const isOnDemand = url.includes('vidsrc.sh') || url.includes('2embed.cc');
          const isPipWindow = layout === 'pip' && index > 0;
          const pipSlot = index - 1;
          const isMuted = streamAudio.isMuted(url);

          return (
            <div
              key={url}
              data-streambuddy-stream={streamAudio.hasExtension ? getStreamKey(url) : undefined}
              className={`video-container slot-${index + 1}${isPipWindow ? ' pip-window' : ''}`}
              style={{
                ...(isPipWindow ? pipWindow.getStyle(pipSlot) : undefined),
                order: index,
                display: displayedVideos.includes(url) ? undefined : 'none'
              }}
            >
              {showEditStreams && <div className="video-number">{index + 1}</div>}
              <ErrorBoundary>
                {isOnDemand ? (
                  <OnDemandVideoFeed 
                    url={url}
                    isActive={activeVideoId === index}
                    onVideoSelect={() => handleVideoSelect(index)}
                  />
                ) : (
                  <VideoFeed url={url} />
                )}
              </ErrorBoundary>
              {streamAudio.hasExtension && (
                <button
                  className={`stream-mute-btn${isMuted ? ' muted' : ''}`}
                  title={isMuted ? 'Unmute stream' : 'Mute stream'}
                  aria-pressed={isMuted}
                  onClick={() => streamAudio.toggleMute(url)}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              )}
              {isPipWindow && (
                <>
                  <div
                    className="pip-drag-handle"
                    title="Drag to move"
                    onPointerDown={(event) => pipWindow.startDrag(event, pipSlot)}
                  />
                  {PIP_RESIZE_CORNERS.map(corner => (
                    <div
                      key={corner}
                      className={`pip-resize-handle ${corner}`}
                      title="Drag to resize"
                      onPointerDown={(event) => pipWindow.startResize(event, pipSlot, corner)}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Movie Details Modal */}
      {isStreamView && movieDetails && (
        <MovieDetailsModal
          movieDetails={movieDetails}
          onClose={() => setMovieDetails(null)}
          onPlayStream={handleStreamSelect}
        />
      )}
      
      <Analytics />
    </div>
  );
};

export default App;