import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Plus, GripVertical, Trash2, ChevronRight } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { LAYOUTS } from '../layouts';
import { tmdbApi } from '../utils/tmdbApi';

const EditStreamsModal = ({ 
  isOpen, 
  onClose, 
  videoUrls,
  onDeleteStream,
  onClearAllStreams,
  onRefreshStream,
  onReorderStreams,
  onOpenStreamBrowser,
  formatApiUrl,
  sourceIndices,
  onCycleSource,
  currentLayout,
  onLayoutChange
}) => {
  const [refreshingStreams, setRefreshingStreams] = useState(new Set());
  const [nextEpisodeLoading, setNextEpisodeLoading] = useState(new Set());
  const [isLayoutMenuVisible, setLayoutMenuVisible] = useState(false);
  const [clearAllHoldProgress, setClearAllHoldProgress] = useState(0);
  const [isClearAllHolding, setIsClearAllHolding] = useState(false);
  const [clearAllHoldTimer, setClearAllHoldTimer] = useState(null);
  
  // State for persistent stream titles
  const [streamTitles, setStreamTitles] = useState(() => {
    const saved = localStorage.getItem('streamTitles');
    return saved ? JSON.parse(saved) : {};
  });
  // Save stream titles to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('streamTitles', JSON.stringify(streamTitles));
  }, [streamTitles]);
  
  // Effect to clean up streamTitles if URLs are removed from videoUrls
  useEffect(() => {
    const currentBaseUrls = new Set(
      videoUrls.map(url => {
        let baseUrl = url.split('?refresh_id=')[0];
        baseUrl = baseUrl.split('&refresh_id=')[0];
        return baseUrl;
      })
    );

    const titleKeys = Object.keys(streamTitles);
    let changed = false;
    const cleanedTitles = { ...streamTitles };

    titleKeys.forEach(key => {
      if (!currentBaseUrls.has(key)) {
        delete cleanedTitles[key];
        changed = true;
      }
    });

    if (changed) {
      setStreamTitles(cleanedTitles);
    }
  }, [videoUrls, streamTitles]); // Rerun if videoUrls or streamTitles change

  // Helper function to detect TV show URLs
  const isTVShowUrl = (url) => {
    return url.includes('vidsrc.xyz/embed/tv/') || url.includes('2embed.cc/embed/tv/');
  };

  // Helper function to parse TV show URL and extract season/episode info
  const parseTVShowUrl = (url) => {
    const vidsrcMatch = url.match(/vidsrc\.xyz\/embed\/tv\/(\d+)\/(\d+)-(\d+)/);
    const embedMatch = url.match(/2embed\.cc\/embed\/tv\/(\d+)\/(\d+)-(\d+)/);
    
    const match = vidsrcMatch || embedMatch;
    if (match) {
      return {
        tmdbId: match[1],
        season: parseInt(match[2]),
        episode: parseInt(match[3]),
        baseUrl: url.includes('vidsrc.xyz') ? 'https://vidsrc.xyz/embed/tv/' : 'https://2embed.cc/embed/tv/'
      };
    }
    return null;
  };

  // Function to handle next episode using TMDB API for accurate episode checking
  const handleNextEpisode = async (url, index) => {
    const tvInfo = parseTVShowUrl(url);
    if (!tvInfo) return;

    // Add loading state
    setNextEpisodeLoading(prev => new Set([...prev, index]));

    try {
      console.log(`Checking next episode for TMDB ID: ${tvInfo.tmdbId}, Current: S${tvInfo.season}E${tvInfo.episode}`);
      
      // Use TMDB API to find the next available episode
      const nextEpisodeInfo = await tmdbApi.getNextEpisode(
        tvInfo.tmdbId, 
        tvInfo.season, 
        tvInfo.episode
      );
      
      if (!nextEpisodeInfo.found) {
        console.log(`No more episodes available after S${tvInfo.season}E${tvInfo.episode}`);
        return;
      }
      
      const { season: nextSeason, episode: nextEpisode } = nextEpisodeInfo;
      
      // Build new URL
      const newUrl = `${tvInfo.baseUrl}${tvInfo.tmdbId}/${nextSeason}-${nextEpisode}`;

      const oldBaseKeyUrl = getBaseUrlForKey(url);
      const newBaseKeyUrl = getBaseUrlForKey(newUrl);
      
      // Get the series title (without episode info) from the old URL
      const existingTitle = streamTitles[oldBaseKeyUrl];
      let seriesTitle = existingTitle;
      
      // If the existing title contains episode info, extract just the series title
      if (existingTitle && existingTitle.includes(' - S')) {
        seriesTitle = existingTitle.split(' - S')[0];
      } else if (existingTitle && /S\d+E\d+/.test(existingTitle)) {
        // If the title ends with episode format (like "Andor S01E01"), extract the series name
        seriesTitle = existingTitle.replace(/\s*S\d+E\d+.*$/, '').trim();
      }
      
      // If we have a series title (not generic SxxExx), preserve it for the new episode
      if (seriesTitle && seriesTitle.trim() && !/^S\d+E\d+$/.test(seriesTitle)) {
        // Clean up: if old URL had a title with episode info, remove it
        if (oldBaseKeyUrl !== newBaseKeyUrl && existingTitle && existingTitle.includes(' - S')) {
          setStreamTitles(prev => {
            const updated = { ...prev };
            delete updated[oldBaseKeyUrl];
            updated[newBaseKeyUrl] = seriesTitle;
            return updated;
          });
        } else {
          setStreamTitles(prev => ({
            ...prev,
            [newBaseKeyUrl]: seriesTitle
          }));
        }
      }
      
      // Replace the current URL with the next episode URL
      const newUrls = [...videoUrls];
      newUrls[index] = newUrl;
      onReorderStreams(newUrls);
      
      // Log the change for user feedback
      if (nextSeason > tvInfo.season) {
        console.log(`🎉 Jumped to next season! S${tvInfo.season}E${tvInfo.episode} → S${nextSeason}E${nextEpisode}`);
      } else {
        console.log(`📺 Advanced to next episode: S${tvInfo.season}E${tvInfo.episode} → S${nextSeason}E${nextEpisode}`);
      }
      console.log(`New URL: ${newUrl}`);
      
    } catch (error) {
      console.error('Error advancing episode:', error);
    } finally {
      // Remove loading state
      setTimeout(() => {
        setNextEpisodeLoading(prev => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }, 500);
    }
  };

  // Function to handle clear all streams with press and hold
  const handleClearAllStart = (e) => {
    e.preventDefault();
    if (videoUrls.length === 0) return;
    
    setIsClearAllHolding(true);
    setClearAllHoldProgress(0);
    
    const startTime = Date.now();
    const duration = 650; // 650ms hold duration
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      
      setClearAllHoldProgress(progress);
      
      if (progress >= 100) {
        // Clear all when animation completes
        clearInterval(timer);
        onClearAllStreams();
        onClose();
        // Reset states
        setIsClearAllHolding(false);
        setClearAllHoldProgress(0);
      }
    }, 16); // ~60fps updates
    
    setClearAllHoldTimer(timer);
  };
  
  const handleClearAllEnd = () => {
    if (clearAllHoldTimer) {
      clearInterval(clearAllHoldTimer);
      setClearAllHoldTimer(null);
    }
    setIsClearAllHolding(false);
    setClearAllHoldProgress(0);
  };
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (clearAllHoldTimer) {
        clearInterval(clearAllHoldTimer);
      }
    };
  }, [clearAllHoldTimer]);

  const handleRefreshStream = async (url, index) => {
    setRefreshingStreams(prev => new Set([...prev, index]));
    
    try {
      // If stream has multiple sources, cycle to next source
      if (sourceIndices[url]?.match?.sources?.length > 1) {
        await onCycleSource(url, index);
      } else {
        // Otherwise just refresh the stream
        await onRefreshStream(url, index);
      }
    } catch (error) {
      console.error('Error refreshing stream:', error);
    } finally {
      setTimeout(() => {
        setRefreshingStreams(prev => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }, 1000);
    }
  };

  const getBaseUrlForKey = (url) => {
    if (!url) return '';
    let baseUrl = url.split('?refresh_id=')[0];
    baseUrl = baseUrl.split('&refresh_id=')[0];
    return baseUrl;
  };

  const getStreamTitle = (url, index) => {
    const baseKeyUrl = getBaseUrlForKey(url);
    const tvInfo = parseTVShowUrl(url);

    // 1. Check for a stored custom/series title for the base URL
    if (streamTitles[baseKeyUrl]) {
      const storedTitle = streamTitles[baseKeyUrl];
      
      // If it's a TV show and we have a non-generic title, append current episode
      if (tvInfo && !/^S\d+E\d+$/.test(storedTitle)) {
        return `${storedTitle} - S${tvInfo.season}E${tvInfo.episode.toString().padStart(2, '0')}`;
      }
      
      // Return stored title as-is for movies or generic titles
      return storedTitle;
    }
    
    // 2. No stored title, generate one
    const urlData = sourceIndices[url];
    if (urlData?.match?.title) {
      const title = urlData.match.title;
      setTimeout(() => setStreamTitles(prev => ({ ...prev, [baseKeyUrl]: title })), 0);
      return title;
    }
    
    if (tvInfo) {
      // For TV shows without a stored title, just show episode info
      return `S${tvInfo.season}E${tvInfo.episode.toString().padStart(2, '0')}`;
    }
    
    // Fallback for other content types
    const formatted = formatApiUrl(url);
    if (formatted !== url) {
      setTimeout(() => setStreamTitles(prev => ({ ...prev, [baseKeyUrl]: formatted })), 0);
      return formatted;
    }
    
    // Generic on-demand content based on URL patterns
    if (url.includes('vidsrc.xyz') || url.includes('2embed.cc')) {
      let title = 'On-Demand Content';
      const movieMatch = url.match(/\/movie\/(\d+)/);
      const tvMatch = url.match(/\/tv\/(\d+)/);
      
      if (movieMatch) {
        title = `Movie ${movieMatch[1]}`;
      } else if (tvMatch) {
        title = `TV Show ${tvMatch[1]}`;
      }
      setTimeout(() => setStreamTitles(prev => ({ ...prev, [baseKeyUrl]: title })), 0);
      return title;
    }
    
    // Generic fallback
    const defaultTitle = `Stream ${index + 1}`;
    setTimeout(() => setStreamTitles(prev => ({ ...prev, [baseKeyUrl]: defaultTitle })), 0);
    return defaultTitle;
  };
  
  // Initialize titles for existing streams on first load
  useEffect(() => {
    if (videoUrls.length > 0 && isOpen) {
      videoUrls.forEach((url, index) => {
        if (!streamTitles[url]) {
          getStreamTitle(url, index); // This will auto-save the title
        }
      });
    }
  }, [isOpen, videoUrls.length]); // Run when modal opens or stream count changes
  


  const getSourceInfo = (url) => {
    const urlData = sourceIndices[url];
    if (urlData?.match?.sources?.length > 1) {
      return `Source ${urlData.sourceIndex + 1}/${urlData.match.sources.length}`;
    }
    return null;
  };

  // Handle drag end event
  const handleDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    const { source, destination } = result;

    // If item didn't move, return
    if (source.index === destination.index) {
      return;
    }

    // Create a new array with the reordered items
    const items = Array.from(videoUrls);
    const [reorderedItem] = items.splice(source.index, 1);
    items.splice(destination.index, 0, reorderedItem);

    // Update the streams order
    onReorderStreams(items);
  };

  const getLayoutPreview = (layoutId, streamCount) => {
    const getPreviewBoxes = () => {
      switch(layoutId) {
        case 'single':
          return [{ width: '100%', height: '100%', number: streamCount >= 1 ? 1 : null }];
        case 'dual':
          return [
            { width: '49%', height: '100%', left: '0%', number: streamCount >= 1 ? 1 : null },
            { width: '49%', height: '100%', left: '51%', number: streamCount >= 2 ? 2 : null }
          ];
        case 'triple':
          return [
            { width: '63%', height: '100%', left: '0%', number: streamCount >= 1 ? 1 : null },
            { width: '35%', height: '49%', left: '65%', top: '0%', number: streamCount >= 2 ? 2 : null },
            { width: '35%', height: '49%', left: '65%', top: '51%', number: streamCount >= 3 ? 3 : null }
          ];
        case 'quad':
          return [
            { width: '49%', height: '49%', left: '0%', top: '0%', number: streamCount >= 1 ? 1 : null },
            { width: '49%', height: '49%', left: '51%', top: '0%', number: streamCount >= 2 ? 2 : null },
            { width: '49%', height: '49%', left: '0%', top: '51%', number: streamCount >= 3 ? 3 : null },
            { width: '49%', height: '49%', left: '51%', top: '51%', number: streamCount >= 4 ? 4 : null }
          ];
        case 'two-plus-four':
          return [
            { width: '63%', height: '49%', left: '0%', top: '0%', number: streamCount >= 1 ? 1 : null },
            { width: '63%', height: '49%', left: '0%', top: '51%', number: streamCount >= 2 ? 2 : null },
            { width: '35%', height: '24%', left: '65%', top: '0%', number: streamCount >= 3 ? 3 : null },
            { width: '35%', height: '24%', left: '65%', top: '25.5%', number: streamCount >= 4 ? 4 : null },
            { width: '35%', height: '24%', left: '65%', top: '51%', number: streamCount >= 5 ? 5 : null },
            { width: '35%', height: '24%', left: '65%', top: '76.5%', number: streamCount >= 6 ? 6 : null }
          ];
        case 'grid-3x3':
          return Array.from({ length: 9 }, (_, i) => ({
            width: '32%',
            height: '32%',
            left: `${(i % 3) * 34}%`,
            top: `${Math.floor(i / 3) * 34}%`,
            number: streamCount > i ? i + 1 : null
          }));
        case 'grid-5x2':
          return Array.from({ length: 10 }, (_, i) => ({
            width: '19%',
            height: '49%',
            left: `${(i % 5) * 20.25}%`,
            top: `${Math.floor(i / 5) * 51}%`,
            number: streamCount > i ? i + 1 : null
          }));
        case 'grid-infinite':
          const gridBoxes = Array.from({ length: Math.min(streamCount, 8) }, (_, i) => ({
            width: '32%',
            height: '32%',
            left: `${(i % 3) * 34}%`,
            top: `${Math.floor(i / 3) * 34}%`,
            number: i + 1
          }));
          if (streamCount > 8) {
            gridBoxes.push({ width: '8%', height: '8%', left: '92%', top: '92%', number: '...' });
          }
          return gridBoxes;
        default:
          return [{ width: '100%', height: '100%', number: streamCount >= 1 ? 1 : null }];
      }
    };

    return (
      <div className="layout-preview-mini">
        {getPreviewBoxes().map((box, index) => (
          <div
            key={index}
            className={`layout-preview-box-mini ${box.number ? 'active' : 'inactive'}`}
            style={{
              width: box.width,
              height: box.height,
              left: box.left || '0%',
              top: box.top || '0%'
            }}
          >
            {box.number && (
              <span className="layout-preview-number">
                {box.number}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const getLayoutDescription = (layoutId) => {
    switch(layoutId) {
      case 'single': return 'Single stream focus';
      case 'dual': return 'Side by side viewing';
      case 'triple': return 'Main + two smaller';
      case 'quad': return 'Equal four-way split';
      case 'two-plus-four': return 'Two large + four small';
      case 'grid-3x3': return '3×3 grid layout';
      case 'grid-5x2': return '5×2 grid layout';
      case 'grid-infinite': return 'Unlimited streams';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-streams-backdrop" onClick={onClose}>
      <div className="edit-streams-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-modal-header">
          <div className="header-left">
            <div>
              <h2>Manage Streams</h2>
              <p>Add, remove, or reorder streams ({videoUrls.length} active)</p>
            </div>
          </div>
          <button className="modal-icon-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Stream List */}
        <div className="edit-modal-content">
          {videoUrls.length === 0 ? (
            <div className="empty-streams-state">
              <div className="empty-icon">📺</div>
              <h3>No streams active</h3>
              <p>Add some streams to get started</p>
            </div>
          ) : (
            <div className="streams-container">
              {/* Draggable Streams Column */}
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="streams-list">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="streams-list"
                    >
                      {videoUrls.map((url, index) => {
                        const isRefreshing = refreshingStreams.has(index);
                        const isNextEpisodeLoading = nextEpisodeLoading.has(index);
                        const sourceInfo = getSourceInfo(url);

                        return (
                          <Draggable 
                            key={`item-${index}`} 
                            draggableId={`item-${index}`} 
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={{
                                  ...provided.draggableProps.style,
                                }}
                                className={`stream-item-new ${snapshot.isDragging ? 'dragging' : ''}`}
                              >
                                <div className="stream-content">
                                  {/* Drag Handle */}
                                  <div {...provided.dragHandleProps} className="drag-handle-new">
                                    <GripVertical size={16} />
                                  </div>
                                  {/* Stream Info */}
                                  <div className="stream-info-new">
                                    <span className="stream-item-number-inline">{index + 1}</span>
                                    <div className="stream-title-new">
                                      <span title={getStreamTitle(url, index)}>{getStreamTitle(url, index)}</span>
                                    </div>
                                    {sourceInfo && (
                                      <div className="stream-source-new">
                                        {sourceInfo}
                                      </div>
                                    )}
                                  </div>
                                  {/* Actions */}
                                  <div className="stream-actions-new">
                                    <button
                                      className={`action-btn-new refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
                                      onClick={() => handleRefreshStream(url, index)}
                                      disabled={isRefreshing}
                                      title={sourceInfo ? 'Cycle Source' : 'Refresh Stream'}
                                    >
                                      <RefreshCw size={16} />
                                    </button>
                                    {/* Next Episode button for TV shows */}
                                    {isTVShowUrl(url) && (
                                      <button
                                        className={`action-btn-new next-episode-btn ${isNextEpisodeLoading ? 'loading' : ''}`}
                                        onClick={() => handleNextEpisode(url, index)}
                                        disabled={isNextEpisodeLoading}
                                        title={isNextEpisodeLoading ? 'Loading next episode...' : 'Next Episode'}
                                      >
                                        <ChevronRight size={16} />
                                      </button>
                                    )}
                                    <button
                                      className="action-btn-new delete-btn"
                                      onClick={() => onDeleteStream(url)}
                                      title="Remove Stream"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="edit-modal-footer">
          <div className="footer-left">
            <button 
              className="add-stream-btn"
              onClick={() => {
                onClose();
                onOpenStreamBrowser();
              }}
            >
              <Plus size={20} />
              <span>Add Stream</span>
            </button>
            
            <div className="current-layout-container">
              <button 
                className="current-layout-preview clickable"
                onClick={() => setLayoutMenuVisible(!isLayoutMenuVisible)}
                title="Click to change layout"
              >
                {getLayoutPreview(currentLayout, videoUrls.length)}
              </button>
              
              {isLayoutMenuVisible && (
                <div className="layout-dropdown">
                  <div className="layout-dropdown-header">
                    <h4>Choose Layout</h4>
                    <p>Select how to arrange your streams</p>
                  </div>
                  
                  <div className="layout-dropdown-options">
                    {Object.entries(LAYOUTS).map(([id, layout]) => (
                      <button
                        key={id}
                        className={`layout-dropdown-option ${currentLayout === id ? 'selected' : ''}`}
                        onClick={() => {
                          onLayoutChange(id);
                          setLayoutMenuVisible(false);
                        }}
                      >
                        <div className="layout-option-preview">
                          {getLayoutPreview(id, false)}
                        </div>
                        <div className="layout-option-info">
                          <div className="layout-option-name">{layout.name}</div>
                          <div className="layout-option-desc">{getLayoutDescription(id)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Backdrop to close dropdown */}
              {isLayoutMenuVisible && (
                <div 
                  className="layout-dropdown-backdrop"
                  onClick={() => setLayoutMenuVisible(false)}
                />
              )}
            </div>
          </div>
          
          <div className="footer-center">
            <div className="footer-tip">
              💡 Drag streams to reorder • {videoUrls.length} of {currentLayout === 'grid-infinite' ? '∞' : '12'} streams
            </div>
          </div>
          
          <div className="footer-right">
            {/* Clear All button with press and hold animation */}
            {videoUrls.length > 0 && (
              <button 
                className={`clear-all-btn ${isClearAllHolding ? 'holding' : ''}`}
                onMouseDown={handleClearAllStart}
                onMouseUp={handleClearAllEnd}
                onMouseLeave={handleClearAllEnd}
                onTouchStart={handleClearAllStart}
                onTouchEnd={handleClearAllEnd}
                title={isClearAllHolding ? `Hold to clear all (${Math.round(clearAllHoldProgress)}%)` : 'Hold to clear all streams'}
                style={{
                  '--progress': `${clearAllHoldProgress}%`
                }}
              >
                <div className="clear-all-progress" style={{ width: `${clearAllHoldProgress}%` }}></div>
                <div className="clear-all-content">
                  <Trash2 size={16} />
                  <span>{isClearAllHolding ? 'Hold...' : 'Clear All'}</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditStreamsModal;