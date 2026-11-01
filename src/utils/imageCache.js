// Simplified image cache utility without CORS-violating preloading

// Sports image mappings
const SPORTS_IMAGE_MAP = {
  'soccer': '/images/sports/soccer.jpg',
  'football': '/images/sports/soccer.jpg', // Non-American football
  'american-football': '/images/sports/football.jpg',
  'basketball': '/images/sports/basketball.jpg',
  'tennis': '/images/sports/tennis.jpg',
  'baseball': '/images/sports/baseball.jpg',
  'hockey': '/images/sports/hockey.jpg',
  'golf': '/images/sports/golf.jpg',
  'cricket': '/images/sports/cricket.jpg',
  'rugby': '/images/sports/rugby.jpg',
  'motor-sports': '/images/sports/racing.jpg',
  'motorsports': '/images/sports/racing.jpg',
  'racing': '/images/sports/racing.jpg',
  'combat-sports': '/images/sports/fight.jpg',
  'boxing': '/images/sports/fight.jpg',
  'mma': '/images/sports/fight.jpg',
  'fight': '/images/sports/fight.jpg',
  'darts': '/images/sports/darts.jpg',
  'generic': '/images/sports/generic.jpg'
};

// Sports emoji fallbacks
const SPORTS_EMOJI_MAP = {
  'soccer': '⚽',
  'football': '⚽',
  'american-football': '🏈',
  'basketball': '🏀',
  'tennis': '🎾',
  'baseball': '⚾',
  'hockey': '🏒',
  'golf': '⛳',
  'rugby': '🏉',
  'motor-sports': '🏁',
  'motorsports': '🏁',
  'racing': '🏁',
  'combat-sports': '🥊',
  'boxing': '🥊',
  'mma': '🥊',
  'fighting': '🥊',
  'darts': '🎯',
  'generic': '🏟️'
};

export const imageCache = {
  // Get optimized sports image URL
  getSportsImageUrl: (category) => {
    const normalizedCategory = category?.toLowerCase()?.replace(/[\s-]+/g, '-') || 'generic';
    
    // Check for exact match
    if (SPORTS_IMAGE_MAP[normalizedCategory]) {
      return SPORTS_IMAGE_MAP[normalizedCategory];
    }
    
    // Check for partial matches
    for (const [key, url] of Object.entries(SPORTS_IMAGE_MAP)) {
      if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
        return url;
      }
    }
    
    return SPORTS_IMAGE_MAP['generic'];
  },

  // Get sports emoji fallback
  getSportsEmoji: (category) => {
    const normalizedCategory = category?.toLowerCase()?.replace(/[\s-]+/g, '-') || 'generic';
    
    // Check for exact match
    if (SPORTS_EMOJI_MAP[normalizedCategory]) {
      return SPORTS_EMOJI_MAP[normalizedCategory];
    }
    
    // Check for partial matches
    for (const [key, emoji] of Object.entries(SPORTS_EMOJI_MAP)) {
      if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
        return emoji;
      }
    }
    
    return SPORTS_EMOJI_MAP['generic'];
  },

  // Get team badge URL (no preloading)
  getTeamBadgeUrl: (badgeUrl) => badgeUrl || null,

  // Get match poster URL (no preloading)
  getMatchPosterUrl: (posterUrl) => posterUrl || null
};

export default imageCache;