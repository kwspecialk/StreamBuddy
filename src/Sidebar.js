import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import OnDemandBrowser from './components/OnDemandBrowser';

const Sidebar = ({
  isCollapsed,
  toggleSidebar,
  videoUrls,
  onReorderUrls,
  onDeleteUrl,
  activeVideoId,
  onVolumeChange,
  onVideoSelect,
  volume,
  onAddUrl,
  onExportUrls,
  onShowMovieDetails,
  onFileUpload,
  sourceIndices,
  onCycleSource,
  onRefreshStream,
  onClearState
}) => {
  const [showBrowser, setShowBrowser] = useState(false);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [streamErrors, setStreamErrors] = useState({});
  const [showOnDemand, setShowOnDemand] = useState(false);
  const [localSourceIndices, setSourceIndices] = useState(sourceIndices || {});
  const [refreshingUrls, setRefreshingUrls] = useState(new Set());
  const [showHelp, setShowHelp] = useState(false);

  const filteredMatches = (matches, searchTerm) => {
    return matches.filter(match => 
      match.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (match.teams && `${match.teams.home?.name} ${match.teams.away?.name}`.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };
  const refreshStream = (url, index) => {
    // Mark this URL as refreshing
    setRefreshingUrls(prev => new Set([...prev, url]));
    
    // Update the video content
    const newUrls = [...videoUrls];
    const currentUrl = newUrls[index];
    newUrls[index] = '';
    onReorderUrls(newUrls);
  
    // Restore the video content after a delay
    setTimeout(() => {
      newUrls[index] = currentUrl;
      onReorderUrls(newUrls);
      // Remove the URL from refreshing state
      setRefreshingUrls(prev => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }, 500);
  };

  const formatApiUrl = (url) => {
    try {
      if (!url) return '';
      
      // For vidsrc URLs
      if (url.includes('vidsrc')) {
        const urlData = sourceIndices[url];
        // Simply return the title if we have it in sourceIndices
        if (urlData?.match?.title) {
          return urlData.match.title;
        }
      }
  
      // Handle embedme.top URLs
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
  
      // If no patterns match, return the original URL
      return url;
    } catch (error) {
      console.error('Error formatting URL:', error);
      return url;
    }
  };

  const moveUrl = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === videoUrls.length - 1)
    ) {
      return;
    }
  
    const newUrls = [...videoUrls];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Instead of swapping, remove and insert to maintain order
    const movedUrl = newUrls[index];
    newUrls.splice(index, 1);  // Remove from current position
    newUrls.splice(targetIndex, 0, movedUrl);  // Insert at new position
    
    onReorderUrls(newUrls);
  };

  const fetchStreams = async (match, sourceIndex = 0) => {
    if (!match?.sources?.[sourceIndex]) return;

    try {
      const source = match.sources[sourceIndex];
      console.log('Fetching stream for:', match.title, 'source:', source);

      const response = await fetch(`/api/stream/${source.source}/${source.id}`);
      
      if (!response.ok) {
        console.error('Stream fetch failed:', response.status);
        return;
      }

      const data = await response.json();
      console.log('Stream data received:', data);

      if (data?.[0]?.embedUrl) {
        onAddUrl(data[0].embedUrl);
        setSourceIndices(prev => ({
          ...prev,
          [data[0].embedUrl]: { match, sourceIndex }
        }));
      }
    } catch (error) {
      console.error('Error fetching stream:', error);
    }
  };

  const handleMatchSelect = async (match) => {
    setSelectedMatch(match);
    if (match?.sources?.[0]) {
      try {
        console.log('Selected match:', match);
        const response = await fetch(`https://streamed.su/api/stream/${match.sources[0].source}/${match.sources[0].id}`);
        const data = await response.json();
        
        if (data?.[0]?.embedUrl) {
          onAddUrl(data[0].embedUrl);
          // Store the match and source index for this URL
          const newSourceIndices = {
            ...sourceIndices,
            [data[0].embedUrl]: {
              match: match,
              sourceIndex: 0
            }
          };
          setSourceIndices(newSourceIndices);
        }
      } catch (error) {
        console.error('Error fetching initial stream:', error);
      }
    }
  };
  
  const fetchStreamData = (source) => {
    return fetch(`/api/stream/${source.source}/${source.id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      });
  };

  const cycleSource = useCallback((url, urlIndex) => {
    // Get the data for this URL from our sourceIndices state
    const urlData = sourceIndices[url];
    
    // If we don't have source data or there are no sources, log and exit
    if (!urlData?.match?.sources) {
      console.warn('No source data available for URL:', url);
      return;
    }

    const currentSource = urlData.sourceIndex;
    const totalSources = urlData.match.sources.length;
    const nextIndex = (currentSource + 1) % totalSources;

    console.log(`Cycling source ${currentSource} -> ${nextIndex} of ${totalSources}`);
    const source = urlData.match.sources[nextIndex];

    fetchStreamData(source)
      .then(data => {
        console.log('New stream data:', data);

        if (data?.[0]?.embedUrl) {
          // Update URLs array
          const newUrls = [...videoUrls];
          newUrls[urlIndex] = data[0].embedUrl;
          onReorderUrls(newUrls);

          // Update source indices with new URL and incremented source index
          const updatedSourceIndices = {
            ...sourceIndices,
            [data[0].embedUrl]: {
              match: urlData.match,
              sourceIndex: nextIndex
            }
          };
          // Delete the old URL from sourceIndices to prevent memory leaks
          delete updatedSourceIndices[url];
          
          // Update source indices through the parent component
          if (typeof onCycleSource === 'function') {
            onCycleSource(url, urlIndex, updatedSourceIndices);
          }
        } else {
          console.warn('No embed URL found in response');
        }
      })
      .catch(error => {
        console.error('Error cycling source:', error);
      });
  }, [sourceIndices, videoUrls, onReorderUrls, onCycleSource]);
  const normalizeMatchTitle = (title) => {
    return title
      .toLowerCase()
      .replace(/\s+vs\s+|\s+v\s+/, ' vs ')
      .replace(/\s+fc\b/g, '')
      .replace(/united/, 'utd')
      .replace(/live$/, '')
      .trim();
  };
  
  const fetchAlternateStream = async (urlData, urlIndex) => {
    const nextIndex = (urlData.sourceIndex + 1) % urlData.match.sources.length;

    try {
      const source = urlData.match.sources[nextIndex];
      const response = await fetch(`https://streamed.su/api/stream/${source.source}/${source.id}`);
      const data = await response.json();

      if (data?.[0]?.embedUrl) {
        // Create new URLs array with replaced URL
        const newUrls = [...videoUrls];
        newUrls[urlIndex] = data[0].embedUrl;
        onReorderUrls(newUrls);

        // Update source index for new URL
        setSourceIndices(prev => ({
          ...prev,
          [data[0].embedUrl]: { 
            match: urlData.match, 
            sourceIndex: nextIndex 
          }
        }));
      } else {
        console.warn('No embed URL found in stream data');
      }
    } catch (error) {
      console.error('Error fetching alternate stream:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      console.log('Fetching matches...');
      const response = await fetch('https://streamed.su/api/matches/live');
      
      if (!response.ok) {
        console.error('Match fetch failed:', response.status, response.statusText);
        const text = await response.text();
        console.log('Error response:', text);
        return;
      }
      
      const data = await response.json();
      console.log('Matches data received:', data); // Debug log
      
      // Create an object to store unique matches
      const uniqueMatches = new Map();
      
      data.forEach(match => {
        // Create a unique key using relevant match properties
        const uniqueKey = `${match.teams?.home?.name}-${match.teams?.away?.name}-${match.title}`.toLowerCase();
        
        // Only add the match if it's not already in our Map
        // or if the new match has more sources (better quality)
        if (!uniqueMatches.has(uniqueKey) || 
            (match.sources?.length > uniqueMatches.get(uniqueKey).sources?.length)) {
          
          const isLive = match.title.includes('LIVE');
          const cleanTitle = match.title.replace('LIVE', '').trim();
          
          uniqueMatches.set(uniqueKey, {
            ...match,
            id: match.id,
            title: cleanTitle,
            popular: match.popular || isLive,
            isLive: isLive,
            sources: match.sources
          });
        }
      });
     // Add this right before the setMatches call to debug
      console.log('Filtered matches:', Array.from(uniqueMatches.values()));    
      // Convert to array and set state
      setMatches(Array.from(uniqueMatches.values()));
    } catch (error) {
      console.error('Error in fetchMatches:', error);
    }
  };

  const MatchItem = ({ match }) => {
    // If we have team data, construct the title from teams, otherwise use match.title
    const displayTitle = match.teams?.home?.name && match.teams?.away?.name
      ? `${match.teams.home.name} vs ${match.teams.away.name}`
      : match.title;
  
    return (
      <div
        onClick={() => handleMatchSelect(match)}
        className="match-item mb-2"
      >
        <div className="flex items-center">
          <div className="flex-1">
            <div className="text-sm flex items-center justify-between">
              <span className="my-1">{displayTitle}</span>
              {match.isLive && (
                <span className="live-badge">LIVE</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleToggleSidebar = () => {
    toggleSidebar();
     // Close on-demand section when sidebar is collapsed
    if (!isCollapsed) {
      setShowOnDemand(false);
      setShowBrowser(false);
    }
  };

  const updateSourceIndices = (newIndices) => {
    setSourceIndices(newIndices);
  };

  return (
    <>
    <button className="sidebar-toggle" onClick={handleToggleSidebar}>
      {isCollapsed ? '☰' : '←'}
    </button>
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-content">
        <div className="url-input-group">
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setShowBrowser(!showBrowser);
                if (!showBrowser) fetchMatches();
                setShowOnDemand(false);
              }}
              className="browse-button flex-1"
            >
              {showBrowser ? 'Hide Events' : 'Browse Live Events'}
            </button>
            <button   
              onClick={() => {
                setShowOnDemand(!showOnDemand);
                setShowBrowser(false);
              }}
              className="browse-button flex-1"
            >
              {showOnDemand ? 'Hide On Demand' : 'On Demand'}
            </button>
          </div>
          
          {showOnDemand && !isCollapsed && (
            <OnDemandBrowser 
              onAddUrl={onAddUrl} 
              onShowMovieDetails={onShowMovieDetails}  // Pass the prop here
            />
          )}

          {showBrowser && !isCollapsed && (
            <div className="matches-container">
              {/* Add search bar */}
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search matches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="match-search"
                />
              </div>

              <div className="matches-section">
                <div className="match-header">
                  <h2>Featured Matches</h2>
                </div>
                <div className="matches-list">
                  {filteredMatches(matches.filter(match => match.popular), searchTerm)
                    .map((match) => (
                      <MatchItem 
                        key={match.id} 
                        match={match} 
                        className="mb-2"
                      />
                    ))}
                </div>
              </div>

              <div className="matches-section">
                <div className="match-header">
                  <h2>All Live Events</h2>
                </div>
                <div className="matches-list">
                  {filteredMatches(matches.filter(match => !match.popular), searchTerm)
                    .map((match) => (
                      <MatchItem key={match.id} match={match} />
                    ))}
                </div>
              </div>
            </div>
          )}

          <input type="text" placeholder="Enter video URL" className="url-input" />
          <div className="button-group">
            <button onClick={() => onAddUrl(document.querySelector("input").value)}>
              Add Video
            </button>
            <button onClick={onExportUrls}>Export</button>
            <label htmlFor="file-upload" className="custom-file-upload" style={{ textAlign: 'center' }}>
              Import
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".txt"
              style={{ display: 'none' }}
              onChange={onFileUpload}
            />
          </div>
        </div>

        <div className="volume-controls">
          <div className="volume-selector">
            <label>Selected Window:</label>
            <select
              value={activeVideoId || ''}
              onChange={(e) => onVideoSelect(e.target.value)}
            >
              <option value="">None Selected</option>
              {videoUrls.map((_, index) => (
                <option key={index} value={index}>
                  Window {index + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="volume-note">
            Note: Volume must be controlled through the video player
          </div>
        </div>

        <div className="url-list">
          {videoUrls.map((url, index) => (
            <div key={index} className="url-item">
              <div className="url-item-content">
                <span className="window-number">{index + 1}</span>
                <div className={`url-text ${refreshingUrls.has(url) ? 'refreshing' : ''}`}>
                  {formatApiUrl(url)}
                </div>
                <div className="url-controls">
                {sourceIndices[url]?.match?.sources?.length > 1 ? (
                  <button
                    className="cycle-button"
                    onClick={() => cycleSource(url, index)}
                    title={`Source ${sourceIndices[url].sourceIndex + 1} of ${sourceIndices[url].match.sources.length}`}
                  >
                    ↻ {sourceIndices[url].sourceIndex + 1}/{sourceIndices[url].match.sources.length}
                  </button>
                ) : (
                  <button
                    className={`cycle-button ${refreshingUrls.has(url) ? 'refreshing' : ''}`}
                    onClick={() => refreshStream(url, index)}
                    title="Refresh stream"
                    disabled={refreshingUrls.has(url)}
                  >
                    ⟳
                  </button>
                )}
                  <button
                    className="move-button"
                    onClick={() => moveUrl(index, 'up')}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => onDeleteUrl(url)}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="sidebar-bottom-bar">
          <button
            className="sidebar-bottom-button"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            ⛶
          </button>
  
          <button
            className="sidebar-bottom-button"
            onClick={() => setShowHelp(!showHelp)}
            title="Help"
          >
            ?
          </button>

          <button
            className="sidebar-bottom-button danger"
            onClick={onClearState}
            title="Clear All Streams"
          >
            Clear All
          </button>

          {showHelp && (
          <div className="help-modal">
            <h3>Tips & Information</h3>
            <div className="help-date">Notes: *11/17 - On Demand content not working currently, working on fix. Known issues with refreshing live events when streaming more than 2 concurrent streams, will fix soon.</div>
            <ul>
              <li><span className="shortcut">↑</span> Reorder streams</li>
              <li><span className="shortcut">ESC</span> Exit fullscreen</li>
            </ul>
            <div className="browser-tips">
              <p>For best results use Chrome or Firefox with uBlock Origin:</p>
              <div className="browser-links">
                <a 
                  href="https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm?hl=en-US"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chrome Extension
                </a>
                <a 
                  href="https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Firefox Extension
                </a>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
    </>
  );
};

export default Sidebar;