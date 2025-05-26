import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, ArrowRight, ArrowLeft, Play, Settings, Maximize, Search, Plus, Eye, Shield, MousePointer, Zap, LightbulbIcon, CircleGauge } from 'lucide-react';
import './PlayerViewWizard.css';

// Define steps outside the component so it's not recreated on every render
const steps = [
  {
    id: 1,
    title: "Add Streams",
    content: "Click 'Add Streams' to browse and add live sports, movies, or TV shows to your player.",
    highlight: '.btn--primary',
    position: "bottom-left"
  },
  {
    id: 2,
    title: "Manage Your Streams",
    content: "Use 'Manage Streams' to reorder, delete, refresh, or switch episodes for your active streams.",
    highlight: '.btn--secondary',
    position: "bottom-left"
  },
  {
    id: 3,
    title: "Fullscreen Experience",
    content: "Toggle fullscreen for an immersive view. Move mouse to top to show/hide controls. Press ESC to exit.",
    highlight: '.fullscreen-btn',
    position: "bottom-right"
  },
  {
    id: 4,
    title: "Pro Tips",
    content: "", // Content for Pro Tips (Step 4) will be handled by renderStep6Content
    highlight: null, // No specific element to highlight for the general pro tips step
    position: "top-center" // Centered at the top for the final step
  }
];

const totalSteps = steps.length;

const PlayerViewWizard = ({ isOpen, onClose, currentView, videoUrls, showStreamBrowser, showEditStreams, forceReset }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isVisible, setIsVisible] = useState(isOpen);
  const [tooltipStyle, setTooltipStyle] = useState({ opacity: 0, visibility: 'hidden', pointerEvents: 'none', position: 'fixed', zIndex: 10002 });
  const overlayRef = useRef(null);
  const tooltipRef = useRef(null);
  const [stepCompleted, setStepCompleted] = useState({});
  const prevShowStreamBrowserRef = useRef(showStreamBrowser);
  const prevShowEditStreamsRef = useRef(showEditStreams);
  const [searchInputActive, setSearchInputActive] = useState(false);
  const [searchInputTimer, setSearchInputTimer] = useState(null);

  useEffect(() => {
    // Check if forceReset has a meaningful value (e.g., changed from initial 0 or a specific signal)
    // The initial value of forceReset in App.js is 0. It increments on each manual open.
    // So, any value greater than 0 (or just any change if we don't care about the initial mount) indicates a reset.
    if (forceReset > 0) { 
      console.log('[PlayerViewWizard] forceReset triggered. Resetting to step 1.');
      setCurrentStep(1);
      setStepCompleted({}); // Clear completion status for all steps
      localStorage.removeItem('streambuddy_player_wizard_step'); // Clear saved step
      // Ensure the wizard becomes visible if it was closed and is being force-opened/reset
      // This might be redundant if isOpen is also being set to true in App.js, but good for robustness.
      if (!isVisible && isOpen) {
        setIsVisible(true);
      }
    }
  }, [forceReset]); // Only depend on forceReset

  useEffect(() => {
    if (isOpen) {
      switch (currentStep) {
        case 1: // Corresponds to "Add Streams"
          // If showStreamBrowser became true (meaning 'Add Streams' action was likely taken)
          if (showStreamBrowser && !prevShowStreamBrowserRef.current) {
            console.log('[PlayerViewWizard] Auto-advancing from Step 1 (Add Streams) to Step 2 (Manage Streams)');
            setStepCompleted(prev => ({ ...prev, 1: true }));
            setTimeout(() => setCurrentStep(2), 1000); // Advance to internal step 2
          }
          break;
        case 2: // Corresponds to "Manage Your Streams"
          // If showEditStreams became true (meaning 'Manage Streams' action was likely taken)
          if (showEditStreams && !prevShowEditStreamsRef.current) {
            console.log('[PlayerViewWizard] Auto-advancing from Step 2 (Manage Streams) to Step 3 (Fullscreen)');
            setStepCompleted(prev => ({ ...prev, 2: true }));
            setTimeout(() => setCurrentStep(3), 1000); // Advance to internal step 3
          }
          break;
        // Internal steps 3 (Fullscreen) and 4 (Pro Tips) are advanced manually by user clicking Next/Finish.
        default:
          break;
      }
    }

    // Update refs for the next render to detect changes in these props
    prevShowStreamBrowserRef.current = showStreamBrowser;
    prevShowEditStreamsRef.current = showEditStreams;
  }, [currentStep, isOpen, showStreamBrowser, showEditStreams]);

  

  // Handle visibility changes when the wizard is opened/closed
  useEffect(() => {
    if (isOpen) {
      // On initial open (when isVisible is false but isOpen becomes true), load step from localStorage or default to 1.
      if (!isVisible) { 
        const savedStep = parseInt(localStorage.getItem('streambuddy_player_wizard_step'), 10);
        if (savedStep && savedStep > 0 && savedStep <= totalSteps) {
          setCurrentStep(savedStep);
        } else {
          setCurrentStep(1); // Default to step 1 if no valid saved step
        }
      }
      setIsVisible(true);

      // Save current step to localStorage if it's valid
      if (currentStep > 0 && currentStep <= totalSteps) {
        localStorage.setItem('streambuddy_player_wizard_step', currentStep.toString());
      } else if (currentStep > totalSteps) { 
        // If currentStep becomes invalid (e.g., > totalSteps)
        console.warn(`[PlayerViewWizard isOpen Effect] currentStep (${currentStep}) > totalSteps (${totalSteps}). Closing wizard.`);
        onClose(); // Close the wizard
      }
    } else {
      // Immediately update tooltip style to prevent it from being "active" during fade-out
      setTooltipStyle(prev => ({ ...prev, opacity: 0, visibility: 'hidden', pointerEvents: 'none' }));
      // Delay hiding the component for fade-out animation
      setTimeout(() => {
        setIsVisible(false);
      }, 300); // Match animation duration (PlayerViewWizard.css .wizard-overlay transition)
    }
  }, [isOpen, currentStep, totalSteps, onClose, isVisible, setTooltipStyle]);

  const currentStepData = steps.find(step => step.id === currentStep);

  const highlightElement = useMemo(() => {
    if (!isOpen || !isVisible || !currentStepData) return null;
    
    // For the final step, don't highlight any element
    if (currentStep === 4) return null;
    
    // Find the element to highlight based on the current step's selector
    const selector = currentStepData.highlight;
    if (!selector) return null;
    
    return document.querySelector(selector);
  }, [currentStep, currentStepData, isOpen, isVisible]);

  useEffect(() => {
    const baseHiddenStyle = { 
      opacity: 0, 
      visibility: 'hidden', 
      pointerEvents: 'none', 
      position: 'fixed',
      zIndex: 10002
    };

    if (!isOpen || !isVisible || !currentStepData) {
      setTooltipStyle(prev => ({ ...prev, ...baseHiddenStyle }));
      return;
    }

    const tooltip = tooltipRef.current;
    if (!tooltip) {
      setTooltipStyle(prev => ({ ...prev, ...baseHiddenStyle }));
      return;
    }

    if (currentStep === 4) { // Pro-tips step, use fixed top-center positioning
      const tooltip = tooltipRef.current;
      if (!tooltip) {
        setTooltipStyle(prev => ({ ...prev, ...baseHiddenStyle }));
        return;
      }
      
      const tooltipRect = tooltip.getBoundingClientRect();
      if (!tooltipRect.width && !tooltipRect.height) {
        setTooltipStyle(prev => ({ ...prev, ...baseHiddenStyle }));
        return;
      }
      
      const viewportWidth = window.innerWidth;
      const margin = 20;
      
      setTooltipStyle({
        left: '50%',
        top: '30px',
        transform: 'translateX(-50%)',
        position: 'fixed',
        maxWidth: '650px',
        zIndex: 10002,
        opacity: 1,
        visibility: 'visible',
        pointerEvents: 'auto'
      });
      return;
    }

    const updateTooltipPosition = () => {
      let position = {};
      const tooltipRect = tooltip.getBoundingClientRect();
      if (!tooltipRect.width && !tooltipRect.height) { // Tooltip not rendered or has no dimensions yet
        setTooltipStyle(prev => ({ ...prev, ...baseHiddenStyle }));
        return;
      }
      const arrowHeight = 12;
      const margin = 10;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (highlightElement) {
        const highlightRect = highlightElement.getBoundingClientRect();
        switch (currentStepData.position) {
          case 'top':
            position = { top: highlightRect.top - tooltipRect.height - arrowHeight, left: highlightRect.left + highlightRect.width / 2 - tooltipRect.width / 2, transform: '' };
            break;
          case 'bottom':
            position = { top: highlightRect.bottom + arrowHeight, left: highlightRect.left + highlightRect.width / 2 - tooltipRect.width / 2, transform: '' };
            break;
          case 'left':
            position = { top: highlightRect.top + highlightRect.height / 2 - tooltipRect.height / 2, left: highlightRect.left - tooltipRect.width - arrowHeight, transform: '' };
            break;
          case 'right':
            position = { top: highlightRect.top + highlightRect.height / 2 - tooltipRect.height / 2, left: highlightRect.right + arrowHeight, transform: '' };
            break;
          default:
            position = { top: viewportHeight / 2 - tooltipRect.height / 2, left: viewportWidth / 2 - tooltipRect.width / 2, transform: '' };
        }
      } else {
        if (currentStepData.nonHighlightPosition) {
            position = {
                top: currentStepData.nonHighlightPosition.top || (viewportHeight / 2 - tooltipRect.height / 2),
                left: currentStepData.nonHighlightPosition.left || (viewportWidth / 2 - tooltipRect.width / 2),
                transform: currentStepData.nonHighlightPosition.transform || '',
            };
        } else {
            position = { top: viewportHeight / 2 - tooltipRect.height / 2, left: viewportWidth / 2 - tooltipRect.width / 2, transform: '' };
        }
      }

      let finalLeft = position.left;
      let finalTop = position.top;

      if (finalLeft < margin) finalLeft = margin;
      if (tooltipRect.width && (finalLeft + tooltipRect.width > viewportWidth - margin)) {
        finalLeft = viewportWidth - tooltipRect.width - margin;
      }
      if (finalTop < margin) finalTop = margin;
      if (tooltipRect.height && (finalTop + tooltipRect.height > viewportHeight - margin)) {
        finalTop = viewportHeight - tooltipRect.height - margin;
        if (finalTop < margin) finalTop = margin;
      }
      
      setTooltipStyle({
        left: `${finalLeft}px`,
        top: `${finalTop}px`,
        transform: position.transform || '',
        position: 'fixed',
        maxWidth: '400px',
        zIndex: 10002,
        opacity: 1,
        visibility: 'visible',
        pointerEvents: 'auto'
      });
    };

    updateTooltipPosition();

    const handleResize = () => updateTooltipPosition();
    const handleScroll = () => updateTooltipPosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, isVisible, currentStep, currentStepData, highlightElement, currentView]);

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      // It's good practice to mark step as completed if such state exists
      // Assuming setStepCompleted is available from useState
      if (typeof setStepCompleted === 'function') {
        setStepCompleted(prev => ({ ...prev, [currentStepData.id]: true }));
      }
      setCurrentStep(currentStep + 1);
    } else {
      handleClose(); // Finish the wizard
    }
  };

  const handleClose = () => {
    localStorage.setItem('streambuddy_player_wizard_completed', 'true');
    setCurrentStep(1); // Reset to step 1 for next time
    setStepCompleted({});
    onClose();
  };

  const handleSkip = () => {
    handleClose(); // Same behavior as finishing
  };

  // Debug logging
  console.log('[PlayerViewWizard] Rendering check:', {
    isOpen,
    isVisible,
    hasCurrentStepData: !!currentStepData,
    currentStep,
    currentStepData
  });

  if (!isOpen || !isVisible || !currentStepData) {
    console.log('[PlayerViewWizard] Not rendering because:', {
      reason: !isOpen ? 'isOpen is false' : !isVisible ? 'isVisible is false' : 'currentStepData is missing'
    });
    return null;
  }

  const progressDots = [];
  const totalDisplayedSteps = 6;

  for (let i = 1; i <= totalDisplayedSteps; i++) {
    let dotClassName = 'progress-dot';
    if (i <= 2) { // First 2 steps (QuickstartWizard) are always completed
      dotClassName += ' completed';
    } else {
      // Map displayed step (3-6) to PVW internal step (1-4)
      // PVW's `currentStep` state is 1-based and corresponds to its own steps.
      const pvwEquivalentStep = i - 2;
      if (currentStep === pvwEquivalentStep) {
        dotClassName += ' active';
      }
      // `stepCompleted` uses PVW's internal 1-based step numbers.
      if (stepCompleted[pvwEquivalentStep]) {
        dotClassName += ' completed';
      }
    }
    progressDots.push(<div key={`dot-${i}`} className={dotClassName} />);
  }

  // Special rendering for Step 4 (Pro Tips)
  const renderStep6Content = () => (
    <div className="wizard-final-step-content">
      {/* Removed 🚀 Pro Tips: heading - title is enough */}
      <ul className="wizard-final-tips">
        <li className="tip-item">
          <Shield size={20} className="tip-icon" />
          <div>
            <strong>AdBlock:</strong>
            <p>Use an adblocker to hide ads and improve performance.</p>
          </div>
        </li>
        <li className="tip-item">
          <LightbulbIcon size={20} className="tip-icon" />
          <div>
            <strong>Popups:</strong>
            <p>Don't click on any popup tabs or windows, they are scams.</p>
          </div>
        </li>
        <li className="tip-item">
          <MousePointer size={20} className="tip-icon" />
          <div>
            <strong>Double Click:</strong>
            <p>Sometimes you will need to click multiple times to engage with the player.</p>
          </div>
        </li>
        <li className="tip-item">
          <CircleGauge size={20} className="tip-icon" />
          <div>
            <strong>Performance:</strong>
            <p>Too many streams at once can cause excessive buffering.</p>
          </div>
        </li>
      </ul>
      <div className="wizard-disclaimer">
        <Eye size={20} className="disclaimer-icon"/>
        <p>StreamBuddy is a tool for streaming content. It is not responsible for the content you stream. Be sure to comply with local laws and regulations.</p>
      </div>
    </div>
  );

  // Determine overlay class based on intermediate phase
  let overlayClass = 'wizard-overlay';
  
  // Add a class for the final step
  if (currentStep === 4) {
    overlayClass += ' final-step';
  }

  return (
    <div className={overlayClass} ref={overlayRef}>
      {highlightElement && <div className="wizard-backdrop"></div>}
      {!highlightElement && currentStep !== 4 && <div className="wizard-backdrop"></div>} 
      {/* For step 4, no general backdrop unless a specific highlight is added back later */}
      
      {highlightElement && (
        <div
          className="wizard-highlight"
          style={{
            top: `${highlightElement.getBoundingClientRect().top - 6}px`,
            left: `${highlightElement.getBoundingClientRect().left - 6}px`,
            width: `${highlightElement.getBoundingClientRect().width + 12}px`,
            height: `${highlightElement.getBoundingClientRect().height + 12}px`,
            borderRadius: getComputedStyle(highlightElement).borderRadius === '0px' ? '12px' : getComputedStyle(highlightElement).borderRadius,
          }}
        />
      )}

      {/* Render tooltip structure if wizard is active; style object controls visibility/position */}
      {isOpen && isVisible && currentStepData && (
        <div
          ref={tooltipRef}
          className={`wizard-tooltip ${currentStepData.position} ${currentStepData.id === 4 ? 'wizard-tooltip-step-6' : ''}`}
          style={tooltipStyle} 
        >
          <div className="wizard-content">
            <div className="wizard-header">
              <div className="wizard-step-info">
                <span className="wizard-step-number">Step {currentStepData.id+2} of {6}</span>
                <div className="wizard-progress-dots">
                  {progressDots}
                </div>
              </div>
              <button onClick={handleClose} className="wizard-close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="wizard-body">
              <h3>{currentStepData.title}</h3>
              {currentStepData.id === 4 ? renderStep6Content() : <p>{currentStepData.content}</p>}
            </div>
            <div className="wizard-footer">
              {currentStep > 1 && (
                <button onClick={handlePrev} className="wizard-btn secondary prev">
                  <ArrowLeft size={18} /> Previous
                </button>
              )}
              <button onClick={handleSkip} className="wizard-btn secondary skip-tour">
                Skip Tour
              </button>
              <button onClick={handleNext} className={`wizard-btn primary ${currentStep === totalSteps ? 'finish' : ''}`}>
                {currentStep === totalSteps ? 'Finish' : 'Next'} <ArrowRight size={18} />
              </button>
            </div>
          </div>
          {currentStepData.position !== 'center' && currentStepData.id !== 4 && (
            <div className={`wizard-arrow ${currentStepData.position}`}></div>
          )}
          {/* No arrow for step 4 as it's fixed top-center */}
        </div>
      )}
    </div>
  );
};

export default PlayerViewWizard;
