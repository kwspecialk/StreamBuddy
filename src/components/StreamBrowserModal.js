import React, { useState, useEffect } from 'react';
import { X, Search, Play, Plus } from 'lucide-react';
import { imageCache } from '../utils/imageCache'; // Added for image URLs
import CachedImage from './CachedImage'; // Added for image rendering

const StreamBrowserModal = ({ 
  isOpen, 
  onClose, 
  onAddStream, 
  matches, 
  isLoading, 
  onShowMovieDetails 
}) => {
  const [activeCategory, setActiveCategory] = useState('live-sports');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStreams, setSelectedStreams] = useState([]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedStreams([]);
      setSearchTerm('');
      setActiveCategory('live-sports');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Mock data for movies/TV (you can integrate with your existing data)
  const categories = {
    'live-sports': {
      title: 'Live Sports',
      items: matches.filter(match => match.popular).slice(0, 12)
    },
    'all-sports': {
      title: 'All Sports', 
      items: matches.filter(match => !match.popular).slice(0, 20)
    },
    'movies': {
      title: 'Movies',
      items: [
        { id: 'movie1', title: 'The Last Frontier', genre: 'Action', thumbnail: '/api/placeholder/300/170' },
        { id: 'movie2', title: 'Echoes of the Past', genre: 'Drama', thumbnail: '/api/placeholder/300/170' },
        { id: 'movie3', title: 'City of Dreams', genre: 'Thriller', thumbnail: '/api/placeholder/300/170' },
        { id: 'movie4', title: 'Ocean Edge', genre: 'Adventure', thumbnail: '/api/placeholder/300/170' },
        { id: 'movie5', title: 'Midnight Express', genre: 'Action', thumbnail: '/api/placeholder/300/170' },
        { id: 'movie6', title: 'Silent Valley', genre: 'Mystery', thumbnail: '/api/placeholder/300/170' }
      ]
    },
    'tv-shows': {
      title: 'TV Shows',
      items: [
        { id: 'tv1', title: 'The Daily Grind', season: 'Season 2', thumbnail: '/api/placeholder/300/170' },
        { id: 'tv2', title: 'Tech Titans', episode: 'New Episode', thumbnail: '/api/placeholder/300/170' },
        { id: 'tv3', title: 'Culinary Journeys', status: 'Watch Now', thumbnail: '/api/placeholder/300/170' },
        { id: 'tv4', title: 'Urban Legends', season: 'Season 3', thumbnail: '/api/placeholder/300/170' },
        { id: 'tv5', title: 'Space Odyssey', episode: 'Latest', thumbnail: '/api/placeholder/300/170' },
        { id: 'tv6', title: 'Crime Chronicles', season: 'Season 1', thumbnail: '/api/placeholder/300/170' }
      ]
    }
  };

  const getSportsThumbnail = (match) => {
    const sport = match.title.toLowerCase();
    if (sport.includes('football') || sport.includes('nfl')) return '🏈';
    if (sport.includes('basketball') || sport.includes('nba')) return '🏀';
    if (sport.includes('soccer') || sport.includes('premier')) return '⚽';
    if (sport.includes('tennis')) return '🎾';
    if (sport.includes('baseball')) return '⚾';
    if (sport.includes('hockey')) return '🏒';
    return '🏟️';
  };

  const getMatchTitle = (match) => {
    if (match.teams?.home?.name && match.teams?.away?.name) {
      return `${match.teams.home.name} vs ${match.teams.away.name}`;
    }
    return match.title;
  };

  const handleItemClick = async (item, category) => {
    if (category.includes('sports')) {
      // Handle sports streams
      if (item.sources && item.sources.length > 0) {
        try {
          const source = item.sources[0];
          const response = await fetch(`https://streamed.su/api/stream/${source.source}/${source.id}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data?.[0]?.embedUrl) {
              onAddStream(data[0].embedUrl, item);
              // Add visual feedback
              setSelectedStreams(prev => [...prev, item.id]);
              setTimeout(() => {
                setSelectedStreams(prev => prev.filter(id => id !== item.id));
              }, 2000);
            }
          }
        } catch (error) {
          console.error('Error fetching stream:', error);
        }
      }
    } else {
      // Handle movies/TV shows
      if (category === 'movies') {
        onAddStream(`https://vidsrc.xyz/embed/movie/${item.id}`);
      } else {
        // For TV shows, you might want to show episode selector
        console.log('TV show selected:', item);
      }
      
      setSelectedStreams(prev => [...prev, item.id]);
      setTimeout(() => {
        setSelectedStreams(prev => prev.filter(id => id !== item.id));
      }, 2000);
    }
  };

  const getCurrentItems = () => {
    let items = [];
    
    if (activeCategory === 'live-sports') {
      items = [...categories['live-sports'].items, ...categories['all-sports'].items];
    } else {
      items = categories[activeCategory]?.items || [];
    }

    if (searchTerm) {
      return items.filter(item => {
        const title = activeCategory.includes('sports') ? getMatchTitle(item) : item.title;
        return title.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    return items;
  };

  const currentItems = getCurrentItems();

  return (
    <div className="stream-browser-backdrop">
      <div className="stream-browser-modal">
        {/* Header */}
        <div className="browser-modal-header">
          <div className="header-left">
            <h2>Add Stream</h2>
            <p>Choose content to add to your viewing session</p>
          </div>
          <button className="modal-icon-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <div className="browser-modal-nav">
          <div className="nav-buttons">
            <button 
              className={`nav-btn ${activeCategory === 'live-sports' ? 'active' : ''}`}
              onClick={() => setActiveCategory('live-sports')}
            >
              Live Sports
            </button>
            <button 
              className={`nav-btn ${activeCategory === 'movies' ? 'active' : ''}`}
              onClick={() => setActiveCategory('movies')}
            >
              Movies
            </button>
            <button 
              className={`nav-btn ${activeCategory === 'tv-shows' ? 'active' : ''}`}
              onClick={() => setActiveCategory('tv-shows')}
            >
              TV Shows
            </button>
          </div>
          
          <div className="search-container">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="browser-modal-content">
          {isLoading && currentItems.length === 0 ? (
            <div className="loading-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="browser-card loading">
                  <div className="card-thumbnail loading-shimmer"></div>
                  <div className="card-info">
                    <div className="loading-text loading-shimmer"></div>
                    <div className="loading-text short loading-shimmer"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : currentItems.length > 0 ? (
            <div className="browser-content-grid">
              {currentItems.map((item) => {
                const isSelected = selectedStreams.includes(item.id);
                const isStreamItem = activeCategory.includes('sports');
                
                return (
                  <div 
                    key={item.id} 
                    className={`browser-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleItemClick(item, activeCategory)}
                  >
                    <div className="card-thumbnail">
                      {isStreamItem ? (
                        (() => {
                          const posterUrl = item.poster ? imageCache.getMatchPosterUrl(item.poster) : null;
                          const sportImageUrl = item.category ? imageCache.getSportsImageUrl(item.category) : null;
                          const imageUrl = posterUrl || sportImageUrl;

                          return (
                            <>
                              {imageUrl ? (
                                <CachedImage 
                                  src={imageUrl} 
                                  alt={item.title || 'Sports Event'}
                                  className="modal-card-thumbnail-image" // Specific class for modal card images
                                  fallbackElement={<div className="sport-icon">{getSportsThumbnail(item)}</div>}
                                />
                              ) : (
                                <div className="sport-icon">{getSportsThumbnail(item)}</div>
                              )}
                              <div className="live-badge">● LIVE</div>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <img 
                            src={item.thumbnail} 
                            alt={item.title}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="thumbnail-fallback">
                            <Play size={24} />
                          </div>
                        </>
                      )}
                      
                      <div className="card-overlay">
                        {isSelected ? (
                          <div className="added-indicator">
                            <div className="checkmark">✓</div>
                            <span>Added!</span>
                          </div>
                        ) : (
                          <button className="add-button">
                            <Plus size={20} />
                            <span>Add Stream</span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="card-info">
                      <h3>{isStreamItem ? getMatchTitle(item) : item.title}</h3>
                      <p>
                        {isStreamItem 
                          ? (item.category || 'Sports')
                          : (item.genre || item.season || item.episode || item.status)
                        }
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No results found</h3>
              <p>Try adjusting your search or browse different categories.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="browser-modal-footer">
          <p className="footer-tip">
            💡 Tip: Click any content to instantly add it to your current viewing session
          </p>
        </div>
      </div>
    </div>
  );
};

export default StreamBrowserModal;