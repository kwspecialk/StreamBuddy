import React, { useState, useEffect } from 'react';
import { tmdbApi } from '../utils/tmdbApi';

const DebugHomepage = () => {
  const [status, setStatus] = useState('Loading...');
  const [movies, setMovies] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const testAPI = async () => {
      try {
        setStatus('Testing TMDB API...');
        const testMovies = await tmdbApi.getTrendingMovies('day');
        setMovies(testMovies || []);
        setStatus(`Success! Loaded ${testMovies?.length || 0} movies`);
      } catch (err) {
        setError(err.message);
        setStatus('Failed to load');
      }
    };

    testAPI();
  }, []);

  return (
    <div style={{ padding: '20px', color: 'white', background: '#000', minHeight: '100vh' }}>
      <h1>Debug Homepage</h1>
      <p>Status: {status}</p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      <h2>Sample Movies:</h2>
      {movies.slice(0, 3).map(movie => (
        <div key={movie.id} style={{ margin: '10px 0', padding: '10px', border: '1px solid #333' }}>
          <h3>{movie.title}</h3>
          <p>Year: {movie.year}</p>
          <p>Genre: {movie.genre}</p>
          {movie.thumbnail && (
            <img 
              src={movie.thumbnail} 
              alt={movie.title} 
              style={{ width: '100px', height: '150px', objectFit: 'cover' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'block';
              }}
            />
          )}
          <div style={{ display: 'none' }}>📽️ Image failed to load</div>
        </div>
      ))}
    </div>
  );
};

export default DebugHomepage;