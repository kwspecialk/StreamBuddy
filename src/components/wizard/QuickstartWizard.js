import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Play, Settings, Maximize, Search, Plus, Eye, Shield, MousePointer, Zap } from 'lucide-react';
import './QuickstartWizard.css';

const QuickstartWizard = ({ isOpen, onClose, currentView, isMovieDetailsModalOpen }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);
  const overlayRef = useRef(null);
  const tooltipRef = useRef(null); // Added definition
  const [stepCompleted, setStepCompleted] = useState({});
  const prevCurrentViewRef = useRef(currentView);
  const [searchInputActive, setSearchInputActive] = useState(false);
  const [searchInputTimer, setSearchInputTimer] = useState(null);
  const [intermediatePhase, setIntermediatePhase] = useState(0); // 0: initial, 1: filter highlight, 2: select content

  const totalSteps = 2;

  // Auto-advance for Step 2 (Search & Add Content) if user navigates to stream view
  // This might now just close this wizard, and App.js will handle showing PlayerViewWizard.
  useEffect(() => {
    if (isOpen && currentStep === 2 && prevCurrentViewRef.current === 'homepage' && currentView === 'stream-view') {
      // If user clicks 'Watch Now' from details modal (which changes view to 'stream-view'),
      // this wizard should be considered complete.
      console.log('QuickstartWizard: Step 2 (navigating to stream view) is triggering completion.');
      localStorage.setItem('streambuddy_quickstart_completed', 'true'); // Mark as completed
      onClose(); // Then close it, App.js will decide if PlayerViewWizard should open.
    }
    prevCurrentViewRef.current = currentView;
  }, [currentStep, currentView, isOpen, onClose]); // Added onClose to dependency array

  // Monitor search input activity
  useEffect(() => {
    // Add event listeners to search inputs when on step 2
    if (isOpen && currentStep === 2) {
      const searchInputs = document.querySelectorAll('.search-container input, .hero-search-container input');
      
      const handleSearchFocus = () => {
        setSearchInputActive(true);
        setIntermediatePhase(0); // Reset to initial phase
        
        // Clear any existing timer
        if (searchInputTimer) {
          clearTimeout(searchInputTimer);
        }
      };
      
      const handleSearchInput = () => {
        setSearchInputActive(true);
        setIntermediatePhase(0); // Reset to initial phase
        
        // Clear any existing timer
        if (searchInputTimer) {
          clearTimeout(searchInputTimer);
        }
        
        // Set a new timer to show first intermediate phase after 750ms of inactivity
        const timer = setTimeout(() => {
          setIntermediatePhase(1); // Show filter highlight phase
          
          // After 3 seconds, advance to the content selection phase
          setTimeout(() => {
            setIntermediatePhase(2); // Show select content phase
          }, 3000);
        }, 750);
        
        setSearchInputTimer(timer);
      };
      
      searchInputs.forEach(input => {
        input.addEventListener('focus', handleSearchFocus);
        input.addEventListener('input', handleSearchInput);
      });
      
      return () => {
        // Clean up event listeners
        searchInputs.forEach(input => {
          input.removeEventListener('focus', handleSearchFocus);
          input.removeEventListener('input', handleSearchInput);
        });
        
        if (searchInputTimer) {
          clearTimeout(searchInputTimer);
        }
      };
    }
  }, [isOpen, currentStep, searchInputTimer]);

  // Steps configuration
  const steps = [
    {
      id: 1,
      title: "Welcome to StreamBuddy!",
      content: "Let's get you started with a quick tour of the main features.",
      highlight: null,
      position: "center"
    },
    {
      id: 2,
      title: intermediatePhase === 0 
        ? "Search & Add Content" 
        : (intermediatePhase === 1 ? "Filter Content" : "Select Content"),
      content: intermediatePhase === 0
        ? "Start by searching for sports events, movies, or TV shows. Use the search bar to find what you want to watch."
        : (intermediatePhase === 1
          ? "You can filter by Sports, Movies, or TV Shows using these category tabs."
          : (isMovieDetailsModalOpen 
            ? "Click 'Watch Now' to add this to your player. This will take you to the player view!"
            : "Select any content to start watching. Click on a card to view details or play directly.")),
      highlight: intermediatePhase === 0
        ? (currentView === 'homepage' ? '.search-container, .hero-search' : '.add-stream-btn-header') // .add-stream-btn-header might not be relevant if wizard closes before non-homepage view
        : (intermediatePhase === 1
          ? '.main-nav-bar .nav-bar-btn' // Highlight all category tabs
          : null), // No highlight for Phase 2 (Select Content)
      position: intermediatePhase === 0
        ? (currentView === 'homepage' ? "bottom" : "bottom-left")
        : (intermediatePhase === 1 
          ? "bottom-right" 
          : (isMovieDetailsModalOpen ? "bottom" : "bottom"))
    }
  ];

  // Initialize wizard state when component mounts
  useEffect(() => {
    // Load the saved step if it exists
    const savedStep = localStorage.getItem('streambuddy_quickstart_wizard_step');
    if (savedStep && parseInt(savedStep) > 0) {
      setCurrentStep(parseInt(savedStep));
    }
  }, []); // Empty dependency array - only run once on mount

  // Store the current step in localStorage to persist across view changes
  useEffect(() => {
    if (currentStep > 0) {
      localStorage.setItem('streambuddy_quickstart_wizard_step', currentStep.toString());
    }
  }, [currentStep]);

  // Handle visibility changes when the wizard is opened/closed
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      
      // Detect view transitions
      if (prevCurrentViewRef.current !== currentView) {
        console.log('View changed from', prevCurrentViewRef.current, 'to', currentView);
        // Reset intermediate phase when view changes
        setIntermediatePhase(0);
        
        // Auto-advance to step 3 when transitioning from homepage to stream-view
        if (prevCurrentViewRef.current === 'homepage' && currentView === 'stream-view' && currentStep === 2) {
          console.log('Auto-advancing to step 3 after content selection');
          setStepCompleted(prev => ({ ...prev, 2: true }));
          setTimeout(() => setCurrentStep(3), 500);
        }
      }
      
      // Prevent body scroll when wizard is open
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, currentView, currentStep]);

  const handleNext = () => {
    if (currentStep < totalSteps) { // totalSteps is now 2
      // Mark current step as completed when manually advancing
      setStepCompleted(prev => ({ ...prev, [currentStep]: true }));
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      // Remove completed status from the previous step when going back
      setStepCompleted(prev => {
        const updated = { ...prev };
        delete updated[currentStep - 1];
        return updated;
      });
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    // Mark wizard as completed
    localStorage.setItem('streambuddy_quickstart_completed', 'true');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('streambuddy_quickstart_completed', 'true');
    onClose();
  };

  const getCurrentStep = () => {
    const currentWizardStep = steps.find(step => step.id === currentStep);
    const tooltipClassName = `wizard-tooltip wizard-tooltip-step-${currentStep} ${currentWizardStep?.position || ''}`;
    return currentWizardStep || steps[0];
  };

  const getHighlightElement = (selector) => {
    if (!selector) return null;
    
    // Handle multiple selectors (comma-separated)
    const selectors = selector.split(',').map(s => s.trim());
    
    for (const sel of selectors) {
      const element = document.querySelector(sel);
      if (element) {
        return element;
      }
    }
    return null;
  };

  const getTooltipPosition = (element, position) => {
    if (!element) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const rect = element.getBoundingClientRect();
    const tooltipOffset = 20;

    switch (position) {
      case 'bottom':
        return {
          top: `${rect.bottom + tooltipOffset}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)'
        };
      case 'bottom-left':
        return {
          top: `${rect.bottom + tooltipOffset}px`,
          left: `${rect.left}px`,
          transform: 'none'
        };
      case 'bottom-right':
        return {
          top: `${rect.bottom + tooltipOffset}px`,
          right: `${window.innerWidth - rect.right}px`,
          transform: 'none'
        };
      case 'top':
        return {
          top: `${rect.top - tooltipOffset}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translate(-50%, -100%)'
        };
      case 'left':
        return {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.left - tooltipOffset}px`,
          transform: 'translate(-100%, -50%)'
        };
      case 'right':
        return {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + tooltipOffset}px`,
          transform: 'translateY(-50%)'
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }
  };

  if (!isOpen || !isVisible) return null;

  const currentStepData = getCurrentStep();
  const highlightElement = getHighlightElement(currentStepData.highlight);
  const tooltipStyle = getTooltipPosition(highlightElement, currentStepData.position);


  return (
    <div className={`quickstart-wizard-overlay ${intermediatePhase > 0 ? 'intermediate-phase' : ''} ${intermediatePhase === 2 ? 'content-phase' : ''}`} ref={overlayRef}>
      {/* Backdrop with highlight cutout */}
      <div 
        className={`wizard-backdrop ${intermediatePhase > 0 ? 'faded' : ''}`}
        onClick={(e) => {
          // Only close if clicking directly on the backdrop (not on children)
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {highlightElement && (
          <div 
            className="wizard-highlight"
            style={{
              top: `${highlightElement.getBoundingClientRect().top - 8}px`,
              left: `${highlightElement.getBoundingClientRect().left - 8}px`,
              width: `${highlightElement.getBoundingClientRect().width + 16}px`,
              height: `${highlightElement.getBoundingClientRect().height + 16}px`,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div 
        ref={tooltipRef} 
        className={`wizard-tooltip wizard-tooltip-step-${currentStep} ${currentStepData.position}`}
        style={tooltipStyle}
      >
        <div className="wizard-content">
          <div className="wizard-header">
            <div className="wizard-step-info">
              <span className="wizard-step-number">Step {currentStep} of {6}</span>
              <div className="wizard-progress-dots">
                {Array.from({ length: 6 }, (_, i) => (
                  <div 
                    key={i} 
                    className={`progress-dot ${i + 1 === currentStep ? 'current' : ''} ${stepCompleted[i + 1] ? 'completed' : ''} ${i + 1 < currentStep ? 'active' : ''}`}
                  />
                ))}
              </div>
            </div>
            <button className="wizard-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="wizard-body">
            <h3>{currentStepData.title}</h3>
            <p>{currentStepData.content}</p>
          </div>

          <div className="wizard-footer">
            <div className="wizard-nav-buttons">
              {currentStep > 1 && (
                <button className="wizard-btn secondary" onClick={handlePrevious}>
                  <ArrowLeft size={16} />
                  Previous
                </button>
              )}
              
              <div className="wizard-main-actions">
                <button className="wizard-btn tertiary" onClick={handleSkip}>
                  Skip Tour
                </button>
                
                <button className="wizard-btn primary" onClick={handleNext}>
                  Next
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tooltip arrow */}
        <div className={`wizard-arrow ${currentStepData.position === 'center' ? 'hidden' : ''}`} />
      </div>
    </div>
  );
};

export default QuickstartWizard;