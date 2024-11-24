import React, { useState } from 'react';
import debounce from 'lodash/debounce';

const OnDemandBrowser = ({ onAddUrl, onShowMovieDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [contentType, setContentType] = useState('movie');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const TMDB_API_KEY = '76e3744ab1806aa6becb288ebb3d1dc4';
  const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

  const searchTMDB = async (query) => {
    if (!query.trim()) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${TMDB_BASE_URL}/search/${contentType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`
      );

      if (!response.ok) throw new Error('Failed to fetch from TMDB');
      
      const data = await response.json();
      console.log('TMDB Raw Data:', data); // Debug log

      const transformedItems = data.results.map(item => ({
        tmdb: item.id,
        title: item.title || item.name,
        year: (item.release_date || item.first_air_date)?.split('-')[0] || '',
        overview: item.overview,
        posterPath: item.poster_path,
        type: contentType
      }));

      console.log('Transformed Items:', transformedItems); // Debug log
      setItems(transformedItems);
      
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search content. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = debounce(searchTMDB, 500);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleWatchNow = (item) => {
    if (item.type === 'movie') {
      // Add a random parameter to help bypass caching/sandbox checks
      const timestamp = new Date().getTime();
      const embedUrl = `https://vidsrc.xyz/embed/movie/${item.tmdb}?_=${timestamp}`;
      onAddUrl(embedUrl, item);
    } else {
      onShowMovieDetails(item);
    }
  };

  const handleItemClick = (item) => {
    if (onShowMovieDetails) {  // Add a safety check
      onShowMovieDetails(item);
      console.log('Movie details should be showing:', item.title);  // Debug log

    }
  };

  return (
    <div className="matches-container">
      <div className="search-bar-full flex gap-2">
        <select
          value={contentType}
          onChange={(e) => {
            setContentType(e.target.value);
            setItems([]);
            setSearchTerm('');
          }}
          className="match-search w-32"
        >
          <option value="movie">Movies</option>
          <option value="tv">TV Shows</option>
        </select>
        <input
          type="text"
          placeholder={`Search ${contentType === 'movie' ? 'movies' : 'TV shows'}...`}
          value={searchTerm}
          onChange={handleSearch}
          className="match-search flex-1"
        />
      </div>

      <div className="matches-section">
        <div className="match-header">Search Results {items.length > 0 && `(${items.length})`}</div>

        {loading && (
          <div className="matches-list">
            <p>Searching...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-4 text-red-500">
            <p>{error}</p>
          </div>
        )}

        <div className="matches-list">
          {!loading && items.map((item) => (
            <div
              key={item.tmdb}
              onClick={() => handleItemClick(item)}
              className="match-item hover:bg-gray-700 transition-colors duration-200"
            >
              <div className="p-3">
                <span className="font-medium">{item.title}</span>
              </div>
            </div>
          ))}

          {!loading && !error && items.length === 0 && searchTerm && (
            <div className="text-center py-4 text-gray-400">
              <p>No results found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnDemandBrowser;