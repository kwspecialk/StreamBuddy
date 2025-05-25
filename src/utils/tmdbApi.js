// Simplified TMDB API utility without CORS-violating preloading
const TMDB_API_KEY = '76e3744ab1806aa6becb288ebb3d1dc4';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Get optimized image URL with size options
const getOptimizedImageUrl = (path, size = 'w500') => {
  if (!path) return '/api/placeholder/400/600';
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};

export const tmdbApi = {
  // Get trending movies (simplified, no preloading)
  getTrendingMovies: async (timeWindow = 'day') => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/trending/movie/${timeWindow}?api_key=${TMDB_API_KEY}`
      );
      if (!response.ok) throw new Error('Failed to fetch trending movies');
      const data = await response.json();
      
      const movies = data.results.map(movie => ({
        id: movie.id,
        tmdb: movie.id,
        title: movie.title,
        overview: movie.overview,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        releaseDate: movie.release_date,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown',
        rating: movie.vote_average,
        genre: movie.genre_ids?.[0] ? getGenreName(movie.genre_ids[0], 'movie') : 'Unknown',
        type: 'movie',
        thumbnail: getOptimizedImageUrl(movie.poster_path, 'w500')
      }));

      return movies;
    } catch (error) {
      console.error('Error fetching trending movies:', error);
      return [];
    }
  },

  // Get trending TV shows (simplified, no preloading)
  getTrendingTVShows: async (timeWindow = 'day') => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/trending/tv/${timeWindow}?api_key=${TMDB_API_KEY}`
      );
      if (!response.ok) throw new Error('Failed to fetch trending TV shows');
      const data = await response.json();
      
      const shows = data.results.map(show => ({
        id: show.id,
        tmdb: show.id,
        title: show.name,
        overview: show.overview,
        posterPath: show.poster_path,
        backdropPath: show.backdrop_path,
        firstAirDate: show.first_air_date,
        year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'Unknown',
        rating: show.vote_average,
        genre: show.genre_ids?.[0] ? getGenreName(show.genre_ids[0], 'tv') : 'Unknown',
        type: 'tv',
        season: 'Latest Season',
        thumbnail: getOptimizedImageUrl(show.poster_path, 'w500')
      }));

      return shows;
    } catch (error) {
      console.error('Error fetching trending TV shows:', error);
      return [];
    }
  },

  // Get movie details
  getMovieDetails: async (movieId) => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`
      );
      if (!response.ok) throw new Error('Failed to fetch movie details');
      return await response.json();
    } catch (error) {
      console.error('Error fetching movie details:', error);
      return null;
    }
  },

  // Get TV show details
  getTVShowDetails: async (showId) => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}`
      );
      if (!response.ok) throw new Error('Failed to fetch TV show details');
      return await response.json();
    } catch (error) {
      console.error('Error fetching TV show details:', error);
      return null;
    }
  },

  // Search movies and TV shows (simplified)
  searchMulti: async (query) => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      );
      if (!response.ok) throw new Error('Failed to search');
      const data = await response.json();
      
      const results = data.results
        .filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
        .map(item => ({
          id: item.id,
          tmdb: item.id,
          title: item.media_type === 'movie' ? item.title : item.name,
          overview: item.overview,
          posterPath: item.poster_path,
          backdropPath: item.backdrop_path,
          releaseDate: item.media_type === 'movie' ? item.release_date : item.first_air_date,
          year: item.media_type === 'movie' 
            ? (item.release_date ? new Date(item.release_date).getFullYear() : 'Unknown')
            : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'Unknown'),
          rating: item.vote_average,
          type: item.media_type,
          thumbnail: getOptimizedImageUrl(item.poster_path, 'w500')
        }));

      return results;
    } catch (error) {
      console.error('Error searching:', error);
      return [];
    }
  }
};

// Helper function to get genre names
const getGenreName = (genreId, type) => {
  const movieGenres = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
  };

  const tvGenres = {
    10759: 'Action & Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10762: 'Kids',
    9648: 'Mystery',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics',
    37: 'Western'
  };

  const genres = type === 'movie' ? movieGenres : tvGenres;
  return genres[genreId] || 'Unknown';
};

export default tmdbApi;