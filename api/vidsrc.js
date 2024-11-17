import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    // Get the latest content for movies/shows
    const response = await fetch('https://vidsrc.xyz/movies/new', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data to match our expected format
    const transformedData = data.titles?.map(item => ({
      tmdb: item.id,
      title: item.title,
      year: item.year?.toString() || '',
      overview: item.description || '',
      type: item.type // 'movie' or 'show'
    })) || [];

    res.status(200).json(transformedData);
  } catch (error) {
    console.error('VidSrc API error:', error);
    // Return empty array instead of error to prevent UI breaks
    res.status(200).json([]);
  }
}