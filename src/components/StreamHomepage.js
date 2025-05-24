import React, { useState, useEffect } from 'react';
import { Search, User, Play } from 'lucide-react';

const StreamHomepage = ({ onStreamSelect, onEnterStreamView, matches, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('live-sports'); // Start with sports

  // Mock data for now - will integrate with your real data
  const categories = {
    'live-sports': {
      title: 'Live Sports',
      items: matches.filter(match => match.popular).slice(0, 6)
    },
    'all-sports': {
      title: 'All Sports',
      items: matches.slice(0, 12)
    },
    'movies': {
      title: 'Trending Movies',
      items: [
        { id: 'movie1', title: 'The Last Frontier', genre: 'Action', thumbnail: '/api/placeholder/400/225' },
        { id: 'movie2', title: 'Echoes of the Past', genre: 'Drama', thumbnail: '/api/placeholder/400/225' },
        { id: 'movie3', title: 'City of Dreams', genre: 'Thriller', thumbnail: '/api/placeholder/400/225' },
        { id: 'movie4', title: 'Ocean\'s Edge', genre: 'Adventure', thumbnail: '/api/placeholder/400/225' },
        { id: 'movie5', title: 'Midnight Express', genre: 'Action', thumbnail: '/api/placeholder/400/225' },
        { id: 'movie6', title: 'Silent Valley', genre: 'Mystery', thumbnail: '/api/placeholder/400/225' },
        { id: 'movie7', title: 'Desert Storm', genre: 'War', thumbnail: '/api/placeholder/400/225' },
        { id: 'movie8', title: 'Neon Nights', genre: 'Sci-Fi', thumbnail: '/api/placeholder/400/225' }
      ]
    },
    'tv-shows': {
      title: 'Popular TV Shows',
      items: [
        { id: 'tv1', title: 'The Daily Grind', season: 'Season 2', thumbnail: '/api/placeholder/400/225' },
        { id: 'tv2', title: 'Tech Titans', episode: 'New Episode', thumbnail: '/api/placeholder/400/225' },
        { id: 'tv3', title: 'Culinary Journeys', status: 'Watch Now', thumbnail: '/api/placeholder/400/225' },
        { id: 'tv4', title: 'Urban Legends', season: 'Season 3', thumbnail: '/api/placeholder/400/225' },
        { id: 'tv5', title: 'Space Odyssey', episode: 'Latest', thumbnail: '/api/placeholder/400/225' },
        { id: 'tv6', title: 'Crime Chronicles', season: 'Season 1', thumbnail: '/api/placeholder/400/225' },
        { id: 'tv7', title: 'Mountain Rescue', season: 'Season 4', thumbnail: '/api/placeholder/400/225' },
        { id: 'tv8', title: 'Digital Detectives', episode: 'Finale', thumbnail: '/api/placeholder/400/225' }
      ]
    }
  };

  const handleItemClick = (item, category) => {
    if (category === 'live-sports' || category === 'all-sports') {
      // Handle sports stream
      onStreamSelect(item);
      onEnterStreamView();
    } else {
      // Handle movies/TV shows
      console.log('Selected:', item, 'from', category);
      // Will integrate with your existing movie/TV logic
    }
  };

  const getSportsThumbnail = (match) => {
    // Generate placeholder thumbnails based on sport/match type
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

  return (
    <div className="stream-homepage">
      {/* Header */}
      <header className="homepage-header">
        <div className="header-content">
          <div className="logo">
            <h1>StreamBuddy</h1>
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
            <div className="search-container">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search for games, movies, shows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="user-btn">
              <User size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="homepage-content">
        {/* Featured Section */}
        {activeCategory === 'live-sports' && categories['live-sports'].items.length > 0 && (
          <section className="featured-section">
            <h2>Featured Live Games</h2>
            <div className="featured-grid">
              {categories['live-sports'].items.slice(0, 3).map((match, index) => (
                <div
                  key={match.id}
                  className={`featured-card ${index === 0 ? 'large' : 'small'}`}
                  onClick={() => handleItemClick(match, 'live-sports')}
                >
                  <div className="featured-thumbnail">
                    <div className="sport-icon">{getSportsThumbnail(match)}</div>
                    <div className="live-indicator">● LIVE</div>
                  </div>
                  <div className="featured-info">
                    <h3>{getMatchTitle(match)}</h3>
                    <p>{match.category || 'Sports'}</p>
                  </div>
                  <button className="play-btn">
                    <Play size={24} fill="white" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Movies Featured Section */}
        {activeCategory === 'movies' && (
          <section className="featured-section">
            <h2>Featured Movies</h2>
            <div className="featured-grid">
              {categories['movies'].items.slice(0, 3).map((movie, index) => (
                <div
                  key={movie.id}
                  className={`featured-card ${index === 0 ? 'large' : 'small'}`}
                  onClick={() => handleItemClick(movie, 'movies')}
                >
                  <div className="featured-thumbnail">
                    <div className="sport-icon">🎦</div>
                  </div>
                  <div className="featured-info">
                    <h3>{movie.title}</h3>
                    <p>{movie.genre}</p>
                  </div>
                  <button className="play-btn">
                    <Play size={24} fill="white" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TV Shows Featured Section */}
        {activeCategory === 'tv-shows' && (
          <section className="featured-section">
            <h2>Featured TV Shows</h2>
            <div className="featured-grid">
              {categories['tv-shows'].items.slice(0, 3).map((show, index) => (
                <div
                  key={show.id}
                  className={`featured-card ${index === 0 ? 'large' : 'small'}`}
                  onClick={() => handleItemClick(show, 'tv-shows')}
                >
                  <div className="featured-thumbnail">
                    <div className="sport-icon">📺</div>
                  </div>
                  <div className="featured-info">
                    <h3>{show.title}</h3>
                    <p>{show.season || show.episode || show.status}</p>
                  </div>
                  <button className="play-btn">
                    <Play size={24} fill="white" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category Sections */}
        {Object.entries(categories).map(([categoryKey, category]) => {
          // Show content based on active category
          if (activeCategory === 'live-sports') {
            // For sports, show both live-sports and all-sports
            if (categoryKey !== 'live-sports' && categoryKey !== 'all-sports') return null;
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
                        {categoryKey.includes('sports') ? (
                          <>
                            <div className="sport-icon">{getSportsThumbnail(item)}</div>
                            <div className="live-badge">● LIVE</div>
                          </>
                        ) : categoryKey === 'movies' ? (
                          <>
                            <div className="sport-icon">🎦</div>
                          </>
                        ) : (
                          <>
                            <div className="sport-icon">📺</div>
                          </>
                        )}
                        <div className="card-overlay">
                          <button className="play-button">
                            <Play size={20} fill="white" />
                          </button>
                        </div>
                      </div>
                      <div className="card-info">
                        <h3>{categoryKey.includes('sports') ? getMatchTitle(item) : item.title}</h3>
                        <p>
                          {categoryKey.includes('sports')
                            ? (item.category || 'Sports')
                            : (item.genre || item.season || item.episode || item.status)}
                        </p>
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
    </div>
  );
};

export default StreamHomepage;