import React, { useState, useEffect, useCallback } from 'react';
import { Search, Play, ArrowLeft, Maximize, Minimize, Film, Tv, Trophy } from 'lucide-react';
import { tmdbApi } from '../utils/tmdbApi';
import { imageCache } from '../utils/imageCache';
import MovieDetailsModal from './MovieDetailsModal';
import CachedImage from './CachedImage';
import { MatchStatusBadge, MatchInfo } from './MatchScore';
import { clickableProps } from '../utils/a11y';
import { canFullscreenPage } from '../deviceProfile';

const GRID_PREVIEW_COUNT = 8;

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
  const [expandedSections, setExpandedSections] = useState({});
  
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

  const getMatchTitle = useCallback((match) => {
    if (match.teams?.home?.name && match.teams?.away?.name) {
      return `${match.teams.home.name} vs ${match.teams.away.name}`;
    }
    return match.title;
  }, []);

  const handleSearch = useCallback(async (query) => {
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
  }, [activeCategory, matches, getMatchTitle]);

  // Handle search
  useEffect(() => {
    console.log(`Search useEffect: searchTerm: '${searchTerm}', activeCategory: ${activeCategory}`);
    if (searchTerm.trim()) {
      handleSearch(searchTerm); // Perform the search based on current searchTerm and activeCategory
    } else {
      // Only clear search results if not transitioning between categories during an active search
      // This check might be redundant if handleCategoryChange handles it, but good for safety.
      if (activeCategory === 'home') { 
        setSearchResults([]); // Clear results if search term is empty and we are on home
      }
    }
  }, [searchTerm, activeCategory, handleSearch]); // Re-run when searchTerm, activeCategory, or handleSearch changes

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
      title: 'Trending movies',
      items: searchTerm ? searchResults.filter(item => item.type === 'movie') : trendingMovies
    },
    'tv-shows': {
      title: 'Popular TV shows',
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

  const getTeamBadgeUrl = (badgeId) => {
    return imageCache.getTeamBadgeUrl(badgeId);
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

  const getTmdbMeta = (item) => (
    [item.genre || (item.type === 'tv' ? 'TV Series' : 'Movie'), item.year]
      .filter(value => value && value !== 'Unknown')
      .join(', ')
  );

  const getMatchMeta = (match) => {
    const watching = match.viewers >= 1000
      ? `${(match.viewers / 1000).toFixed(1)}k watching`
      : match.viewers > 0 && `${match.viewers} watching`;

    return [formatSportName(match.category || 'Sports'), watching].filter(Boolean).join(', ');
  };

  const renderTmdbCard = (item, type) => (
    <div
      key={`${type}-${item.id}`}
      className="content-card"
      {...clickableProps(() => handleItemClick(item, type), `${item.title} details`)}
    >
      <div className="card-thumbnail card-thumbnail--landscape">
        <CachedImage
          src={item.backdrop || item.thumbnail}
          alt={item.title}
          className="card-backdrop"
          fallbackElement={<div className="sport-icon" style={{ display: 'flex' }}>{type === 'movies' ? <Film size={32} /> : <Tv size={32} />}</div>}
        />
      </div>
      <div className="card-info">
        <h3>{item.title}</h3>
        <p>{getTmdbMeta(item)}</p>
      </div>
    </div>
  );

  const renderFeaturedTmdbCard = (item, type) => (
    <div
      key={item.id}
      className="featured-card"
      {...clickableProps(() => handleItemClick(item, type), `${item.title} details`)}
    >
      <div className="featured-thumbnail">
        <CachedImage
          src={item.backdrop || item.thumbnail}
          alt={item.title}
          className="featured-movie-poster"
          fallbackElement={<div className="sport-icon" style={{ display: 'flex' }}>{type === 'movies' ? <Film size={32} /> : <Tv size={32} />}</div>}
        />
      </div>
      <div className="featured-info">
        <h3>{item.title}</h3>
        <p>{getTmdbMeta(item)}</p>
      </div>
    </div>
  );

  const renderSeeAllToggle = (categoryKey, itemCount) => {
    if (itemCount <= GRID_PREVIEW_COUNT) return null;

    const isExpanded = expandedSections[categoryKey];
    return (
      <button
        className="see-all-btn"
        aria-expanded={!!isExpanded}
        onClick={() => setExpandedSections(prev => ({ ...prev, [categoryKey]: !isExpanded }))}
      >
        {isExpanded ? 'Show less' : `See all (${itemCount})`}
      </button>
    );
  };

  // Lead with a live game, or a trending title when nothing is on
  const spotlightMatch = matches?.find(match => match.popular) || matches?.[0];
  const spotlightTitle = trendingMovies[0];
  const liveNowMatches = (matches || []).filter(match => match !== spotlightMatch).slice(0, GRID_PREVIEW_COUNT);

  const renderSpotlight = () => {
    if (spotlightMatch) {
      const title = getMatchTitle(spotlightMatch);
      const image = spotlightMatch.poster
        ? getMatchPosterUrl(spotlightMatch.poster)
        : getSportFallbackImage(spotlightMatch.category);
      const fallbackImage = getSportFallbackImage(spotlightMatch.category);
      const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = fallbackImage;
      };

      return (
        <section
          className="spotlight"
          {...clickableProps(() => handleItemClick(spotlightMatch, 'live-sports'), `Watch ${title}`)}
        >
          <img src={image} alt="" className="spotlight__art" onError={handleImageError} />
          <div className="spotlight__content">
            <MatchStatusBadge match={spotlightMatch} className="spotlight__label spotlight__label--live" />
            <h2>{title}</h2>
            <p>{getMatchMeta(spotlightMatch)}</p>
            <span className="btn btn--primary btn--lg"><Play size={18} fill="currentColor" /> Watch now</span>
          </div>
        </section>
      );
    }

    if (spotlightTitle) {
      return (
        <section
          className="spotlight"
          {...clickableProps(() => handleItemClick(spotlightTitle, 'movies'), `${spotlightTitle.title} details`)}
        >
          <img src={spotlightTitle.backdrop || spotlightTitle.thumbnail} alt="" className="spotlight__art" />
          <div className="spotlight__content">
            <span className="spotlight__label">Trending today</span>
            <h2>{spotlightTitle.title}</h2>
            <p>{getTmdbMeta(spotlightTitle)}</p>
            <span className="btn btn--primary btn--lg"><Play size={18} fill="currentColor" /> View details</span>
          </div>
        </section>
      );
    }

    return <section className="spotlight loading-shimmer" aria-hidden="true" />;
  };

  const renderSportCard = (item, categoryKey) => (
    <div
      key={`sport-${item.id}`}
      className="content-card match-card"
      {...clickableProps(() => handleItemClick(item, categoryKey), `Watch ${getMatchTitle(item)}`)}
    >
      <div className="card-thumbnail match-thumbnail">
        {/* Always try to load sport fallback image first */}
        {!item.poster && (
        <img 
          src={getSportFallbackImage(item.category)}
          alt={formatSportName(item.category || 'Sports')}
          className="sport-background-image"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'flex';
          }}
        />
        )}
        
        {/* Fallback to green gradient + emoji if image fails */}
        <div className="sport-gradient-fallback" style={{ display: 'none' }}>
          <div className="sport-icon-fallback">
            <Trophy size={32} />
          </div>
        </div>
        
        {/* Overlay poster if available */}
        {item.poster && (
          <img 
            src={getMatchPosterUrl(item.poster)}
            alt={item.title || getMatchTitle(item)}
            className="match-poster-overlay"
            onError={(e) => {
  e.target.style.display = 'none';
  e.target.previousElementSibling.style.display = 'flex';
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
        
        <MatchStatusBadge match={item} className="live-badge" />
        <div className="card-overlay">
          <button className="play-button" tabIndex={-1} aria-hidden="true">
            <Play size={20} fill="white" />
          </button>
        </div>
      </div>
      <div className="card-info">
        <MatchInfo match={item} title={getMatchTitle(item)} sport={getMatchMeta(item)} />
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
    <div style={{ marginTop: '20px', marginBottom: '10px' }}>
      <button onClick={handleClearSearch} className="return-home-link">
        <ArrowLeft size={22} style={{ marginRight: '5px' }} /> Return Home
      </button>
    </div>
    <h2 className="category-title" style={{ color: 'white', marginBottom: '20px', marginTop: '0px' }}>Search Results for "{searchTerm}"</h2>
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
        <div className="header__logo" {...clickableProps(handleLogoClick, 'StreamBuddy home')}>
          <img src="/logo.png" alt="StreamBuddy" style={{ height: '32px', verticalAlign: 'middle' }} />
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
              className="nav__item"
              onClick={onEnterStreamView}
            >
              Player
            </button>
          </nav>
          </div>
          
          {/* Mobile: Search in navigation row */}
          <div className="search search--header search--mobile">
            <Search size={16} strokeWidth={1.75} className="search__icon" />
            <input
              type="text"
              className="search__input"
              placeholder="Search"
              aria-label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="header__actions">
            {/* Search bar - DESKTOP ONLY */}
            <div className="search search--header header__actions--desktop">
              <Search size={16} strokeWidth={1.75} className="search__icon" />
              <input
                type="text"
                className="search__input"
                placeholder="Search"
                aria-label="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {canFullscreenPage && <button
              onClick={toggleFullscreen}
              className="icon-btn header__actions--desktop"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize size={18} strokeWidth={1.75} /> : <Maximize size={18} strokeWidth={1.75} />}
            </button>}
          </div>
        </div>
      </div>
    </header>

    {/* Main Content */}
    <main className="homepage-content">
      <h1 className="sr-only">StreamBuddy: live sports, movies and TV</h1>
      {searchTerm.trim() ? (
        <>
          {renderSearchResultsSection()}
        </>
      ) : (
        <> {/* Wrapper for original content when not searching */}
          {/* Home Page */}
          {activeCategory === 'home' && (
            <>
              {renderSpotlight()}

            {/* Live Events Section */}
            {liveNowMatches.length > 0 && (
              <section className="content-section">
                <div className="section-header">
                  <h2>Live now</h2>
                  <button 
                    className="see-all-btn"
                    onClick={() => setActiveCategory('live-sports')}
                  >
                    See all sports
                  </button>
                </div>
                <div className="content-grid">
                  {liveNowMatches.map((match) => renderSportCard(match, 'live-sports'))}
                </div>
              </section>
            )}

            {/* Featured movies */}
            <section className="content-section">
              <div className="section-header">
                <h2>Featured movies</h2>
                <button 
                  className="see-all-btn"
                  onClick={() => setActiveCategory('movies')}
                >
                  See all movies
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
                  categories['movies'].items.slice(0, GRID_PREVIEW_COUNT).map((movie) => renderTmdbCard(movie, 'movies'))
                )}
              </div>
            </section>

            {/* Featured TV shows */}
            <section className="content-section">
              <div className="section-header">
              <h2>Featured shows</h2>
                <button 
                  className="see-all-btn"
                  onClick={() => setActiveCategory('tv-shows')}
                >
                  See all shows
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
                  categories['tv-shows'].items.slice(0, GRID_PREVIEW_COUNT).map((show) => renderTmdbCard(show, 'tv-shows'))
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
                <h2>Filter by sport</h2>
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

            {/* Featured live games */}
            <section className="featured-section">
              <h2>Featured live games</h2>
              
              <div className="featured-grid">
                {getFilteredMatches().length > 0 ? (
                  getFilteredMatches().slice(0, 3).map((match, index) => (
                  <div
                    key={match.id}
                    className="featured-card"
                    {...clickableProps(() => handleItemClick(match, 'live-sports'), `Watch ${getMatchTitle(match)}`)}
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
                            <Trophy size={32} />
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
                      <MatchStatusBadge match={match} className="live-indicator" />
                    </div>
                    
                    {/* Match title overlay - moved outside of featured-thumbnail */}
                    <div className="match-title-overlay">
                      <MatchInfo match={match} title={getMatchTitle(match)} sport={getMatchMeta(match)} />
                    </div>
                    
                    <button className="play-btn" tabIndex={-1} aria-hidden="true">
                      <Play size={24} fill="white" />
                    </button>
                  </div>
                ))
                ) : (
                  <div className="empty-panel">
                    <h3>{isLoading ? 'Loading live games...' : 'No live games right now'}</h3>
                    {!isLoading && <p>Check back soon, or browse movies and TV shows.</p>}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* Movies Featured Section */}
        {activeCategory === 'movies' && (
          <section className="featured-section">
            <h2>Featured movies</h2>
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
                categories['movies'].items.slice(0, 3).map((movie) => renderFeaturedTmdbCard(movie, 'movies'))
              )}
            </div>
          </section>
        )}

        {/* TV Shows Featured Section */}
        {activeCategory === 'tv-shows' && (
          <section className="featured-section">
            <h2>Featured TV shows</h2>
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
                categories['tv-shows'].items.slice(0, 3).map((show) => renderFeaturedTmdbCard(show, 'tv-shows'))
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
            
            const items = getMainSectionMatches();
            const visibleItems = expandedSections[categoryKey] ? items : items.slice(0, GRID_PREVIEW_COUNT);

            if (items.length === 0 && !isLoading) return null;

            return (
              <section key={categoryKey} className="content-section">
                <div className="section-header">
                  <h2>{selectedSport === 'all' ? 'All live sports' : `${formatSportName(selectedSport)} - Live`}</h2>
                  {renderSeeAllToggle(categoryKey, items.length)}
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
                    {visibleItems.map((item) => renderSportCard(item, categoryKey))}
                  </div>
                )}
              </section>
            );
          } else {
            // For movies/tv-shows, only show the matching category
            if (categoryKey !== activeCategory) return null;
          }

          // The first three are already in the featured row
          const items = category.items.slice(3);
          const visibleItems = expandedSections[categoryKey] ? items : items.slice(0, GRID_PREVIEW_COUNT);

          if (items.length === 0 && !isLoading) return null;

          return (
            <section key={categoryKey} className="content-section">
              <div className="section-header">
                <h2>{category.title}</h2>
                {renderSeeAllToggle(categoryKey, items.length)}
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
                  {visibleItems.map((item) => renderTmdbCard(item, categoryKey))}
                </div>
              )}
            </section>
          );
        })}

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