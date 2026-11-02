import React, { useState, useEffect, useCallback } from 'react';
import VideoFeed from './VideoFeed';
import LayoutSelector from './LayoutSelector';
import { LAYOUTS, getAllowedLayouts, getMaxStreams } from './layouts';
import './App.css';
import './components/LayoutSelector.css';
import './components/StreamHomepage.css';
import './components/StreamViewHeader.css';
import './components/AddStreamButton.css';
import './components/StreamBrowserModal.css';
import './components/EditStreamsModal.css';
import './styles/mobile.css';
import ErrorBoundary from './components/ErrorBoundary';
import MovieDetailsModal from './components/MovieDetailsModal';
import OnDemandVideoFeed from './OnDemandVideoFeed';
import StreamHomepage from './components/StreamHomepage';
import StreamBrowserModal from './components/StreamBrowserModal';
import EditStreamsModal from './components/EditStreamsModal';
import { Plus, Maximize, Minimize, Play, Settings, Volume2, VolumeX } from 'lucide-react';
import { Analytics } from "@vercel/analytics/react";
import { fetchLiveMatches, findMatchForUrl, formatEmbedTitle } from './utils/ppvApi';
import usePipWindow from './usePipWindow';
import useStreamAudio, { getStreamKey } from './useStreamAudio';
import ExtensionChip from './components/ExtensionChip';
import { useMatchScores } from './useMatchScores';
import useWakeLock from './useWakeLock';
import StreamHelp from './components/StreamHelp';
import StreamNotice from './components/StreamNotice';
import { deviceType, isTouchDevice, canFullscreenPage } from './deviceProfile';

const MATCH_REFRESH_INTERVAL_MS = 60000;
const PIP_RESIZE_CORNERS = ['nw', 'ne', 'sw', 'se'];
const ALLOWED_LAYOUTS = getAllowedLayouts(deviceType);
// Saved under a separate key on touch, where the default is off
const KEEP_RUNNING_KEY = isTouchDevice ? 'keepStreamsRunningOnTouch' : 'keepStreamsRunning';

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
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const hasLoadedMatchesRef = React.useRef(false);
  const scoredMatches = useMatchScores(matches, currentView === 'homepage' || showStreamBrowser);

  const [videoUrls, setVideoUrls] = useState(() => {
    const savedUrls = localStorage.getItem('savedVideoUrls');
    return savedUrls ? JSON.parse(savedUrls) : [];
  });

  const [layout, setLayout] = useState(() => {
    const savedLayout = localStorage.getItem('savedLayout');
    return ALLOWED_LAYOUTS.includes(savedLayout) ? savedLayout : 'single';
  });

  // On touch, saved streams wait for a tap. Loading them all at once can crash the tab,
  // and the reload after a crash would load them again.
  const [isResumePending, setIsResumePending] = useState(() => isTouchDevice && videoUrls.length > 0);

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
  const [keepStreamsRunning, setKeepStreamsRunning] = useState(() => {
    const saved = localStorage.getItem(KEEP_RUNNING_KEY);
    return saved === null ? !isTouchDevice : saved === 'true';
  });
  const [isActuallyFullscreen, setIsActuallyFullscreen] = useState(false);
  const [isHeaderVisibleInFullscreen, setIsHeaderVisibleInFullscreen] = useState(false);

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
    // A phone keeps one large stream rather than shrinking it to fit another
    if (deviceType === 'phone') return layout;

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
      ].filter(option => ALLOWED_LAYOUTS.includes(option.id));
      
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
    ].filter(option => ALLOWED_LAYOUTS.includes(option.id));
    
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


  const handleStreamRecovery = (urlToRefresh, index) => {
    // Remove any existing refresh_id so they don't stack up
    const baseUrl = getStreamKey(urlToRefresh);

    // A new unique query parameter forces a reload
    const refreshedUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}refresh_id=${Date.now()}`;

    const newUrls = [...videoUrls];
    newUrls[index] = refreshedUrl;
    setVideoUrls(newUrls);
  };

  const handleReorderUrls = (newUrls) => {
    setVideoUrls(newUrls);
    // autoSwitchLayout(newUrls.length); // Temporarily commented out for debugging DND
  };

  const handleMakeMain = (url) => {
    setVideoUrls([url, ...videoUrls.filter(otherUrl => otherUrl !== url)]);
  };

  const addVideoUrl = (url, matchInfo = null) => {
    if (url && !videoUrls.includes(url)) {
      setIsResumePending(false);
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
    setIsResumePending(false);
    setCurrentView('homepage');
  };

  useWakeLock(isTouchDevice && currentView === 'stream-view' && !isResumePending && videoUrls.length > 0);

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
    if (isResumePending) return [];
    if (layout === 'grid-infinite') {
      return videoUrls;
    }
    return videoUrls.slice(0, getMaxStreams(deviceType, layout));
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
    localStorage.setItem(KEEP_RUNNING_KEY, keepStreamsRunning);
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
const isPageFullscreen = isActuallyFullscreen && isStreamView;

// Render players in a fixed order and place them with CSS. Moving an iframe in the
// DOM reloads it, so reordering must not change their order in the markup.
const renderedVideos = (keepStreamsRunning && !isResumePending ? videoUrls : isStreamView ? displayedVideos : [])
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
            <Settings size={18} strokeWidth={1.75} />
            <span>Manage</span>
          </button>
          
          {canFullscreenPage && <button 
            className="icon-btn"
            onClick={toggleFullScreen} 
            title={isActuallyFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-label={isActuallyFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isActuallyFullscreen ? <Minimize size={18} strokeWidth={1.75} /> : <Maximize size={18} strokeWidth={1.75} />}
          </button>}

          <LayoutSelector
            onLayoutChange={handleLayoutChange}
            currentLayout={layout}
            allowedLayouts={ALLOWED_LAYOUTS}
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
        onMakeMain={handleMakeMain}
        onOpenStreamBrowser={() => {
          setShowEditStreams(false);
          setShowStreamBrowser(true);
        }}
        formatApiUrl={formatApiUrl}
        sourceIndices={sourceIndices}
        onCycleSource={cycleSource}
        currentLayout={layout}
        onLayoutChange={handleLayoutChange}
        allowedLayouts={ALLOWED_LAYOUTS}
        keepStreamsRunning={keepStreamsRunning}
        onKeepStreamsRunningChange={setKeepStreamsRunning}
        streamAudio={streamAudio}
      />
    </>)}

      {/* Video Grid - stays mounted so hidden streams keep running */}
      <div
        ref={pipWindow.gridRef}
        className={`video-grid ${layout}${pipWindow.isInteracting ? ' pip-interacting' : ''}${isPageFullscreen ? ' page-fullscreen' : ''}`}
        style={{ display: isStreamView ? undefined : 'none' }}
      >
        {isResumePending && (
          <div className="player-empty">
            <h1>Pick up where you left off</h1>
            <p className="resume-streams__hint">
              {videoUrls.length === 1 ? '1 saved stream' : `${videoUrls.length} saved streams`}
            </p>
            <button className="btn btn--lg btn--primary" onClick={() => setIsResumePending(false)}>
              <Play size={18} />
              <span>Resume</span>
            </button>
            <button className="btn btn--lg btn--secondary" onClick={handleReturnToHomepage}>
              <span>Browse instead</span>
            </button>
          </div>
        )}
        {displayedVideos.length === 0 && !isResumePending && (
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
                    isActive={isTouchDevice || activeVideoId === index}
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
              {isTouchDevice && (
                <StreamHelp
                  showEndedHint={Boolean(sourceIndices[url]?.match) && matches.length > 0 && !findMatchForUrl(matches, url)}
                  onReload={() => handleStreamRecovery(url, index)}
                  onNextSource={sourceIndices[url]?.match?.sources?.length > 1 ? () => cycleSource(url, index) : null}
                  onMakeMain={index > 0 ? () => handleMakeMain(url) : null}
                />
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

      {isTouchDevice && isStreamView && displayedVideos.length > 0 && <StreamNotice />}

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