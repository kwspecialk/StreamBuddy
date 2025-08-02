import React, { useState, useEffect } from 'react';
import { X, Search, Play, Plus } from 'lucide-react';
import { imageCache } from '../utils/imageCache';
import CachedImage from './CachedImage';
import { tmdbApi } from '../utils/tmdbApi'; // Import TMDB API

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
  
  // Enhanced search states (duplicated from StreamHomepage)
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // TMDB data states
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTVShows, setTrendingTVShows] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [tvShowsLoading, setTVShowsLoading] = useState(false);

  // State for custom stream URL popup
  const [isCustomStreamPopupOpen, setIsCustomStreamPopupOpen] = useState(false);
  const [customStreamUrl, setCustomStreamUrl] = useState('');

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedStreams([]);
      setSearchTerm('');
      setActiveCategory('live-sports');
      setSearchResults([]); // Clear search results
      setSearchLoading(false);
      // Load TMDB data when modal opens
      loadTrendingMovies();
      loadTrendingTVShows();
    }
  }, [isOpen]);

  // Enhanced search effect (duplicated from StreamHomepage)
  useEffect(() => {
    if (searchTerm.trim()) {
      handleSearch(searchTerm);
    } else {
      setSearchResults([]);
      setSearchLoading(false);
    }
  }, [searchTerm, activeCategory]); // Re-run when searchTerm OR activeCategory changes

  // Load TMDB data functions
  const loadTrendingMovies = async () => {
    if (trendingMovies.length > 0) return; // Don't reload if already loaded
    
    setMoviesLoading(true);
    try {
      console.log('Loading trending movies...');
      const movies = await tmdbApi.getTrendingMovies('day');
      console.log('Movies loaded:', movies?.length || 0);
      setTrendingMovies(movies || []);
    } catch (error) {
      console.error('Failed to load trending movies:', error);
      setTrendingMovies([]);
    }
    setMoviesLoading(false);
  };

  const loadTrendingTVShows = async () => {
    if (trendingTVShows.length > 0) return; // Don't reload if already loaded
    
    setTVShowsLoading(true);
    try {
      console.log('Loading trending TV shows...');
      const shows = await tmdbApi.getTrendingTVShows('day');
      console.log('TV shows loaded:', shows?.length || 0);
      setTrendingTVShows(shows || []);
    } catch (error) {
      console.error('Failed to load trending TV shows:', error);
      setTrendingTVShows([]);
    }
    setTVShowsLoading(false);
  };

  // Enhanced search function (duplicated from StreamHomepage)
  const handleSearch = async (query) => {
    if (!query.trim()) return;

    setSearchLoading(true);
    let finalResults = [];

    try {
      const queryLower = query.toLowerCase();

      if (activeCategory === 'movies') {
        const allTmdbResults = await tmdbApi.searchMulti(query);
        finalResults = allTmdbResults.filter(item => item.type === 'movie');
      } else if (activeCategory === 'tv-shows') {
        const allTmdbResults = await tmdbApi.searchMulti(query);
        finalResults = allTmdbResults.filter(item => item.type === 'tv');
      } else if (activeCategory === 'live-sports') {
        finalResults = (matches && Array.isArray(matches))
          ? matches.filter(match => {
              const title = getMatchTitle(match)?.toLowerCase() || '';
              const categoryName = match.category?.toLowerCase() || '';
              return title.includes(queryLower) || categoryName.includes(queryLower);
            }).map(sport => ({ ...sport, type: 'sport' }))
          : [];
      } else { // No specific category - search all
        const tmdbResults = await tmdbApi.searchMulti(query);
        const sportsResults = (matches && Array.isArray(matches))
          ? matches.filter(match => {
              const title = getMatchTitle(match)?.toLowerCase() || '';
              const categoryName = match.category?.toLowerCase() || '';
              return title.includes(queryLower) || categoryName.includes(queryLower);
            }).map(sport => ({ ...sport, type: 'sport' }))
          : [];
        finalResults = [...tmdbResults, ...sportsResults];
      }
      setSearchResults(finalResults);
    } catch (error) {
      console.error('Search failed for category:', activeCategory, 'query:', query, error);
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  if (!isOpen) return null;

  const categories = {
    'live-sports': {
      title: 'Live Sports',
      items: searchTerm ? searchResults.filter(item => item.type === 'sport') : (matches && Array.isArray(matches) ? matches.filter(match => match.popular).slice(0, 12) : [])
    },
    'all-sports': {
      title: 'All Sports', 
      items: searchTerm ? searchResults.filter(item => item.type === 'sport') : (matches && Array.isArray(matches) ? matches.filter(match => !match.popular).slice(0, 20) : [])
    },
    'movies': {
      title: 'Trending Movies',
      items: searchTerm ? searchResults.filter(item => item.type === 'movie') : trendingMovies
    },
    'tv-shows': {
      title: 'Popular TV Shows',
      items: searchTerm ? searchResults.filter(item => item.type === 'tv') : trendingTVShows
    }
  };

  // Helper functions from StreamHomepage for consistent styling
  const getTeamBadgeUrl = (badgeId) => {
    return imageCache.getTeamBadgeUrl(badgeId);
  };

  const getSportIcon = (category) => {
    return imageCache.getSportsEmoji(category);
  };

  const getSportFallbackImage = (category) => {
    return imageCache.getSportsImageUrl(category);
  };

  const getMatchPosterUrl = (posterId) => {
    return imageCache.getMatchPosterUrl(posterId);
  };

  const formatSportName = (sport) => {
    const formatted = sport.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Map specific sport names for better display
    if (formatted === 'American Football') return 'Football';
    if (formatted === 'Football' && !sport.includes('american')) return 'Soccer';
    
    return formatted;
  };

  const getSportsThumbnail = (match) => {
    return getSportIcon(match.category || match.title);
  };

  const getMatchTitle = (match) => {
    if (match.teams?.home?.name && match.teams?.away?.name) {
      return `${match.teams.home.name} vs ${match.teams.away.name}`;
    }
    return match.title;
  };

  const handleItemClick = async (item, category) => {
    // Check if it's a sports item (either by category name or item type)
    const isSportsItem = category.includes('sports') || item.type === 'sport';
    
    if (isSportsItem) {
      // Add visual feedback immediately for sports
      setSelectedStreams(prev => [...prev, item.id]);
      
      // Handle sports streams
      if (item.sources && item.sources.length > 0) {
        try {
          const source = item.sources[0];
          const response = await fetch(`https://streamed.pk/api/stream/${source.source}/${source.id}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data?.[0]?.embedUrl) {
              onAddStream(data[0].embedUrl, item);
              
              // Keep the animation for longer for successful streams
              setTimeout(() => {
                setSelectedStreams(prev => prev.filter(id => id !== item.id));
              }, 1500); // Shortened from 2500ms to 1500ms
              return; // Success, keep animation
            }
          }
        } catch (error) {
          console.error('Error fetching stream:', error);
        }
      }
      // If we get here, there was an error - remove animation faster
      setTimeout(() => {
        setSelectedStreams(prev => prev.filter(id => id !== item.id));
      }, 1000);
    } else {
      // Handle movies/TV shows - NO animation here, just open modal
      if (category === 'movies' || item.type === 'movie') {
        // Open movie details modal
        if (onShowMovieDetails) {
          onShowMovieDetails(item);
        }
      } else if (category === 'tv-shows' || item.type === 'tv') {
        // Open TV show details modal for episode selection
        if (onShowMovieDetails) {
          onShowMovieDetails(item);
        }
      }
      // No animation or setTimeout for movies/TV shows
    }
  };

  const getCurrentItems = () => {
    // If searching, return search results filtered by category
    if (searchTerm.trim()) {
      if (activeCategory === 'live-sports') {
        return searchResults.filter(item => item.type === 'sport');
      } else if (activeCategory === 'movies') {
        return searchResults.filter(item => item.type === 'movie');
      } else if (activeCategory === 'tv-shows') {
        return searchResults.filter(item => item.type === 'tv');
      } else {
        return searchResults; // Return all search results if no specific category
      }
    }
    
    // If not searching, return normal category items
    let items = [];
    if (activeCategory === 'live-sports') {
      items = [...categories['live-sports'].items, ...categories['all-sports'].items];
    } else {
      items = categories[activeCategory]?.items || [];
    }
    
    return items;
  };

  const currentItems = getCurrentItems();

  const openCustomStreamPopup = () => setIsCustomStreamPopupOpen(true);
  const closeCustomStreamPopup = () => {
    setIsCustomStreamPopupOpen(false);
    setCustomStreamUrl(''); // Reset URL on close
  };

  const handleSaveCustomStream = () => {
    if (customStreamUrl.trim()) {
      // Create a unique ID for the custom stream for keying and selection purposes
      const streamId = `custom-${Date.now()}`;
      const streamDetails = {
        id: streamId,
        title: 'Custom Stream',
        type: 'custom', // Differentiate from other types
        // Potentially add a generic icon or allow user to name it in a future enhancement
      };
      onAddStream(customStreamUrl.trim(), streamDetails);
      closeCustomStreamPopup();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal__header modal__header--accent">
          <div className="header-left">
            <h2 className="modal__title">Add Stream</h2>
          </div>
          <button className="btn btn--close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <div className="nav nav--tabs">
          <div className="nav__items">
            <button 
              className={`nav__item ${activeCategory === 'live-sports' ? 'nav__item--active' : ''}`}
              onClick={() => setActiveCategory('live-sports')}
            >
              Live Sports
            </button>
            <button 
              className={`nav__item ${activeCategory === 'movies' ? 'nav__item--active' : ''}`}
              onClick={() => setActiveCategory('movies')}
            >
              Movies
            </button>
            <button 
              className={`nav__item ${activeCategory === 'tv-shows' ? 'nav__item--active' : ''}`}
              onClick={() => setActiveCategory('tv-shows')}
            >
              TV Shows
            </button>
          </div>
          
          <div className="search search--inline">
            <Search size={18} className="search__icon" />
            <input 
              type="text" 
              className="search__input"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="modal__content">
          {/* Show search loading if searching */}
          {searchLoading ? (
            <div className="browser-content-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="content-card loading">
                  <div className="card-thumbnail loading-shimmer"></div>
                  <div className="card-info">
                    <div className="loading-text loading-shimmer"></div>
                    <div className="loading-text short loading-shimmer"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : /* Show initial loading for non-search content */
          isLoading && currentItems.length === 0 && !searchTerm ? (
            <div className="browser-content-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="content-card loading">
                  <div className="card-thumbnail loading-shimmer"></div>
                  <div className="card-info">
                    <div className="loading-text loading-shimmer"></div>
                    <div className="loading-text short loading-shimmer"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (moviesLoading && activeCategory === 'movies' && !searchTerm) || (tvShowsLoading && activeCategory === 'tv-shows' && !searchTerm) ? (
            <div className="browser-content-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="content-card loading">
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
                const isStreamItem = activeCategory.includes('sports') || item.type === 'sport';
                
                return (
                  <div 
                    key={item.id} 
                    className={`content-card ${isSelected ? 'selected' : ''} ${isStreamItem ? 'match-card' : ''}`}
                    onClick={() => handleItemClick(item, activeCategory)}
                  >
                    <div className={`card-thumbnail ${isStreamItem ? 'match-thumbnail' : ''}`}>
                      {isStreamItem ? (
                        <>
                          {/* Always try to load sport fallback image first */}
                          <img 
                            src={getSportFallbackImage(item.category)}
                            alt={formatSportName(item.category || 'Sports')}
                            className="sport-background-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                          
                          {/* Fallback to green gradient + emoji if image fails */}
                          <div className="sport-gradient-fallback" style={{ display: 'none' }}>
                            <div className="sport-icon-fallback">
                              {getSportIcon(item.category)}
                            </div>
                          </div>
                          
                          {/* Overlay poster if available */}
                          {item.poster && (
                            <img 
                              src={getMatchPosterUrl(item.poster)}
                              alt={item.title || getMatchTitle(item)}
                              className="match-poster-overlay"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                          
                          {/* Overlay team badges if available - show VS layout whenever teams exist */}
                          {(item.teams?.home?.name || item.teams?.away?.name) && (
                            <div className="team-badges-overlay">
                              {item.teams?.home?.badge ? (
                                <img 
                                  src={getTeamBadgeUrl(item.teams.home.badge)} 
                                  alt={item.teams.home.name}
                                  className="team-badge-overlay home-badge"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : item.teams?.home?.name && (
                                <div className="team-placeholder-overlay home-placeholder">
                                  <span className="team-initial">{item.teams.home.name.charAt(0)}</span>
                                </div>
                              )}
                              
                              {(item.teams?.home?.name && item.teams?.away?.name) && (
                                <div className="vs-divider-overlay">VS</div>
                              )}
                              
                              {item.teams?.away?.badge ? (
                                <img 
                                  src={getTeamBadgeUrl(item.teams.away.badge)} 
                                  alt={item.teams.away.name}
                                  className="team-badge-overlay away-badge"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : item.teams?.away?.name && (
                                <div className="team-placeholder-overlay away-placeholder">
                                  <span className="team-initial">{item.teams.away.name.charAt(0)}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="live-badge pulse">● LIVE</div>
                        </>
                      ) : (
                        <>
                          <CachedImage 
                            src={item.thumbnail}
                            alt={item.title}
                            className="movie-poster"
                            fallbackElement={
                              <div className="thumbnail-fallback">
                                <Play size={24} />
                              </div>
                            }
                          />
                          {item.thumbnail && (
                            <div
                              className="card-blur-bg"
                              style={{ backgroundImage: `url(${item.thumbnail})` }}
                            />
                          )}
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
                            <span>{isStreamItem ? 'Add Stream' : 'Details'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="card-info">
                      <h3>{isStreamItem ? getMatchTitle(item) : item.title}</h3>
                      <p>
                        {isStreamItem 
                          ? formatSportName(item.category || 'Sports')
                          : (item.genre || (item.year ? `${item.year}` : '') || item.season || item.episode || item.status)
                        }
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="modal__empty">
              <h3>{searchTerm ? `No results found for "${searchTerm}"` : 'No content available'}</h3>
              <p>{searchTerm ? 'Try adjusting your search or browse different categories.' : 'Please try again later.'}</p>
            </div>
          )}
        </div>

        {/* Footer for Add Stream button and Tip */}
        <div className="modal__footer">
          <div className="modal__actions">
            <button className="btn btn--secondary" onClick={openCustomStreamPopup}>
              <Plus size={16} /> Custom
            </button>
          </div>
          {currentItems.length > 0 && (
            <div className="footer-tip text-center flex-1">
              <span role="img" aria-label="tip"></span> Tip: Use search to find specific content. Click sports to add instantly. Click movies/shows to see details.
            </div>
          )}
        </div>

        {/* Custom Stream URL Popup */}
        {isCustomStreamPopupOpen && (
          <div className="modal-backdrop" onClick={closeCustomStreamPopup}>
            <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
              <div className="modal__header">
                <h3 className="modal__title">Custom Stream</h3>
                <button className="btn btn--close" onClick={closeCustomStreamPopup}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal__content">
                <p>Enter the direct URL to a stream (e.g., .m3u8, .mpd).</p>
                <input
                  type="text"
                  className="form__input"
                  placeholder="https://..."
                  value={customStreamUrl}
                  onChange={(e) => setCustomStreamUrl(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal__footer">
                <div className="modal__actions">
                  <button className="btn btn--secondary" onClick={closeCustomStreamPopup}>Cancel</button>
                  <button className="btn btn--primary" onClick={handleSaveCustomStream}>Save Stream</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamBrowserModal;