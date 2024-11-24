import React, { useState, useEffect } from 'react';

const MovieDetailsModal = ({ movieDetails, onClose, onAddUrl }) => {
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const TMDB_API_KEY = '76e3744ab1806aa6becb288ebb3d1dc4';

  useEffect(() => {
    if (movieDetails.type === 'tv') {
      fetchSeasons();
    }
  }, [movieDetails.tmdb]);

  useEffect(() => {
    if (movieDetails.type === 'tv' && selectedSeason) {
      fetchEpisodes();
    }
  }, [selectedSeason]);

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

  const handleWatchNow = () => {
    if (movieDetails.type === 'movie') {
      onAddUrl(`https://vidsrc.xyz/embed/movie/${movieDetails.tmdb}`, movieDetails);
    } else {
      const season = selectedSeason || 1;
      const episode = selectedEpisode || 1;
      onAddUrl(
        `https://vidsrc.xyz/embed/tv/${movieDetails.tmdb}/${season}-${episode}`,
        {
          ...movieDetails,
          title: `${movieDetails.title} S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`
        }
      );
    }
    onClose();
  };

  return (
    <div 
      className="modal-backdrop" 
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
            <div className="movie-poster">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetailsModal;