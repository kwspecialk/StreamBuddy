import React, { useState } from 'react';
import { LAYOUTS } from './layouts';

const LayoutSelector = ({ onLayoutChange, currentLayout }) => {
  const [isMenuVisible, setMenuVisible] = useState(false);

  const getLayoutPreview = (layoutId, showNumbers = false) => {
    const getPreviewBoxes = () => {      
      switch(layoutId) {
        case 'single':
          return [{ width: '100%', height: '100%', number: 1 }];
        case 'dual':
          return [
            { width: '49%', height: '100%', left: '0%', number: 1 },
            { width: '49%', height: '100%', left: '51%', number: 2 }
          ];
        case 'triple':
          return [
            { width: '63%', height: '100%', left: '0%', number: 1 },
            { width: '35%', height: '49%', left: '65%', top: '0%', number: 2 },
            { width: '35%', height: '49%', left: '65%', top: '51%', number: 3 }
          ];
        case 'quad':
          return [
            { width: '49%', height: '49%', left: '0%', top: '0%', number: 1 },
            { width: '49%', height: '49%', left: '51%', top: '0%', number: 2 },
            { width: '49%', height: '49%', left: '0%', top: '51%', number: 3 },
            { width: '49%', height: '49%', left: '51%', top: '51%', number: 4 }
          ];
        case 'two-plus-four':
          return [
            { width: '63%', height: '49%', left: '0%', top: '0%', number: 1 },
            { width: '63%', height: '49%', left: '0%', top: '51%', number: 2 },
            { width: '35%', height: '24%', left: '65%', top: '0%', number: 3 },
            { width: '35%', height: '24%', left: '65%', top: '25.5%', number: 4 },
            { width: '35%', height: '24%', left: '65%', top: '51%', number: 5 },
            { width: '35%', height: '24%', left: '65%', top: '76.5%', number: 6 }
          ];
        case 'grid-3x3':
          return Array.from({ length: 9 }, (_, i) => ({
            width: '32%',
            height: '32%',
            left: `${(i % 3) * 34}%`,
            top: `${Math.floor(i / 3) * 34}%`,
            number: i + 1
          }));
        case 'grid-5x2':
          return Array.from({ length: 10 }, (_, i) => ({
            width: '19%',
            height: '49%',
            left: `${(i % 5) * 20.25}%`,
            top: `${Math.floor(i / 5) * 51}%`,
            number: i + 1
          }));
        case 'grid-infinite':
          return [
            { width: '32%', height: '32%', left: '0%', top: '0%', number: 1 },
            { width: '32%', height: '32%', left: '34%', top: '0%', number: 2 },
            { width: '32%', height: '32%', left: '68%', top: '0%', number: 3 },
            { width: '32%', height: '32%', left: '0%', top: '34%', number: 4 },
            { width: '32%', height: '32%', left: '34%', top: '34%', number: 5 },
            { width: '32%', height: '32%', left: '68%', top: '34%', number: 6 },
            { width: '32%', height: '32%', left: '0%', top: '68%', number: 7 },
            { width: '32%', height: '32%', left: '34%', top: '68%', number: 8 },
            { width: '8%', height: '8%', left: '92%', top: '92%', number: '...' }
          ];
        default:
          return [{ width: '100%', height: '100%', number: 1 }];
      }
    };

    return (
      <div className="layout-preview-mini">
        {getPreviewBoxes().map((box, index) => (
          <div
            key={index}
            className="layout-preview-box-mini"
            style={{
              width: box.width,
              height: box.height,
              left: box.left || '0%',
              top: box.top || '0%'
            }}
          >
            {showNumbers && (
              <span className="layout-preview-number">
                {box.number}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const getLayoutDescription = (layoutId) => {
    switch(layoutId) {
      case 'single': return 'Single stream focus';
      case 'dual': return 'Side by side viewing';
      case 'triple': return 'Main + two smaller';
      case 'quad': return 'Equal four-way split';
      case 'two-plus-four': return 'Two large + four small';
      case 'grid-3x3': return '3×3 grid layout';
      case 'grid-5x2': return '5×2 grid layout';
      case 'grid-infinite': return 'Unlimited streams';
      default: return '';
    }
  };

  return (
    <div className="layout-controls">
      <button 
        className="layout-toggle enhanced"
        onClick={() => setMenuVisible(!isMenuVisible)}
      >
        <div className="layout-toggle-preview">
          {getLayoutPreview(currentLayout)}
        </div>
        <span className="layout-toggle-text">
          {LAYOUTS[currentLayout]?.name || 'Select'}
        </span>
        <span className={`layout-toggle-arrow ${isMenuVisible ? 'open' : ''}`}>
          ▼
        </span>
      </button>
      
      <div className={`layout-menu enhanced ${isMenuVisible ? 'visible' : ''}`}>
        <div className="layout-menu-header">
          <h3>Choose Layout</h3>
          <p>Select how to arrange your streams</p>
        </div>
        
        <div className="layout-menu-grid">
          {Object.entries(LAYOUTS).map(([id, layout]) => (
            <button
              key={id}
              className={`layout-option ${currentLayout === id ? 'selected' : ''}`}
              onClick={() => {
                onLayoutChange(id);
                setMenuVisible(false);
              }}
            >
              <div className="layout-option-preview">
                {getLayoutPreview(id, false)}
              </div>
              <div className="layout-option-info">
                <div className="layout-option-name">{layout.name}</div>
                <div className="layout-option-desc">{getLayoutDescription(id)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Backdrop to close menu */}
      {isMenuVisible && (
        <div 
          className="layout-menu-backdrop"
          onClick={() => setMenuVisible(false)}
        />
      )}
    </div>
  );
};

export default LayoutSelector;