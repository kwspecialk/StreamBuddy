import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Play, ArrowLeft, Maximize, Minimize, HelpCircle, Radio, ClapperboardIcon, TvIcon } from 'lucide-react';
import { tmdbApi } from '../utils/tmdbApi';
import { imageCache } from '../utils/imageCache';
import MovieDetailsModal from './MovieDetailsModal';
import CachedImage from './CachedImage';

const StreamHomepage = ({ onStreamSelect, onEnterStreamView, matches, isLoading, onAddUrl, onShowQuickstartWizard }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('home'); // Start with home
  const [selectedSport, setSelectedSport] = useState('all'); // For sports filtering
  
  // TMDB data states
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTVShows, setTrendingTVShows] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [tvShowsLoading, setTVShowsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null); // Ref for the HERO search input
  const persistentSearchInputRef = useRef(null); // Ref for the search input visible with results
  
  // Modal states
  const [selectedMovieDetails, setSelectedMovieDetails] = useState(null);
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveCategory('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoClick = () => {
    setSearchTerm('');
    setActiveCategory('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Ensure focus is removed from any search input if it had focus
    if (persistentSearchInputRef.current) persistentSearchInputRef.current.blur();
    if (searchInputRef.current) searchInputRef.current.blur();
  };

  const handleCategoryChange = (category) => {
    console.log(`handleCategoryChange: Clicked category: ${category}, Current activeCategory: ${activeCategory}, Current searchTerm: '${searchTerm}'`);
    if (searchTerm.trim() && category === activeCategory && category !== 'home') {
      // Active search, clicked current filter tab (not 'home') again: un-filter by setting category to 'home' for general search.
      // Search term remains, useEffect will trigger a general search.
      console.log('handleCategoryChange: Un-filtering. Setting activeCategory to home.');
      setActiveCategory('home');
    } else {
      // Standard category change, or clicking 'home', or no active search.
      console.log(`handleCategoryChange: Standard change. Setting activeCategory to: ${category}`);
      setActiveCategory(category);
      if (category === 'home' || !searchTerm.trim()) {
        // Clear search if changing to 'home' or if no search was active initially.
        setSearchTerm('');
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load TMDB data on component mount
  useEffect(() => {
    loadTrendingMovies();
    loadTrendingTVShows();
  }, []);

  // Handle search
  useEffect(() => {
    console.log(`Search useEffect: searchTerm: '${searchTerm}', activeCategory: ${activeCategory}`);
    if (searchTerm.trim()) {
      handleSearch(searchTerm); // Perform the search based on current searchTerm and activeCategory
      // If the persistent search input exists (meaning search results are shown), focus it.
      if (persistentSearchInputRef.current) {
        persistentSearchInputRef.current.focus();
      }
    } else {
      // Only clear search results if not transitioning between categories during an active search
      // This check might be redundant if handleCategoryChange handles it, but good for safety.
      if (activeCategory === 'home') { 
        setSearchResults([]); // Clear results if search term is empty and we are on home
      }
    }
  }, [searchTerm, activeCategory]); // Re-run when searchTerm OR activeCategory changes

  const loadTrendingMovies = async () => {
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
      } else if (activeCategory === 'live-sports' || activeCategory === 'all-sports') {
        finalResults = (matches && Array.isArray(matches))
          ? matches.filter(match => {
              const title = getMatchTitle(match)?.toLowerCase() || '';
              const categoryName = match.category?.toLowerCase() || '';
              return title.includes(queryLower) || categoryName.includes(queryLower);
            }).map(sport => ({ ...sport, type: 'sport' })) // Ensure sports items also have a 'type'
          : [];
      } else { // Home tab or general search (no specific category active or it's 'home')
        const tmdbResults = await tmdbApi.searchMulti(query);
        const sportsResults = (matches && Array.isArray(matches))
          ? matches.filter(match => {
              const title = getMatchTitle(match)?.toLowerCase() || '';
              const categoryName = match.category?.toLowerCase() || '';
              return title.includes(queryLower) || categoryName.includes(queryLower);
            }).map(sport => ({ ...sport, type: 'sport' })) // Ensure sports items also have a 'type'
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

  // Dynamic categories using real TMDB data
  const categories = {
    'live-sports': {
      title: 'Live Sports',
      items: (matches && Array.isArray(matches)) ? matches.filter(match => match.popular).slice(0, 6) : []
    },
    'all-sports': {
      title: 'All Sports',
      items: (matches && Array.isArray(matches)) ? matches.slice(0, 12) : []
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

  const handleItemClick = (item, category) => {
    if (category === 'live-sports' || category === 'all-sports' || category === 'sport') {
      // Handle sports stream
      onStreamSelect(item);
      onEnterStreamView();
    } else {
      // Handle movies/TV shows - open modal
      console.log('Opening modal for:', item);
      setSelectedMovieDetails(item);
      setShowMovieModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowMovieModal(false);
    setSelectedMovieDetails(null);
  };

  // Legacy function - keeping for backward compatibility  
  const getSportsThumbnail = (match) => {
    return getSportIcon(match.category || match.title);
  };

  const getMatchTitle = (match) => {
    if (match.teams?.home?.name && match.teams?.away?.name) {
      return `${match.teams.home.name} vs ${match.teams.away.name}`;
    }
    return match.title;
  };

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

  // Get unique sports from matches for filtering
  const getAvailableSports = () => {
    const sportsSet = new Set();
    if (matches && Array.isArray(matches)) {
      matches.forEach(match => {
        if (match.category) {
          sportsSet.add(match.category);
        }
      });
    }
    return Array.from(sportsSet).sort();
  };

  // Filter matches by sport for Sports tab
  const getFilteredMatches = () => {
    if (!matches || !Array.isArray(matches)) {
      return [];
    }
    if (selectedSport === 'all') {
      return matches;
    }
    return matches.filter(match => match.category === selectedSport);
  };

  // Get IDs of featured matches to exclude them from main sections
  const getFeaturedMatchIds = () => {
    const filtered = getFilteredMatches();
    return filtered.slice(0, 3).map(match => match.id);
  };

  // Get filtered matches excluding featured ones for main sections
  const getMainSectionMatches = () => {
    const filtered = getFilteredMatches();
    const featuredIds = filtered.slice(0, 3).map(match => match.id);
    return filtered.filter(match => !featuredIds.includes(match.id));
  };

  // Debug: log the matches data (remove in production)
  // console.log('StreamHomepage - matches:', matches);
  // console.log('StreamHomepage - matches length:', matches?.length);
  // console.log('StreamHomepage - isLoading:', isLoading);
  // console.log('StreamHomepage - selectedSport:', selectedSport);
  // console.log('StreamHomepage - getFilteredMatches():', getFilteredMatches());

  const renderTmdbCard = (item, type) => (
    <div
      key={`${type}-${item.id}`}
      className="content-card"
      onClick={() => handleItemClick(item, type)}
    >
      <div className="card-thumbnail">
        {item.thumbnail && (
          <div
            className="card-blur-bg"
            style={{ backgroundImage: `url(${item.thumbnail})` }}
          />
        )}
        <CachedImage 
          src={item.thumbnail}
          alt={item.title}
          className="movie-poster" // Assuming 'movie-poster' class works for both
          fallbackElement={<div className="sport-icon" style={{ display: 'flex' }}>{type === 'movie' ? '🎦' : '📺'}</div>}
        />
        <div className="card-overlay">
          {/* Add play button or other elements if desired for search results */}
        </div>
      </div>
      <div className="card-info">
        <h3>{item.title}</h3>
        <p>{item.genre || (item.first_air_date ? new Date(item.first_air_date).getFullYear() : '')}{item.year ? ` • ${item.year}` : ''}</p>
      </div>
    </div>
  );

  const renderSportCard = (item, categoryKey) => (
    <div
      key={`sport-${item.id}`}
      className="content-card match-card"
      onClick={() => handleItemClick(item, categoryKey)} 
    >
      <div className="card-thumbnail match-thumbnail">
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
        
        {/* Overlay team badges if available */}
        {(item.teams?.home?.badge || item.teams?.away?.badge) && (
          <div className="team-badges-overlay">
            {item.teams.home?.badge ? (
              <img 
                src={getTeamBadgeUrl(item.teams.home.badge)} 
                alt={item.teams.home.name}
                className="team-badge-overlay home-badge"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : item.teams.home?.name && (
              <div className="team-placeholder-overlay home-placeholder">
                <span className="team-initial">{item.teams.home.name.charAt(0)}</span>
              </div>
            )}
            <div className="vs-divider-overlay">VS</div>
            {item.teams.away?.badge ? (
              <img 
                src={getTeamBadgeUrl(item.teams.away.badge)} 
                alt={item.teams.away.name}
                className="team-badge-overlay away-badge"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : item.teams.away?.name && (
              <div className="team-placeholder-overlay away-placeholder">
                <span className="team-initial">{item.teams.away.name.charAt(0)}</span>
              </div>
            )}
          </div>
        )}
        
        <div className="live-badge pulse">● LIVE</div>
        <div className="card-overlay">
          <button className="play-button">
            <Play size={20} fill="white" />
          </button>
        </div>
      </div>
      <div className="card-info">
        <h3>{getMatchTitle(item)}</h3>
        <p>{formatSportName(item.category || 'Sports')}</p>
      </div>
    </div>
  );

const renderSearchResultsSection = () => {
if (searchLoading) {
  return <div className="loading-indicator" style={{ textAlign: 'center', color: 'white', padding: '20px', fontSize: '1.2em' }}>Searching...</div>;
}
if (!searchResults.length && searchTerm.trim()) {
  return <div className="no-results" style={{ textAlign: 'center', color: 'white', padding: '20px', fontSize: '1.2em' }}>No results found for "{searchTerm}".</div>;
}
if (!searchTerm.trim()) { // Should not happen if this section is rendered, but as a safeguard
    return null;
}

return (
  <section className="content-section search-results-section">
    <div style={{ marginLeft: '20px', marginRight: '20px', marginTop:'20px', marginBottom: '10px' }}>
      <span onClick={handleClearSearch} className="return-home-link" title="Return Home">
        <ArrowLeft size={22} style={{ marginRight: '5px' }} /> Return Home
      </span>
    </div>
    <h2 className="category-title" style={{ color: 'white', marginLeft: '20px', marginBottom: '20px', marginTop:'0px' }}>Search Results for "{searchTerm}"</h2>
    <div className="content-grid">
      {searchResults.map(item => {
        if (item.type === 'movie' || item.type === 'tv') {
          // For TMDB items, pass 'movie' or 'tv' as the second arg to handleItemClick
          return renderTmdbCard(item, item.type === 'movie' ? 'movies' : 'tv-shows');
        } else if (item.type === 'sport') {
          // For sport items, pass 'sport' as the second arg to handleItemClick
          return renderSportCard(item, 'sport'); 
        }
        return null;
      })}
    </div>
  </section>
);
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
      console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }
};

return (
  <div className="stream-homepage">
    {/* Header */}
    <header className="header header--sticky">
      <div className="header__content">
        <div className="header__logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <h1><img src="/logo.png" alt="StreamBuddy Logo" style={{ height: '32px', verticalAlign: 'middle' }} /></h1>
        </div>

        <div className="header__nav">
          <div className="header-right">
            <nav className="nav nav--horizontal">
            <button
              className={`nav__item ${activeCategory === 'live-sports' ? 'nav__item--active' : ''}`}
              onClick={() => handleCategoryChange('live-sports')}
            >
              Sports
            </button>
            <button
              className={`nav__item ${activeCategory === 'movies' ? 'nav__item--active' : ''}`}
              onClick={() => handleCategoryChange('movies')}
            >
              Movies
            </button>
            <button
              className={`nav__item ${activeCategory === 'tv-shows' ? 'nav__item--active' : ''}`}
              onClick={() => handleCategoryChange('tv-shows')}
            >
              TV Shows
            </button>
            <button
              className="nav__item nav__item--highlight"
              onClick={onEnterStreamView}
            >
              Player
            </button>
          </nav>
          </div>
          
          {/* Mobile: Search in navigation row */}
          <div className="search search--header search--mobile">
            <Search size={16} className="search__icon" />
            <input
              type="text"
              className="search__input"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="header__actions">
            {/* Search bar - DESKTOP ONLY */}
            <div className="search search--header header__actions--desktop">
              <Search size={20} className="search__icon" />
              <input
                type="text"
                className="search__input"
                placeholder="Search "
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={toggleFullscreen} className="btn btn--icon header__actions--desktop" title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            {onShowQuickstartWizard && (
              <button onClick={onShowQuickstartWizard} className="btn btn--icon btn--help header__actions--desktop" title="Show Quick Tour">
                <HelpCircle size={20} />
              </button>
            )}
            <button className="btn btn--icon btn--user header__actions--desktop">
              <User size={24} />
            </button>
          </div>
        </div>
      </div>
    </header>

    {/* Main Content */}
    <main className="homepage-content">
      {searchTerm.trim() ? (
        <>
          <div className="persistent-search-container">
            <Search size={24} />
            <input
              ref={persistentSearchInputRef}
              type="text"
              placeholder="Search for live games, movies, TV shows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="persistent-search-input" // Similar to hero-search-input but can be distinct
            />
          </div>
          {renderSearchResultsSection()}
        </>
      ) : (
        <> {/* Wrapper for original content when not searching */}
          {/* Home Page */}
          {activeCategory === 'home' && (
            <>
              {/* Hero Section with Search */}
              <section className="hero-section">
                <div className="hero-content">
                  <h1 className="hero-title">Your New Home for Streaming</h1>
                  <p className="hero-subtitle">Sports. Movies. TV. Don't miss a moment</p>
                  
                  <div className="hero-search" ref={searchInputRef}>
                    <Search size={24} />
                    <input
                      className="hero-search-input"
                      type="text"
                      placeholder="Search for live games, movies, TV shows..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
            </section>

            {/* Live Events Section */}
            {matches && matches.length > 0 && (
              <section className="content-section">
                <div className="section-header">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Radio size={24} /> Live Now
                  </h2>
                  <button 
                    className="see-all-btn"
                    onClick={() => setActiveCategory('live-sports')}
                  >
                    See All Sports
                  </button>
                </div>
                <div className="content-grid">
                  {matches && Array.isArray(matches) ? matches.slice(0, 6).map((match) => (
                    <div
                      key={match.id}
                      className="content-card match-card"
                      onClick={() => handleItemClick(match, 'live-sports')}
                    >
                      <div className="card-thumbnail match-thumbnail">
                        {/* Always try to load sport fallback image first */}
                        <img 
                          src={getSportFallbackImage(match.category)}
                          alt={formatSportName(match.category || 'Sports')}
                          className="sport-background-image"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        
                        {/* Fallback to green gradient + emoji if image fails */}
                        <div className="sport-gradient-fallback" style={{ display: 'none' }}>
                          <div className="sport-icon-fallback">
                            {getSportIcon(match.category)}
                          </div>
                        </div>
                        
                        {/* Overlay poster if available */}
                        {match.poster && (
                          <img 
                            src={getMatchPosterUrl(match.poster)}
                            alt={match.title}
                            className="match-poster-overlay"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        
                        {/* Overlay team badges if available */}
                        {(match.teams?.home?.badge || match.teams?.away?.badge) && (
                          <div className="team-badges-overlay">
                            {match.teams.home?.badge ? (
                              <img 
                                src={getTeamBadgeUrl(match.teams.home.badge)} 
                                alt={match.teams.home.name}
                                className="team-badge-overlay home-badge"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : match.teams.home?.name && (
                              <div className="team-placeholder-overlay home-placeholder">
                                <span className="team-initial">
                                  {match.teams.home.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            
                            <div className="vs-divider-overlay">VS</div>
                            
                            {match.teams.away?.badge ? (
                              <img 
                                src={getTeamBadgeUrl(match.teams.away.badge)} 
                                alt={match.teams.away.name}
                                className="team-badge-overlay away-badge"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : match.teams.away?.name && (
                              <div className="team-placeholder-overlay away-placeholder">
                                <span className="team-initial">
                                  {match.teams.away.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="live-badge pulse">● LIVE</div>
                        <div className="card-overlay">
                          <button className="play-button">
                            <Play size={20} fill="white" />
                          </button>
                        </div>
                      </div>
                      <div className="card-info">
                        <h3>{getMatchTitle(match)}</h3>
                        <p>{formatSportName(match.category || 'Sports')}</p>
                      </div>
                    </div>
                  )) : (
                    <div style={{ color: 'white', padding: '20px', textAlign: 'center' }}>
                      No matches available
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Featured Movies */}
            <section className="content-section">
              <div className="section-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClapperboardIcon size={24} /> Featured Movies
                </h2>
                <button 
                  className="see-all-btn"
                  onClick={() => setActiveCategory('movies')}
                >
                  See All Movies
                </button>
              </div>
              <div className="content-grid">
                {moviesLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="content-card loading">
                      <div className="card-thumbnail loading-shimmer"></div>
                      <div className="card-info">
                        <div className="loading-text loading-shimmer"></div>
                        <div className="loading-text short loading-shimmer"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  categories['movies'].items.slice(0, 6).map((movie) => (
                    <div
                      key={movie.id}
                      className="content-card"
                      onClick={() => handleItemClick(movie, 'movies')}
                    >
                      <div className="card-thumbnail">
                        {movie.thumbnail && (
                          <div
                            className="card-blur-bg"
                            style={{ backgroundImage: `url(${movie.thumbnail})` }}
                          />
                        )}
                        <CachedImage 
                          src={movie.thumbnail}
                          alt={movie.title}
                          className="movie-poster"
                          fallbackElement={<div className="sport-icon" style={{ display: 'flex' }}>🎦</div>}
                        />
                        <div className="card-overlay">
                        </div>
                      </div>
                      <div className="card-info">
                        <h3>{movie.title}</h3>
                        <p>{movie.genre} • {movie.year}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Featured TV Shows */}
            <section className="content-section">
              <div className="section-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TvIcon size={24} /> Featured Shows
                  </h2>
                <button 
                  className="see-all-btn"
                  onClick={() => setActiveCategory('tv-shows')}
                >
                  See All Shows
                </button>
              </div>
              <div className="content-grid">
                {tvShowsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="content-card loading">
                      <div className="card-thumbnail loading-shimmer"></div>
                      <div className="card-info">
                        <div className="loading-text loading-shimmer"></div>
                        <div className="loading-text short loading-shimmer"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  categories['tv-shows'].items.slice(0, 6).map((show) => (
                    <div
                      key={show.id}
                      className="content-card"
                      onClick={() => handleItemClick(show, 'tv-shows')}
                    >
                      <div className="card-thumbnail">
                        <CachedImage 
                          src={show.thumbnail}
                          alt={show.title}
                          className="movie-poster portrait"
                          fallbackElement={<div className="sport-icon" style={{ display: 'flex' }}>📺</div>}
                        />
                        {show.thumbnail && (
                          <div
                            className="card-blur-bg"
                            style={{ backgroundImage: `url(${show.thumbnail})` }}
                          />
                        )}
                        <div className="card-overlay">
                        </div>
                      </div>
                      <div className="card-info">
                        <h3>{show.title}</h3>
                        <p>{show.genre} • {show.year}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
        {/* Featured Section - Sports Tab with Filter */}
        {activeCategory === 'live-sports' && (
          <>
            {/* Sport Filter */}
            <section className="sport-filter-section">
              <div className="sport-filter-container">
                <h2>Filter by Sport</h2>
                <div className="sport-filter-buttons">
                  <button
                    className={`sport-filter-btn ${selectedSport === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedSport('all')}
                  >
                    All Sports
                  </button>
                  {getAvailableSports().map((sport) => (
                    <button
                      key={sport}
                      className={`sport-filter-btn ${selectedSport === sport ? 'active' : ''}`}
                      onClick={() => setSelectedSport(sport)}
                    >
                      {formatSportName(sport)}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Featured Live Games */}
            <section className="featured-section">
              <h2>Featured Live Games</h2>
              
              <div className="featured-grid">
                {getFilteredMatches().length > 0 ? (
                  getFilteredMatches().slice(0, 3).map((match, index) => (
                  <div
                    key={match.id}
                    className="featured-card"
                    onClick={() => handleItemClick(match, 'live-sports')}
                  >
                    <div className="featured-thumbnail">
                        {/* Always try to load sport fallback image first */}
                        <img 
                          src={getSportFallbackImage(match.category)}
                          alt={formatSportName(match.category || 'Sports')}
                          className="sport-background-image featured-background"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        
                        {/* Fallback to green gradient + emoji if image fails */}
                        <div className="sport-gradient-fallback featured-gradient-fallback" style={{ display: 'none' }}>
                          <div className="sport-icon-fallback">
                            {getSportIcon(match.category)}
                          </div>
                        </div>
                        
                        {/* Overlay poster if available */}
                        {match.poster && (
                          <img 
                            src={getMatchPosterUrl(match.poster)}
                            alt={match.title}
                            className="match-poster-overlay featured-poster-overlay"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        
                        {/* Overlay team badges if available */}
                        {(match.teams?.home?.badge || match.teams?.away?.badge) && (
                          <div className="team-badges-overlay featured-badges-overlay">
                            {match.teams.home?.badge ? (
                              <img 
                                src={getTeamBadgeUrl(match.teams.home.badge)} 
                                alt={match.teams.home.name}
                                className="team-badge-overlay featured-team-badge"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : match.teams.home?.name && (
                              <div className="team-placeholder-overlay featured-placeholder">
                                <span className="team-initial featured-initial">
                                  {match.teams.home.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            
                            <div className="vs-divider-overlay featured-vs">VS</div>
                            
                            {match.teams.away?.badge ? (
                              <img 
                                src={getTeamBadgeUrl(match.teams.away.badge)} 
                                alt={match.teams.away.name}
                                className="team-badge-overlay featured-team-badge"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : match.teams.away?.name && (
                              <div className="team-placeholder-overlay featured-placeholder">
                                <span className="team-initial featured-initial">
                                  {match.teams.away.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      <div className="live-indicator">● LIVE</div>
                    </div>
                    
                    {/* Match title overlay - moved outside of featured-thumbnail */}
                    <div className="match-title-overlay">
                      <h3>{getMatchTitle(match)}</h3>
                      <p>{formatSportName(match.category || 'Sports')}</p>
                    </div>
                    
                    <button className="play-btn">
                      <Play size={24} fill="white" />
                    </button>
                  </div>
                ))
                ) : (
                  <div style={{ color: 'white', padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                    <h3>No Live Games Available</h3>
                    <p>
                      {isLoading ? 'Loading matches...' : 'No matches found'}<br/>
                      <small>Total matches available: {matches?.length || 0}</small><br/>
                      <small>Filtered matches: {getFilteredMatches()?.length || 0}</small>
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* Movies Featured Section */}
        {activeCategory === 'movies' && (
          <section className="featured-section">
            <h2>Featured Movies</h2>
            <div className="featured-grid">
              {moviesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="featured-card loading">
                    <div className="featured-thumbnail loading-shimmer"></div>
                    <div className="featured-info">
                      <div className="loading-text loading-shimmer"></div>
                      <div className="loading-text short loading-shimmer"></div>
                    </div>
                  </div>
                ))
              ) : (
                categories['movies'].items.slice(0, 3).map((movie, index) => (
                  <div
                    key={movie.id}
                    className="featured-card"
                    onClick={() => handleItemClick(movie, 'movies')}
                  >
                    <div className="featured-thumbnail">
                      <CachedImage 
                        src={movie.thumbnail}
                        alt={movie.title}
                        className="featured-movie-poster"
                        fallbackElement={<div className="sport-icon" style={{ display: 'flex' }}>🎦</div>}
                      />
                      </div>
                    <div className="featured-info">
                      <h3>{movie.title}</h3>
                      <p>{movie.genre} • {movie.year}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* TV Shows Featured Section */}
        {activeCategory === 'tv-shows' && (
          <section className="featured-section">
            <h2>Featured TV Shows</h2>
            <div className="featured-grid">
              {tvShowsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="featured-card loading">
                    <div className="featured-thumbnail loading-shimmer"></div>
                    <div className="featured-info">
                      <div className="loading-text loading-shimmer"></div>
                      <div className="loading-text short loading-shimmer"></div>
                    </div>
                  </div>
                ))
              ) : (
                categories['tv-shows'].items.slice(0, 3).map((show, index) => (
                  <div
                    key={show.id}
                    className="featured-card"
                    onClick={() => handleItemClick(show, 'tv-shows')}
                  >
                    <div className="featured-thumbnail">
                      <CachedImage 
                        src={show.thumbnail}
                        alt={show.title}
                        className="featured-movie-poster"
                        fallbackElement={<div className="sport-icon" style={{ display: 'flex' }}>📺</div>}
                      />
                    </div>
                    <div className="featured-info">
                      <h3>{show.title}</h3>
                      <p>{show.genre} • {show.year}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Category Sections */}
        {Object.entries(categories).map(([categoryKey, category]) => {
          // Show content based on active category
          if (activeCategory === 'live-sports') {
            // For sports, only show all-sports section with filtered data
            if (categoryKey !== 'all-sports') return null;
            
            const items = getMainSectionMatches().filter(item =>
              searchTerm === '' || getMatchTitle(item).toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            if (items.length === 0 && !isLoading) return null;

            return (
              <section key={categoryKey} className="content-section">
                <div className="section-header">
                  <h2>{selectedSport === 'all' ? 'All Live Sports' : `${formatSportName(selectedSport)} - Live`}</h2>
                  {items.length > 6 && (
                    <button className="see-all-btn">See All</button>
                  )}
                </div>

                {isLoading && items.length === 0 ? (
                  <div className="loading-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="content-card loading">
                        <div className="card-thumbnail loading-shimmer"></div>
                        <div className="card-info">
                          <div className="loading-text loading-shimmer"></div>
                          <div className="loading-text short loading-shimmer"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="content-grid">
                    {items.slice(0, 12).map((item) => (
                      <div
                        key={item.id}
                        className="content-card match-card"
                        onClick={() => handleItemClick(item, categoryKey)}
                      >
                        <div className="card-thumbnail match-thumbnail">
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
                                alt={item.title}
                                className="match-poster-overlay"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            
                            {/* Overlay team badges if available */}
                            {(item.teams?.home?.badge || item.teams?.away?.badge) && (
                              <div className="team-badges-overlay">
                                {item.teams.home?.badge ? (
                                  <img 
                                    src={getTeamBadgeUrl(item.teams.home.badge)} 
                                    alt={item.teams.home.name}
                                    className="team-badge-overlay"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextElementSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : item.teams.home?.name && (
                                  <div className="team-placeholder-overlay">
                                    <span className="team-initial">
                                      {item.teams.home.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                
                                <div className="vs-divider-overlay">VS</div>
                                
                                {item.teams.away?.badge ? (
                                  <img 
                                    src={getTeamBadgeUrl(item.teams.away.badge)} 
                                    alt={item.teams.away.name}
                                    className="team-badge-overlay"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextElementSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : item.teams.away?.name && (
                                  <div className="team-placeholder-overlay">
                                    <span className="team-initial">
                                      {item.teams.away.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          <div className="live-badge">● LIVE</div>
                          <div className="card-overlay">
                            <button className="play-button">
                              <Play size={20} fill="white" />
                            </button>
                          </div>
                        </div>
                        <div className="card-info">
                          <h3>{getMatchTitle(item)}</h3>
                          <p>{formatSportName(item.category || 'Sports')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          } else {
            // For movies/tv-shows, only show the matching category
            if (categoryKey !== activeCategory) return null;
          }

          const items = categoryKey.includes('sports')
            ? category.items.filter(item =>
                searchTerm === '' || getMatchTitle(item).toLowerCase().includes(searchTerm.toLowerCase())
              )
            : category.items.filter(item =>
                searchTerm === '' || item.title.toLowerCase().includes(searchTerm.toLowerCase())
              );

          if (items.length === 0 && !isLoading) return null;

          return (
            <section key={categoryKey} className="content-section">
              <div className="section-header">
                <h2>{category.title}</h2>
                {items.length > 6 && (
                  <button className="see-all-btn">See All</button>
                )}
              </div>

              {isLoading && items.length === 0 ? (
                <div className="loading-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="content-card loading">
                      <div className="card-thumbnail loading-shimmer"></div>
                      <div className="card-info">
                        <div className="loading-text loading-shimmer"></div>
                        <div className="loading-text short loading-shimmer"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="content-grid">
                  {items.slice(0, 12).map((item) => (
                    <div
                      key={item.id}
                      className="content-card"
                      onClick={() => handleItemClick(item, categoryKey)}
                    >
                      <div className="card-thumbnail">
                        {categoryKey === 'movies' ? (
                          <>
                            <CachedImage 
                              src={item.thumbnail}
                              alt={item.title}
                              className="movie-poster"
                              fallbackElement={<div className="sport-icon" style={{ display: 'flex' }}>🎦</div>}
                            />
                            {item.thumbnail && (
                              <div
                                className="card-blur-bg"
                                style={{ backgroundImage: `url(${item.thumbnail})` }}
                              />
                            )}
                          </>
                        ) : (
                          <>
                            <CachedImage 
                              src={item.thumbnail}
                              alt={item.title}
                              className="movie-poster"
                              fallbackElement={<div className="sport-icon" style={{ display: 'flex' }}>📺</div>}
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
                        
                        </div>
                      </div>
                      <div className="card-info">
                        <h3>{item.title}</h3>
                        <p>{item.genre || item.season || item.episode || item.status} {item.year && `• ${item.year}`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* Empty State */}
        {searchTerm && Object.values(categories).every((cat) =>
          cat.items.filter((item) =>
            (item.title || getMatchTitle(item)).toLowerCase().includes(searchTerm.toLowerCase())
          ).length === 0
        ) && (
          <div className="empty-state">
            <h3>No results found for "{searchTerm}"</h3>
            <p>Try searching for something else or browse our categories above.</p>
          </div>
        )}
          </> /* End of wrapper for original content when not searching */
        )}
      </main>
      
      {/* Movie Details Modal */}
      {showMovieModal && selectedMovieDetails && (
        <MovieDetailsModal
          movieDetails={selectedMovieDetails}
          onClose={handleCloseModal}
          onPlayStream={onStreamSelect}
        />
      )}
    </div>
  );
};

export default StreamHomepage;