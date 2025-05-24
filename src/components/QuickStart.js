import React, { useState, useEffect } from 'react';
import { LAYOUTS } from '../layouts';

const QuickStart = ({ onComplete, matches, isLoading }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedContent, setSelectedContent] = useState([]);
  const [selectedLayout, setSelectedLayout] = useState('dual');
  const [searchTerm, setSearchTerm] = useState('');

  // Featured/popular matches for quick selection
  const featuredMatches = matches.filter(match => match.popular).slice(0, 8);
  const allMatches = matches.filter(match => !match.popular);

  const filteredMatches = allMatches.filter(match => 
    match.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (match.teams && `${match.teams.home?.name} ${match.teams.away?.name}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleContentSelect = (match) => {
    if (selectedContent.find(item => item.id === match.id)) {
      // Remove if already selected
      setSelectedContent(prev => prev.filter(item => item.id !== match.id));
    } else if (selectedContent.length < 4) {
      // Add if under limit
      setSelectedContent(prev => [...prev, match]);
    }
  };

  const handleComplete = () => {
    onComplete({
      selectedContent,
      selectedLayout,
      skipWizard: false
    });
  };

  const handleSkipWizard = () => {
    onComplete({
      selectedContent: [],
      selectedLayout: 'single',
      skipWizard: true
    });
  };

  const getStepTitle = () => {
    switch(currentStep) {
      case 1: return "What do you want to watch?";
      case 2: return "Choose your layout";
      case 3: return "Ready to launch!";
      default: return "";
    }
  };

  const canProceed = () => {
    switch(currentStep) {
      case 1: return selectedContent.length > 0;
      case 2: return selectedLayout !== '';
      case 3: return true;
      default: return false;
    }
  };

  return (
    <div className="quickstart-overlay">
      <div className="quickstart-container">
        <div className="quickstart-header">
          <h1 className="quickstart-title">Welcome to StreamBuddy</h1>
          <p className="quickstart-subtitle">Watch multiple streams simultaneously</p>
          <button 
            className="skip-wizard-btn"
            onClick={handleSkipWizard}
          >
            Skip Setup →
          </button>
        </div>

        <div className="quickstart-content">
          <div className="step-indicator">
            <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
            <div className={`step-line ${currentStep >= 2 ? 'active' : ''}`}></div>
            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
            <div className={`step-line ${currentStep >= 3 ? 'active' : ''}`}></div>
            <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
          </div>

          <h2 className="step-title">{getStepTitle()}</h2>

          {/* Step 1: Content Selection */}
          {currentStep === 1 && (
            <div className="step-content">
              <div className="content-selection">
                <div className="selected-count">
                  Selected: {selectedContent.length}/4
                </div>

                {/* Featured Games */}
                {featuredMatches.length > 0 && (
                  <div className="content-section">
                    <h3>Featured Games</h3>
                    <div className="content-grid">
                      {featuredMatches.map(match => (
                        <div
                          key={match.id}
                          className={`content-card ${selectedContent.find(item => item.id === match.id) ? 'selected' : ''}`}
                          onClick={() => handleContentSelect(match)}
                        >
                          <div className="content-card-header">
                            <span className="live-indicator">● LIVE</span>
                          </div>
                          <div className="content-card-title">
                            {match.teams?.home?.name && match.teams?.away?.name 
                              ? `${match.teams.home.name} vs ${match.teams.away.name}`
                              : match.title
                            }
                          </div>
                          <div className="content-card-meta">
                            {match.category || 'Sports'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search for more games */}
                <div className="content-section">
                  <h3>Search All Games</h3>
                  <input
                    type="text"
                    placeholder="Search for games..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  {searchTerm && (
                    <div className="search-results">
                      {filteredMatches.slice(0, 6).map(match => (
                        <div
                          key={match.id}
                          className={`search-result-item ${selectedContent.find(item => item.id === match.id) ? 'selected' : ''}`}
                          onClick={() => handleContentSelect(match)}
                        >
                          <span className="search-result-title">
                            {match.teams?.home?.name && match.teams?.away?.name 
                              ? `${match.teams.home.name} vs ${match.teams.away.name}`
                              : match.title
                            }
                          </span>
                          <span className="search-result-category">
                            {match.category || 'Sports'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Layout Selection */}
          {currentStep === 2 && (
            <div className="step-content">
              <div className="layout-selection">
                <div className="layout-grid">
                  {Object.entries(LAYOUTS)
                    .filter(([id]) => ['single', 'dual', 'triple', 'quad'].includes(id))
                    .map(([id, layout]) => (
                    <div
                      key={id}
                      className={`layout-card ${selectedLayout === id ? 'selected' : ''}`}
                      onClick={() => setSelectedLayout(id)}
                    >
                      <div className="layout-preview">
                        <LayoutPreview layoutId={id} />
                      </div>
                      <div className="layout-name">{layout.name} Stream{layout.windows > 1 ? 's' : ''}</div>
                      <div className="layout-description">
                        {getLayoutDescription(id)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Ready to Launch */}
          {currentStep === 3 && (
            <div className="step-content">
              <div className="launch-summary">
                <div className="summary-section">
                  <h3>Selected Content ({selectedContent.length})</h3>
                  <div className="selected-content-list">
                    {selectedContent.map(match => (
                      <div key={match.id} className="selected-content-item">
                        <span className="live-dot">●</span>
                        {match.teams?.home?.name && match.teams?.away?.name 
                          ? `${match.teams.home.name} vs ${match.teams.away.name}`
                          : match.title
                        }
                      </div>
                    ))}
                  </div>
                </div>

                <div className="summary-section">
                  <h3>Layout</h3>
                  <div className="selected-layout-preview">
                    <LayoutPreview layoutId={selectedLayout} />
                    <span>{LAYOUTS[selectedLayout]?.name} Stream Layout</span>
                  </div>
                </div>

                <div className="launch-message">
                  <p>Perfect! Your multi-stream setup is ready to launch.</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="quickstart-navigation">
            {currentStep > 1 && (
              <button 
                className="nav-btn secondary"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                ← Back
              </button>
            )}
            
            <div className="nav-spacer"></div>
            
            {currentStep < 3 ? (
              <button 
                className={`nav-btn primary ${!canProceed() ? 'disabled' : ''}`}
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
              >
                Next →
              </button>
            ) : (
              <button 
                className="nav-btn primary launch-btn"
                onClick={handleComplete}
              >
                🚀 Launch StreamBuddy
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for layout previews
const LayoutPreview = ({ layoutId }) => {
  const getPreviewBoxes = () => {
    switch(layoutId) {
      case 'single':
        return [{ width: '100%', height: '100%' }];
      case 'dual':
        return [
          { width: '48%', height: '100%', left: '0%' },
          { width: '48%', height: '100%', left: '52%' }
        ];
      case 'triple':
        return [
          { width: '65%', height: '100%', left: '0%' },
          { width: '33%', height: '48%', left: '67%', top: '0%' },
          { width: '33%', height: '48%', left: '67%', top: '52%' }
        ];
      case 'quad':
        return [
          { width: '48%', height: '48%', left: '0%', top: '0%' },
          { width: '48%', height: '48%', left: '52%', top: '0%' },
          { width: '48%', height: '48%', left: '0%', top: '52%' },
          { width: '48%', height: '48%', left: '52%', top: '52%' }
        ];
      default:
        return [{ width: '100%', height: '100%' }];
    }
  };

  return (
    <div className="layout-preview-container">
      {getPreviewBoxes().map((box, index) => (
        <div
          key={index}
          className="layout-preview-box"
          style={{
            width: box.width,
            height: box.height,
            left: box.left || '0%',
            top: box.top || '0%'
          }}
        />
      ))}
    </div>
  );
};

// Helper function for layout descriptions
const getLayoutDescription = (layoutId) => {
  switch(layoutId) {
    case 'single': return 'Focus on one stream';
    case 'dual': return 'Two streams side by side';
    case 'triple': return 'One main + two smaller streams';
    case 'quad': return 'Four equal streams in a grid';
    default: return '';
  }
};

export default QuickStart;