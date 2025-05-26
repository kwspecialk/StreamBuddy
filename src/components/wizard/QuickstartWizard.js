import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Play } from 'lucide-react';
import './QuickstartWizard.css';

const QuickstartWizard = ({ isOpen, onClose, currentView, isMovieDetailsModalOpen }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);
  const [userHasSearched, setUserHasSearched] = useState(false);
  const [showFilterStep, setShowFilterStep] = useState(false);
  const overlayRef = useRef(null);
  const tooltipRef = useRef(null);
  const [stepCompleted, setStepCompleted] = useState({});
  const prevCurrentViewRef = useRef(currentView);

  const totalSteps = 6;

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
    if (isOpen && currentStep === 2) {
      const searchInputs = document.querySelectorAll('.search-container input, .hero-search input, .persistent-search-input');
      
      const handleSearchInput = (e) => {
        // If user types anything, mark as searched
        if (e.target.value.trim().length > 0) {
          setUserHasSearched(true);
          // After 2 seconds, show the filter step
          setTimeout(() => {
            setShowFilterStep(true);
            // After 3 seconds, hide filter step and return to content selection
            setTimeout(() => {
              setShowFilterStep(false);
            }, 4000);
          }, 2000);
        } else {
          setUserHasSearched(false);
          setShowFilterStep(false);
        }
      };
      
      searchInputs.forEach(input => {
        input.addEventListener('input', handleSearchInput);
        // Check current value on mount
        if (input.value.trim().length > 0) {
          setUserHasSearched(true);
        }
      });
      
      return () => {
        searchInputs.forEach(input => {
          input.removeEventListener('input', handleSearchInput);
        });
      };
    }
  }, [isOpen, currentStep]);

  // Steps configuration - only steps 1-2 (steps 3-6 handled elsewhere)
  const steps = [
    {
      id: 1,
      title: "Welcome to StreamBuddy!",
      content: "Let's get you started with a quick 2-minute tour of the most important features.",
      highlight: null,
      position: "center"
    },
    {
      id: 2,
      title: showFilterStep ? "Filter your search" : (userHasSearched ? "Great! Now select content" : "Search & Add Content"),
      content: showFilterStep 
        ? "Click on Sports, Movies, or TV Shows to filter your search results and find exactly what you're looking for."
        : (userHasSearched 
          ? "Click on any content card to view details and add it to your player."
          : "Start by searching for sports events, movies, or TV shows. Use the search bar or browse categories to find what you want to watch."),
      highlight: showFilterStep
        ? '.nav__item' // Highlight category navigation tabs
        : (userHasSearched 
          ? null // Don't highlight anything once user has searched (unless showing filter step)
          : (currentView === 'homepage' ? '.hero-search' : '.add-stream-btn-header')),
      position: showFilterStep
        ? "top-left" // Top left for filter step
        : (userHasSearched ? "top" : (currentView === 'homepage' ? "bottom" : "bottom-left"))
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
        
        // Auto-advance to completion when transitioning from homepage to stream-view
        if (prevCurrentViewRef.current === 'homepage' && currentView === 'stream-view' && currentStep === 2) {
          console.log('User navigated to stream view after step 2, advancing to step 3');
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
    if (currentStep < 2) {
      // Mark current step as completed when manually advancing
      setStepCompleted(prev => ({ ...prev, [currentStep]: true }));
      setCurrentStep(currentStep + 1);
    } else {
      // Step 2 completed - close this wizard (other wizard will handle steps 3-6)
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
      // Reset search state when going back to step 1
      if (currentStep === 2) {
        setUserHasSearched(false);
        setShowFilterStep(false);
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    // Mark wizard as completed
    localStorage.setItem('streambuddy_quickstart_completed', 'true');
    // Reset search state
    setUserHasSearched(false);
    setShowFilterStep(false);
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('streambuddy_quickstart_completed', 'true');
    // Reset search state
    setUserHasSearched(false);
    setShowFilterStep(false);
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
    <div className={`quickstart-wizard-overlay`} ref={overlayRef}>
      {/* Backdrop with highlight cutout */}
      <div 
        className={`wizard-backdrop ${showFilterStep ? 'top-left-position' : (userHasSearched ? 'top-position' : '')}`}
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
              <span className="wizard-step-number">Step {currentStep} of {totalSteps}</span>
              <div className="wizard-progress-dots">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div 
                    key={i} 
                    className={`progress-dot ${i + 1 === currentStep ? 'current' : ''} ${stepCompleted[i + 1] ? 'completed' : ''} ${i + 1 < currentStep ? 'active' : ''}`}
                  />
                ))}
              </div>
            </div>
            <button className="wizard-close-btn" onClick={() => {
              setUserHasSearched(false);
              setShowFilterStep(false);
              onClose();
            }}>
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