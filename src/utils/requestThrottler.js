class RequestThrottler {
    constructor(limit = 5, interval = 2000) {
      this.limit = limit;
      this.interval = interval;
      this.requests = new Map();
      this.cache = new Map();
      this.cacheTimeout = 30000;
    }
  
    async throttledFetch(url, options = {}) {
      const cachedResponse = this.cache.get(url);
      if (cachedResponse && Date.now() - cachedResponse.timestamp < this.cacheTimeout) {
        return cachedResponse.data;
      }
  
      if (!this.canMakeRequest(url)) {
        if (cachedResponse) {
          return cachedResponse.data;
        }
        await new Promise(resolve => setTimeout(resolve, this.interval));
      }
  
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
  
        this.cache.set(url, {
          data,
          timestamp: Date.now()
        });
  
        return data;
      } catch (error) {
        console.warn('Fetch error:', error);
        return cachedResponse?.data || null;
      }
    }
  
    canMakeRequest(url) {
      const now = Date.now();
      const requestTimes = this.requests.get(url) || [];
      
      const recentRequests = requestTimes.filter(time => now - time < this.interval);
      
      if (recentRequests.length < this.limit) {
        this.requests.set(url, [...recentRequests, now]);
        return true;
      }
      
      return false;
    }
  
    clearCache() {
      const now = Date.now();
      for (const [url, data] of this.cache.entries()) {
        if (now - data.timestamp > this.cacheTimeout) {
          this.cache.delete(url);
        }
      }
    }
  }
  
  export const throttler = new RequestThrottler();
  
  setInterval(() => throttler.clearCache(), 60000);