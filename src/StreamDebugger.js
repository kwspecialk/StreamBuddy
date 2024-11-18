import React, { useState, useEffect } from 'react';

const StreamDebugger = ({ url, onError }) => {
  const [debugInfo, setDebugInfo] = useState({ status: 'checking', details: null });

  useEffect(() => {
    const checkStream = async () => {
      try {
        // Check if URL is properly formatted
        if (!url) {
          throw new Error('No URL provided');
        }

        // Test if URL is for live stream
        if (url.includes('streamed.su')) {
          const response = await fetch(`/api/stream/${url.split('/').slice(-2).join('/')}`);
          const data = await response.json();
          setDebugInfo({
            status: 'stream_check',
            details: {
              responseStatus: response.status,
              hasEmbedUrl: !!data?.[0]?.embedUrl,
              embedUrl: data?.[0]?.embedUrl
            }
          });
        }
        
        // Test if URL is for on-demand content
        if (url.includes('vidsrc')) {
          const response = await fetch(url);
          setDebugInfo({
            status: 'vidsrc_check',
            details: {
              responseStatus: response.status,
              url: url
            }
          });
        }

      } catch (error) {
        setDebugInfo({
          status: 'error',
          details: error.message
        });
        onError?.(error);
      }
    };

    checkStream();
  }, [url]);

  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      zIndex: 1000
    }}>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  );
};

export default StreamDebugger;