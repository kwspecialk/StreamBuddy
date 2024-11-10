import React, { useState } from 'react';
import { LAYOUTS } from './layouts';

const LayoutSelector = ({ onLayoutChange, currentLayout }) => {
  const [isMenuVisible, setMenuVisible] = useState(false);

  return (
    <div className="layout-controls">
      <button 
        className="layout-toggle"
        onClick={() => setMenuVisible(!isMenuVisible)}
      >
        Layout: {LAYOUTS[currentLayout]?.name || 'Select'}
      </button>
      <div className={`layout-menu ${isMenuVisible ? 'visible' : ''}`}>
        {Object.entries(LAYOUTS).map(([id, layout]) => (
          <button
            key={id}
            className="layout-button"
            onClick={() => {
              onLayoutChange(id);
              setMenuVisible(false);
            }}
          >
            {layout.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LayoutSelector;