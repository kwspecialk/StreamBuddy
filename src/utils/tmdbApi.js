// Simplified TMDB API utility without CORS-violating preloading
const TMDB_API_KEY = '76e3744ab1806aa6becb288ebb3d1dc4';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Curated rows: raw trending is global and includes unreleased or barely-rated titles
const CURATED_PAGES = 3;
const CURATED_MIN_VOTES = 100;
// Non-English titles drop this many places, so big hits stay visible but don't dominate
const NON_ENGLISH_RANK_PENALTY = 12;

// Get optimized image URL with size options
const getOptimizedImageUrl = (path, size = 'w500') => {
  if (!path) return '/api/placeholder/400/600';
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};

const mapMovie = (movie) => ({
  id: movie.id,
  tmdb: movie.id,
  title: movie.title,
  overview: movie.overview,
  posterPath: movie.poster_path,
  backdropPath: movie.backdrop_path,
  releaseDate: movie.release_date,
  year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown',
  rating: movie.vote_average,
  voteCount: movie.vote_count,
  genre: movie.genre_ids?.[0] ? getGenreName(movie.genre_ids[0], 'movie') : 'Unknown',
  type: 'movie',
  thumbnail: getOptimizedImageUrl(movie.poster_path, 'w500'),
  backdrop: movie.backdrop_path ? getOptimizedImageUrl(movie.backdrop_path, 'w780') : null
});

const mapTVShow = (show) => ({
  id: show.id,
  tmdb: show.id,
  title: show.name,
  overview: show.overview,
  posterPath: show.poster_path,
  backdropPath: show.backdrop_path,
  firstAirDate: show.first_air_date,
  year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'Unknown',
  rating: show.vote_average,
  voteCount: show.vote_count,
  genre: show.genre_ids?.[0] ? getGenreName(show.genre_ids[0], 'tv') : 'Unknown',
  type: 'tv',
  season: 'Latest Season',
  thumbnail: getOptimizedImageUrl(show.poster_path, 'w500'),
  backdrop: show.backdrop_path ? getOptimizedImageUrl(show.backdrop_path, 'w780') : null
});

// Filter raw TMDB trending results and re-rank them, keeping trending order otherwise
export const curateTrending = (results, today = new Date().toISOString().slice(0, 10)) => {
  const seen = new Set();
  return results
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      const date = item.release_date || item.first_air_date;
      return date && date <= today && item.poster_path && item.vote_count >= CURATED_MIN_VOTES;
    })
    .map((item, index) => ({
      item,
      rank: index + (item.original_language === 'en' ? 0 : NON_ENGLISH_RANK_PENALTY)
    }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
};

const fetchTrendingPages = async (mediaType) => {
  const pages = await Promise.all(
    Array.from({ length: CURATED_PAGES }, async (_, index) => {
      const response = await fetch(
        `${TMDB_BASE_URL}/trending/${mediaType}/week?api_key=${TMDB_API_KEY}&page=${index + 1}`
      );
      if (!response.ok) throw new Error(`Failed to fetch trending ${mediaType}`);
      return (await response.json()).results;
    })
  );
  return pages.flat();
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
      
      const movies = data.results.map(mapMovie);

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
      
      const shows = data.results.map(mapTVShow);

      return shows;
    } catch (error) {
      console.error('Error fetching trending TV shows:', error);
      return [];
    }
  },

  // Get this week's trending movies, curated for the browse rows
  getCuratedMovies: async () => {
    try {
      return curateTrending(await fetchTrendingPages('movie')).map(mapMovie);
    } catch (error) {
      console.error('Error fetching curated movies:', error);
      return [];
    }
  },

  // Get this week's trending TV shows, curated for the browse rows
  getCuratedTVShows: async () => {
    try {
      return curateTrending(await fetchTrendingPages('tv')).map(mapTVShow);
    } catch (error) {
      console.error('Error fetching curated TV shows:', error);
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

  // Get season details
  getSeasonDetails: async (showId, seasonNumber) => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`
      );
      if (!response.ok) {
        // Season doesn't exist
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching season details:', error);
      return null;
    }
  },

  // Check if a specific episode exists
  checkEpisodeExists: async (showId, seasonNumber, episodeNumber) => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/tv/${showId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${TMDB_API_KEY}`
      );
      return response.ok;
    } catch (error) {
      console.error('Error checking episode existence:', error);
      return false;
    }
  },

  // Get the next available episode (with season jumping)
  getNextEpisode: async (showId, currentSeason, currentEpisode) => {
    try {
      // First try next episode in current season
      const nextEpisode = currentEpisode + 1;
      const episodeExists = await tmdbApi.checkEpisodeExists(showId, currentSeason, nextEpisode);
      
      if (episodeExists) {
        return {
          season: currentSeason,
          episode: nextEpisode,
          found: true
        };
      }
      
      // If next episode doesn't exist, try first episode of next season
      const nextSeason = currentSeason + 1;
      const nextSeasonExists = await tmdbApi.checkEpisodeExists(showId, nextSeason, 1);
      
      if (nextSeasonExists) {
        return {
          season: nextSeason,
          episode: 1,
          found: true
        };
      }
      
      // No more episodes available
      return {
        season: currentSeason,
        episode: currentEpisode,
        found: false
      };
    } catch (error) {
      console.error('Error finding next episode:', error);
      return {
        season: currentSeason,
        episode: currentEpisode,
        found: false
      };
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
          thumbnail: getOptimizedImageUrl(item.poster_path, 'w500'),
          backdrop: item.backdrop_path ? getOptimizedImageUrl(item.backdrop_path, 'w780') : null
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