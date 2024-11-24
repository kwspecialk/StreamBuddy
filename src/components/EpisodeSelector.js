import React, { useState, useEffect } from 'react';

const EpisodeSelector = ({ show, onSelectEpisode, onClose }) => {
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const TMDB_API_KEY = '76e3744ab1806aa6becb288ebb3d1dc4';

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://api.themoviedb.org/3/tv/${show.tmdb}?api_key=${TMDB_API_KEY}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch show details');
        
        const data = await response.json();
        setSeasons(data.seasons.filter(season => season.season_number > 0));
        setLoading(false);
      } catch (err) {
        setError('Failed to load seasons');
        setLoading(false);
      }
    };

    fetchSeasons();
  }, [show.tmdb]);

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://api.themoviedb.org/3/tv/${show.tmdb}/season/${selectedSeason}?api_key=${TMDB_API_KEY}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch episodes');
        
        const data = await response.json();
        setEpisodes(data.episodes);
        setLoading(false);
      } catch (err) {
        setError('Failed to load episodes');
        setLoading(false);
      }
    };

    if (selectedSeason) {
      fetchEpisodes();
    }
  }, [show.tmdb, selectedSeason]);

  const handleEpisodeSelect = (episodeNumber) => {
    const embedUrl = `https://vidsrc.xyz/embed/tv/${show.tmdb}/${selectedSeason}-${episodeNumber}`;
    onSelectEpisode(embedUrl);
    onClose();
  };

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          width: '400px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : error ? (
          <div className="p-6">
            <div className="text-red-500 text-center mb-4">{error}</div>
            <button 
              onClick={onClose}
              className="w-full bg-gray-600 text-white p-2 rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold">{show.title}</h2>
              {show.year && <div className="text-sm text-gray-400">({show.year})</div>}
            </div>
            
            <div className="p-4 border-b border-gray-700">
              <select
                className="w-full p-2 bg-gray-800 rounded text-white"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
              >
                {seasons.map(season => (
                  <option key={season.season_number} value={season.season_number}>
                    Season {season.season_number}
                  </option>
                ))}
              </select>
            </div>

            <div 
              className="flex-1 overflow-y-auto p-4"
              style={{ maxHeight: '50vh' }}
            >
              <div className="grid grid-cols-4 gap-2">
                {episodes.map(episode => (
                  <button
                    key={episode.episode_number}
                    onClick={() => handleEpisodeSelect(episode.episode_number)}
                    className="p-2 text-center bg-gray-800 rounded hover:bg-gray-700 transition-colors text-white"
                    title={episode.name}
                  >
                    {episode.episode_number}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-700">
              <button 
                onClick={onClose}
                className="w-full bg-gray-600 text-white p-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EpisodeSelector;