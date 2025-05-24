import React, { useState } from 'react';
import { Plus } from 'lucide-react';

const AddStreamButton = ({ onToggleSidebar, isSidebarCollapsed }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button 
      className="add-stream-fab"
      onClick={onToggleSidebar}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Add Stream"
    >
      <div className="fab-icon">
        <Plus size={24} />
      </div>
      <span className="fab-text">Add Stream</span>
    </button>
  );
};

export default AddStreamButton;