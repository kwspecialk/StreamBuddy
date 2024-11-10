import React, { useState, useEffect } from 'react';

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
  onFileUpload
}) => {
  const [showBrowser, setShowBrowser] = useState(false);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [sourceIndices, setSourceIndices] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [streamErrors, setStreamErrors] = useState({});

  const filteredMatches = (matches, searchTerm) => {
    return matches.filter(match => 
      match.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (match.teams && `${match.teams.home?.name} ${match.teams.away?.name}`.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const formatApiUrl = (url) => {
    try {
      if (url.includes('embedme.top')) {
        // Original embedme.top handling
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
        } else {
          const showName = title.replace(/-/g, ' ');
          return showName.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      } else {
        // Handle custom URLs
        // Find text between slashes that contains 'vs' or 'v'
        const parts = url.split('/');
        for (let i = 0; i < parts.length; i++) {
          if (parts[i].includes('-vs-') || parts[i].includes('-v-')) {
            const matchParts = parts[i].split(/-vs-|-v-/);
            if (matchParts.length === 2) {
              const team1 = matchParts[0].replace(/-/g, ' ').trim();
              const team2 = matchParts[1].replace(/-/g, ' ').trim();
              
              const capitalize = (str) => {
                return str.split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
              };
              
              return `${capitalize(team1)} vs ${capitalize(team2)}`;
            }
          }
        }
      }
      
      return url; // Return original URL if no matches found
    } catch (error) {
      console.error('Error formatting URL:', error);
      return url; // Return original URL if any error occurs
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
    [newUrls[index], newUrls[targetIndex]] = [newUrls[targetIndex], newUrls[index]];
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
    if (!match?.sources?.[0]) return;
    
    try {
      const source = match.sources[0];
      const response = await fetch(`https://streamed.su/api/stream/${source.source}/${source.id}`);
      const data = await response.json();
      
      if (data?.[0]?.embedUrl) {
        const embedUrl = data[0].embedUrl.replace('streamed.su', 'embedme.top');
        onAddUrl(embedUrl);
      }
    } catch (error) {
      console.error('Error fetching stream:', error);
    }
  };

  const cycleSource = async (url, urlIndex) => {
    // Get the data for this URL from our sourceIndices state
    const urlData = sourceIndices[url];
    
    // If we don't have source data or there are no sources, exit early
    if (!urlData?.match?.sources) {
      console.warn('No source data available for URL:', url);
      return;
    }

  const normalizeMatchTitle = (title) => {
    return title
      .toLowerCase()
      .replace(/\s+vs\s+|\s+v\s+/, ' vs ')
      .replace(/\s+fc\b/g, '')
      .replace(/united/, 'utd')
      .replace(/live$/, '')
      .trim();
  };
  
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
      const uniqueMatches = {};
      
      data.forEach(match => {
        const isLive = match.title.includes('LIVE');
        const cleanTitle = match.title.replace('LIVE', '').trim();
        
        // Keep match with most sources or LIVE status
        if (!uniqueMatches[cleanTitle] || isLive) {
          uniqueMatches[cleanTitle] = {
            ...match,
            id: match.id,
            title: cleanTitle,
            popular: match.popular || isLive,
            isLive: isLive,
            sources: match.sources
          };
        }
      });
      
      // Convert to array and set state
      setMatches(Object.values(uniqueMatches));
    } catch (error) {
      console.error('Error in fetchMatches:', error);
    }
  };

  const MatchItem = ({ match }) => (
    <div
      onClick={() => handleMatchSelect(match)}
      className="match-item"
    >
      <div className="flex items-center">
        <div className="flex-1">
          <div className="text-sm flex items-center justify-between">
            <span>{match.title}</span>
            {match.isLive && (
              <span className="live-badge">LIVE</span>
            )}
          </div>
          {match.teams && (
            <div className="text-xs text-gray-400">
              {match.teams.home?.name} vs {match.teams.away?.name}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const handleToggleSidebar = () => {
    toggleSidebar();
    if (showBrowser) {
      setShowBrowser(false);
    }
  };

  return (
    <>
      <button className="sidebar-toggle" onClick={handleToggleSidebar}>
        {isCollapsed ? '☰' : '←'}
      </button>
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="url-input-group">
          <button 
            onClick={() => {
              setShowBrowser(!showBrowser);
              if (!showBrowser) fetchMatches();
            }}
            className="browse-button"
          >
            {showBrowser ? 'Hide Events' : 'Browse Live Events'}
          </button>
          
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
                <div className="url-text">{formatApiUrl(url)}</div>
                <div className="url-controls">
                  {sourceIndices[url]?.match?.sources?.length > 1 && (
                    <button
                      className="cycle-button"
                      onClick={() => cycleSource(url, index)}
                      title="Try alternate source"
                    >
                      ↻
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
                    className="move-button"
                    onClick={() => moveUrl(index, 'down')}
                    disabled={index === videoUrls.length - 1}
                  >
                    ↓
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
      </div>
    </>
  );
};

export default Sidebar;