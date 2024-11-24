import React, { useRef, useEffect } from 'react';

const OnDemandVideoFeed = ({ url, isActive, onVideoSelect }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const blockScript = ''
    // Override any existing script blocking
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName) {
        const element = originalCreateElement(tagName);
        if (tagName.toLowerCase() === 'script') {
          const originalSetAttribute = element.setAttribute.bind(element);
          element.setAttribute = function(name, value) {
            if (value && value.includes('disable-devtool')) {
              return; // Don't set src for the devtool script
            }
            return originalSetAttribute(name, value);
          };
        }
        return element;
      };

      // Prevent the script from loading
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.addedNodes) {
            mutation.addedNodes.forEach(function(node) {
              if (node.tagName === 'SCRIPT' && 
                  (node.src.includes('disable-devtool') || 
                   node.innerHTML.includes('disable-devtool'))) {
                node.remove();
              }
            });
          }
        });
      });

      observer.observe(document, {
        childList: true,
        subtree: true
      });

      // Clear console protection
      console.clear = () => {};
    ;

    iframe.onload = () => {
      try {
        const iframeDoc = iframe.contentWindow.document;
        const script = iframeDoc.createElement('script');
        script.textContent = blockScript;
        iframeDoc.head.appendChild(script);
      } catch (e) {
        // Handle cross-origin restrictions silently
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <iframe
        ref={iframeRef}
        src={url}
        title="Video Player"
        frameBorder="0"
        allowFullScreen
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          pointerEvents: isActive ? 'auto' : 'none'
        }}
      />
      {!isActive && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            cursor: 'pointer',
            zIndex: 1
          }}
          onClick={() => onVideoSelect && onVideoSelect()}
        />
      )}
    </div>
  );
};

export default OnDemandVideoFeed;