// Simplified image cache utility without CORS-violating preloading
const STREAMED_IMAGE_BASE = 'https://streamed.pk/api/images';

// Sports image mappings
const SPORTS_IMAGE_MAP = {
  'soccer': '/images/sports/soccer.png',
  'football': '/images/sports/soccer.png', // Non-American football
  'american-football': '/images/sports/football.png',
  'basketball': '/images/sports/basketball.png',
  'tennis': '/images/sports/tennis.png',
  'baseball': '/images/sports/baseball.png',
  'hockey': '/images/sports/hockey.png',
  'golf': '/images/sports/golf.png',
  'cricket': '/images/sports/cricket.png',
  'rugby': '/images/sports/rugby.png',
  'motor-sports': '/images/sports/racing.png',
  'racing': '/images/sports/racing.png',
  'boxing': '/images/sports/fight.png',
  'mma': '/images/sports/fight.png',
  'fight': '/images/sports/fight.png',
  'darts': '/images/sports/darts.png',
  'generic': '/images/sports/generic.png'
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
  'racing': '🏁',
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
  getTeamBadgeUrl: (badgeId) => {
    if (!badgeId) return null;
    return `${STREAMED_IMAGE_BASE}/badge/${badgeId}.webp`;
  },

  // Get match poster URL (no preloading)
  getMatchPosterUrl: (posterId) => {
    if (!posterId) return null;
    return `${STREAMED_IMAGE_BASE}/poster/${posterId}/${posterId}.webp`;
  }
};

export default imageCache;