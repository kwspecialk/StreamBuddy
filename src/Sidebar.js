import React from 'react';

const Sidebar = ({ 
  isCollapsed, 
  toggleSidebar, 
  videoUrls, 
  onReorderUrls,
  onDeleteUrl,
  activeVideoId,
  onVolumeChange,
  onVideoSelect,
  volume,
  onAddUrl,
  onExportUrls,
  onFileUpload
}) => {
  const moveUrl = (index, direction) => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === videoUrls.length - 1)
    ) {
      return;
    }

    const newUrls = [...videoUrls];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newUrls[index], newUrls[targetIndex]] = [newUrls[targetIndex], newUrls[index]];
    onReorderUrls(newUrls);
  };

  return (
    <>
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {isCollapsed ? '☰' : '←'}
      </button>
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="url-input-group">
          <input type="text" placeholder="Enter video URL" />
          <div className="button-group">
            <button onClick={() => onAddUrl(document.querySelector("input").value)}>
              Add Video
            </button>
            <button onClick={onExportUrls}>Export</button>
            <label htmlFor="file-upload" className="custom-file-upload">
              Import
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".txt"
              style={{ display: 'none' }}
              onChange={onFileUpload}
            />
          </div>
        </div>

        <div className="volume-controls">
          <div className="volume-selector">
            <label>Active Video:</label>
            <select 
              value={activeVideoId || ''} 
              onChange={(e) => onVideoSelect(e.target.value)}
            >
              <option value="">None (All Muted)</option>
              {videoUrls.map((_, index) => (
                <option key={index} value={index}>
                  Window {index + 1}
                </option>
              ))}
            </select>
          </div>
          {activeVideoId !== null && (
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="volume-slider"
            />
          )}
        </div>

        <div className="url-list">
          <h3>Video Order</h3>
          {videoUrls.map((url, index) => (
            <div key={index} className="url-item">
              <div className="url-item-content">
                <span className="window-number">{index + 1}</span>
                <div className="url-text">{url}</div>
                <div className="url-controls">
                  <button 
                    className="move-button"
                    onClick={() => moveUrl(index, 'up')}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button 
                    className="move-button"
                    onClick={() => moveUrl(index, 'down')}
                    disabled={index === videoUrls.length - 1}
                  >
                    ↓
                  </button>
                  <button 
                    className="delete-button"
                    onClick={() => onDeleteUrl(url)}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Sidebar;