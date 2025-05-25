import React, { useState, useEffect } from 'react';
import { Search, User, Play } from 'lucide-react';
import { tmdbApi } from '../utils/tmdbApi';
import { imageCache } from '../utils/imageCache';
import MovieDetailsModal from './MovieDetailsModal';
import CachedImage from './CachedImage';

const StreamHomepage = ({ onStreamSelect, onEnterStreamView, matches, isLoading, onAddUrl }) => {
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
  
  // Modal states
  const [selectedMovieDetails, setSelectedMovieDetails] = useState(null);
  const [showMovieModal, setShowMovieModal] = useState(false);

  // Load TMDB data on component mount
  useEffect(() => {
    loadTrendingMovies();
    loadTrendingTVShows();
  }, []);

  // Handle search
  useEffect(() => {
    if (searchTerm.trim()) {
      handleSearch(searchTerm);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

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
    try {
      const results = await tmdbApi.searchMulti(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
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
    if (category === 'live-sports' || category === 'all-sports') {
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
  
  return (
    <div className="stream-homepage">
      {/* Header */}
      <header className="homepage-header">
        <div className="header-content">
          <div className="logo">
            <h1 onClick={() => setActiveCategory('home')} style={{ cursor: 'pointer' }}>StreamBuddy</h1>
          </div>

          <nav className="main-nav">
            <button
              className={`nav-btn ${activeCategory === 'live-sports' ? 'active' : ''}`}
              onClick={() => setActiveCategory('live-sports')}
            >
              Sports
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
          </nav>

          <div className="header-actions">
            {activeCategory !== 'home' && (
              <div className="search-container">
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Search for games, movies, shows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
            <button className="user-btn">
              <User size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="homepage-content">
        {/* Home Page */}
        {activeCategory === 'home' && (
          <>
            {/* Hero Section with Search */}
            <section className="hero-section">
              <div className="hero-content">
                <h1 className="hero-title">Watch Live Sports, Movies & TV Shows</h1>
                <p className="hero-subtitle">Stream your favorite content all in one place</p>
                
                <div className="hero-search">
                  <Search size={24} />
                  <input
                    type="text"
                    placeholder="Search for live games, movies, TV shows..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="hero-search-input"
                  />
                </div>
              </div>
            </section>

            {/* Live Events Section */}
            {matches && matches.length > 0 && (
              <section className="content-section">
                <div className="section-header">
                  <h2>🔴 Live Now</h2>
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
                <h2>🎬 Featured Movies</h2>
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
                <h2>📺 Popular TV Shows</h2>
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
                      
                      {/* Match title overlay */}
                      <div className="match-title-overlay">
                        <h3>{getMatchTitle(match)}</h3>
                        <p>{formatSportName(match.category || 'Sports')}</p>
                      </div>
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