// Test file to verify TMDB integration
import { tmdbApi } from '../src/utils/tmdbApi.js';

const testTMDB = async () => {
  console.log('Testing TMDB API integration...');
  
  try {
    console.log('Fetching trending movies...');
    const movies = await tmdbApi.getTrendingMovies();
    console.log(`✅ Retrieved ${movies.length} trending movies`);
    console.log('Sample movie:', movies[0]?.title);
    
    console.log('Fetching trending TV shows...');
    const tvShows = await tmdbApi.getTrendingTVShows();
    console.log(`✅ Retrieved ${tvShows.length} trending TV shows`);
    console.log('Sample TV show:', tvShows[0]?.title);
    
    console.log('Testing search...');
    const searchResults = await tmdbApi.searchMulti('spider man');
    console.log(`✅ Search returned ${searchResults.length} results`);
    
    console.log('✅ All TMDB tests passed!');
  } catch (error) {
    console.error('❌ TMDB test failed:', error);
  }
};

export { testTMDB };