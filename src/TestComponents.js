// Test file to check for common issues
import React from 'react';

// Import all our new components to check for syntax errors
import QuickStart from './components/QuickStart';
import LayoutSelector from './LayoutSelector';

// Basic smoke test
const TestComponents = () => {
  const testMatches = [
    {
      id: 1,
      title: "Test Match",
      popular: true,
      sources: [{ source: 'test', id: '123' }]
    }
  ];

  const handleQuickStartComplete = (data) => {
    console.log('QuickStart completed:', data);
  };

  const handleLayoutChange = (layout) => {
    console.log('Layout changed:', layout);
  };

  return (
    <div>
      <h1>Component Test</h1>
      
      {/* Test QuickStart */}
      <div style={{ display: 'none' }}>
        <QuickStart 
          onComplete={handleQuickStartComplete}
          matches={testMatches}
          isLoading={false}
        />
      </div>
      
      {/* Test LayoutSelector */}
      <LayoutSelector
        onLayoutChange={handleLayoutChange}
        currentLayout="dual"
      />
    </div>
  );
};

export default TestComponents;