import React, { useState, useEffect, useRef } from 'react';

const MovieDetailsModal = ({ movieDetails, onClose, onPlayStream }) => {
  const [streamError, setStreamError] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddedAnimation, setShowAddedAnimation] = useState(false);
  const posterContainerRef = useRef(null);

  const TMDB_API_KEY = '76e3744ab1806aa6becb288ebb3d1dc4';

  // Effect to set the background image for the ::before pseudo-element
  useEffect(() => {
    if (posterContainerRef.current && movieDetails?.posterPath) {
      const backgroundPosterUrl = `https://image.tmdb.org/t/p/w780${movieDetails.posterPath}`;
      posterContainerRef.current.style.setProperty('--poster-bg-url', `url(${backgroundPosterUrl})`);
    } else if (posterContainerRef.current) {
      // Clear the property if no posterPath to prevent showing old image
      posterContainerRef.current.style.removeProperty('--poster-bg-url');
    }
  }, [movieDetails?.posterPath]);

  useEffect(() => {
    if (movieDetails.type === 'tv') {
      fetchSeasons();
    }
  }, [movieDetails.type, movieDetails.tmdb]); // Added movieDetails.type for safety

  useEffect(() => {
    if (movieDetails.type === 'tv' && selectedSeason) {
      fetchEpisodes();
    }
  }, [selectedSeason, movieDetails.tmdb]); // Added movieDetails.tmdb for safety if modal reuses for different TV show

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.themoviedb.org/3/tv/${movieDetails.tmdb}?api_key=${TMDB_API_KEY}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch show details');
      
      const data = await response.json();
      const filteredSeasons = data.seasons.filter(season => season.season_number > 0);
      setSeasons(filteredSeasons);
      setLoading(false);
    } catch (err) {
      setError('Failed to load seasons');
      setLoading(false);
    }
  };

  const fetchEpisodes = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.themoviedb.org/3/tv/${movieDetails.tmdb}/season/${selectedSeason}?api_key=${TMDB_API_KEY}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch episodes');
      
      const data = await response.json();
      setEpisodes(data.episodes);
      // Set first episode as default when loading new season
      setSelectedEpisode(data.episodes[0]?.episode_number || 1);
      setLoading(false);
    } catch (err) {
      setError('Failed to load episodes');
      setLoading(false);
    }
  };

  const handleWatchNow = async () => {
    setStreamError(null); // Clear previous error

    let streamUrlToPlay;
    let streamDetailsToPass;

    if (movieDetails.type === 'movie') {
      streamUrlToPlay = `https://vidsrc.xyz/embed/movie/${movieDetails.tmdb}`;
      streamDetailsToPass = movieDetails;
    } else { // TV Show
      const season = selectedSeason || 1;
      const episode = selectedEpisode || 1;
      streamUrlToPlay = `https://vidsrc.xyz/embed/tv/${movieDetails.tmdb}/${season}-${episode}`;
      streamDetailsToPass = {
        ...movieDetails,
        title: `${movieDetails.title} S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`
      };
    }

    if (onPlayStream) {
      // Show animation immediately
      setShowAddedAnimation(true);
      
      // onPlayStream is App.js's handleStreamSelect, which is async and returns a boolean
      const success = await onPlayStream(streamUrlToPlay, streamDetailsToPass);
      if (success) {
        // Keep animation for a moment, then close modal
        setTimeout(() => {
          onClose(); // Close modal after successful add
        }, 1500);
      } else {
        // Hide animation on error
        setShowAddedAnimation(false);
        setStreamError('Stream not available for this selection. Please try another title or check back later.');
      }
    } else {
      // Fallback or error if onPlayStream is not provided (should not happen in normal flow)
      setStreamError('Playback function not available.');
      console.error('onPlayStream prop is not defined in MovieDetailsModal');
    }
  };

  return (
    <div 
      className="movie-details-backdrop" 
      onClick={onClose}
    >
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}
      >
        <div className="movie-details">
          {movieDetails.posterPath && (
            <div className="movie-backdrop" style={{
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.9)), url(https://image.tmdb.org/t/p/w1280${movieDetails.posterPath})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '300px',
              zIndex: 0
            }}/>
          )}
          
          <div className="movie-content">
            <div className="movie-poster" ref={posterContainerRef}>
              <img 
                src={`https://image.tmdb.org/t/p/w300${movieDetails.posterPath}`}
                alt={movieDetails.title}
              />
            </div>
            
            <div className="movie-info">
              <h1>{movieDetails.title}</h1>
              <div className="movie-meta">
                <span className="year">{movieDetails.year}</span>
                <span className="badge">{movieDetails.type === 'movie' ? 'Movie' : 'TV Series'}</span>
              </div>
              
              <p className="overview">{movieDetails.overview}</p>

              {movieDetails.type === 'tv' && (
                <div className="episode-selector">
                  {loading ? (
                    <div className="text-center py-4">Loading...</div>
                  ) : error ? (
                    <div className="text-red-500 text-center py-4">{error}</div>
                  ) : (
                    <div className="selectors-container">
                      <div className="flex space-x-4">
                        <div className="flex-1">
                          <label className="block text-gray-400 mb-2">Season</label>
                          <select
                            value={selectedSeason}
                            onChange={(e) => setSelectedSeason(Number(e.target.value))}
                            className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 hover:border-gray-600 transition-colors"
                          >
                            {seasons.map(season => (
                              <option key={season.season_number} value={season.season_number}>
                                Season {season.season_number}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-gray-400 mb-2">Episode</label>
                          <select
                            value={selectedEpisode || ''}
                            onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                            className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 hover:border-gray-600 transition-colors"
                          >
                            {episodes.map(episode => (
                              <option 
                                key={episode.episode_number} 
                                value={episode.episode_number}
                                title={episode.name}
                              >
                                {episode.episode_number}. {episode.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {selectedEpisode && episodes.find(ep => ep.episode_number === selectedEpisode)?.overview && (
                        <div className="mt-4 text-gray-400 text-sm">
                          {episodes.find(ep => ep.episode_number === selectedEpisode).overview}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="action-buttons mt-4">
                <button
                  className="watch-now-btn"
                  onClick={handleWatchNow}
                  disabled={showAddedAnimation}
                >
                  Watch Now
                  {movieDetails.type === 'tv' && !selectedEpisode && " (S1:E1)"}
                </button>
                <button
                  className="close-btn"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
              
              {/* Added Animation Overlay */}
              {showAddedAnimation && (
                <div className="movie-added-overlay">
                  <div className="movie-added-indicator">
                    <div className="movie-checkmark">✓</div>
                    <span>Added to Stream!</span>
                  </div>
                </div>
              )}
              
              {streamError && (
                <div className="stream-error-message" style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>
                  {streamError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetailsModal;