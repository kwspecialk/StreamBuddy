import React, { useState } from 'react';
import { X, RefreshCw, Plus, GripVertical } from 'lucide-react';
import { LAYOUTS } from '../layouts';

const EditStreamsModal = ({ 
  isOpen, 
  onClose, 
  videoUrls,
  onDeleteStream,
  onRefreshStream,
  onReorderStreams,
  onOpenStreamBrowser,
  formatApiUrl,
  sourceIndices,
  onCycleSource,
  currentLayout,
  onLayoutChange
}) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [refreshingStreams, setRefreshingStreams] = useState(new Set());
  const [isLayoutMenuVisible, setLayoutMenuVisible] = useState(false);

  if (!isOpen) return null;

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Only update if we're dragging over a different item
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e) => {
    // Only clear drag over if we're leaving the entire item
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const newUrls = [...videoUrls];
      const draggedUrl = newUrls[draggedIndex];
      
      // Remove dragged item
      newUrls.splice(draggedIndex, 1);
      
      // Insert at new position
      const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
      newUrls.splice(insertIndex, 0, draggedUrl);
      
      onReorderStreams(newUrls);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleRefreshStream = async (url, index) => {
    setRefreshingStreams(prev => new Set([...prev, index]));
    
    try {
      // If stream has multiple sources, cycle to next source
      if (sourceIndices[url]?.match?.sources?.length > 1) {
        await onCycleSource(url, index);
      } else {
        // Otherwise just refresh the stream
        await onRefreshStream(url, index);
      }
    } catch (error) {
      console.error('Error refreshing stream:', error);
    } finally {
      setTimeout(() => {
        setRefreshingStreams(prev => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }, 1000);
    }
  };

  const getStreamTitle = (url, index) => {
    // First check if we have match info from sourceIndices
    const urlData = sourceIndices[url];
    if (urlData?.match?.title) {
      return urlData.match.title;
    }
    
    // Try to format the URL to get a meaningful name
    const formatted = formatApiUrl(url);
    if (formatted !== url) {
      return formatted;
    }
    
    // If URL contains recognizable patterns, extract content name
    if (url.includes('vidsrc.xyz') || url.includes('2embed.cc')) {
      // Extract movie/show info from on-demand URLs
      const movieMatch = url.match(/\/movie\/(\d+)/);
      const tvMatch = url.match(/\/tv\/(\d+)/);
      if (movieMatch) {
        return `Movie (ID: ${movieMatch[1]})`;
      }
      if (tvMatch) {
        return `TV Show (ID: ${tvMatch[1]})`;
      }
      return 'On-Demand Content';
    }
    
    // Last resort - use Stream + number
    return `Stream ${index + 1}`;
  };

  const getSourceInfo = (url) => {
    const urlData = sourceIndices[url];
    if (urlData?.match?.sources?.length > 1) {
      return `Source ${urlData.sourceIndex + 1}/${urlData.match.sources.length}`;
    }
    return null;
  };

  const getLayoutPreview = (layoutId, streamCount) => {
    const getPreviewBoxes = () => {
      switch(layoutId) {
        case 'single':
          return [{ width: '100%', height: '100%', number: streamCount >= 1 ? 1 : null }];
        case 'dual':
          return [
            { width: '49%', height: '100%', left: '0%', number: streamCount >= 1 ? 1 : null },
            { width: '49%', height: '100%', left: '51%', number: streamCount >= 2 ? 2 : null }
          ];
        case 'triple':
          return [
            { width: '63%', height: '100%', left: '0%', number: streamCount >= 1 ? 1 : null },
            { width: '35%', height: '49%', left: '65%', top: '0%', number: streamCount >= 2 ? 2 : null },
            { width: '35%', height: '49%', left: '65%', top: '51%', number: streamCount >= 3 ? 3 : null }
          ];
        case 'quad':
          return [
            { width: '49%', height: '49%', left: '0%', top: '0%', number: streamCount >= 1 ? 1 : null },
            { width: '49%', height: '49%', left: '51%', top: '0%', number: streamCount >= 2 ? 2 : null },
            { width: '49%', height: '49%', left: '0%', top: '51%', number: streamCount >= 3 ? 3 : null },
            { width: '49%', height: '49%', left: '51%', top: '51%', number: streamCount >= 4 ? 4 : null }
          ];
        case 'two-plus-four':
          return [
            { width: '63%', height: '49%', left: '0%', top: '0%', number: streamCount >= 1 ? 1 : null },
            { width: '63%', height: '49%', left: '0%', top: '51%', number: streamCount >= 2 ? 2 : null },
            { width: '35%', height: '24%', left: '65%', top: '0%', number: streamCount >= 3 ? 3 : null },
            { width: '35%', height: '24%', left: '65%', top: '25.5%', number: streamCount >= 4 ? 4 : null },
            { width: '35%', height: '24%', left: '65%', top: '51%', number: streamCount >= 5 ? 5 : null },
            { width: '35%', height: '24%', left: '65%', top: '76.5%', number: streamCount >= 6 ? 6 : null }
          ];
        case 'grid-3x3':
          return Array.from({ length: 9 }, (_, i) => ({
            width: '32%',
            height: '32%',
            left: `${(i % 3) * 34}%`,
            top: `${Math.floor(i / 3) * 34}%`,
            number: streamCount > i ? i + 1 : null
          }));
        case 'grid-5x2':
          return Array.from({ length: 10 }, (_, i) => ({
            width: '19%',
            height: '49%',
            left: `${(i % 5) * 20.25}%`,
            top: `${Math.floor(i / 5) * 51}%`,
            number: streamCount > i ? i + 1 : null
          }));
        case 'grid-infinite':
          const gridBoxes = Array.from({ length: Math.min(streamCount, 8) }, (_, i) => ({
            width: '32%',
            height: '32%',
            left: `${(i % 3) * 34}%`,
            top: `${Math.floor(i / 3) * 34}%`,
            number: i + 1
          }));
          if (streamCount > 8) {
            gridBoxes.push({ width: '8%', height: '8%', left: '92%', top: '92%', number: '...' });
          }
          return gridBoxes;
        default:
          return [{ width: '100%', height: '100%', number: streamCount >= 1 ? 1 : null }];
      }
    };

    return (
      <div className="layout-preview-mini">
        {getPreviewBoxes().map((box, index) => (
          <div
            key={index}
            className={`layout-preview-box-mini ${box.number ? 'active' : 'inactive'}`}
            style={{
              width: box.width,
              height: box.height,
              left: box.left || '0%',
              top: box.top || '0%'
            }}
          >
            {box.number && (
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
    <div className="edit-streams-backdrop" onClick={onClose}>
      <div className="edit-streams-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-modal-header">
          <div className="header-left">
            <div>
              <h2>Edit Streams</h2>
              <p>Manage your current streams ({videoUrls.length} active)</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Stream List */}
        <div className="edit-modal-content">
          {videoUrls.length === 0 ? (
            <div className="empty-streams-state">
              <div className="empty-icon">📺</div>
              <h3>No streams active</h3>
              <p>Add some streams to get started</p>
            </div>
          ) : (
            <div className="streams-list">
              {videoUrls.map((url, index) => {
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;
                const isRefreshing = refreshingStreams.has(index);
                const sourceInfo = getSourceInfo(url);
                
                return (
                  <div
                    key={`${url}-${index}`}
                    className={`stream-item ${
                      isDragging ? 'dragging' : ''
                    } ${
                      isDragOver ? 'drag-over' : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="stream-item-content">
                      {/* Drag Handle */}
                      <div className="drag-handle">
                        <GripVertical size={16} />
                      </div>
                      
                      {/* Window Number */}
                      <div className="window-indicator">
                        <span className="window-number">{index + 1}</span>
                      </div>
                      
                      {/* Stream Info */}
                      <div className="stream-info">
                        <div className="stream-title">
                          {getStreamTitle(url, index)}
                        </div>
                        {sourceInfo && (
                          <div className="stream-source">
                            {sourceInfo}
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="stream-actions">
                        <button
                          className={`action-btn refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
                          onClick={() => handleRefreshStream(url, index)}
                          disabled={isRefreshing}
                          title={sourceInfo ? 'Cycle Source' : 'Refresh Stream'}
                        >
                          <RefreshCw size={16} />
                        </button>
                        
                        <button
                          className="action-btn delete-btn"
                          onClick={() => onDeleteStream(url)}
                          title="Remove Stream"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="edit-modal-footer">
          <div className="footer-left">
            <button 
              className="add-stream-btn"
              onClick={() => {
                onClose();
                onOpenStreamBrowser();
              }}
            >
              <Plus size={20} />
              <span>Add Stream</span>
            </button>
            
            <div className="current-layout-container">
              <button 
                className="current-layout-preview clickable"
                onClick={() => setLayoutMenuVisible(!isLayoutMenuVisible)}
                title="Click to change layout"
              >
                {getLayoutPreview(currentLayout, videoUrls.length)}
              </button>
              
              {isLayoutMenuVisible && (
                <div className="layout-dropdown">
                  <div className="layout-dropdown-header">
                    <h4>Choose Layout</h4>
                    <p>Select how to arrange your streams</p>
                  </div>
                  
                  <div className="layout-dropdown-options">
                    {Object.entries(LAYOUTS).map(([id, layout]) => (
                      <button
                        key={id}
                        className={`layout-dropdown-option ${currentLayout === id ? 'selected' : ''}`}
                        onClick={() => {
                          onLayoutChange(id);
                          setLayoutMenuVisible(false);
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
              )}
              
              {/* Backdrop to close dropdown */}
              {isLayoutMenuVisible && (
                <div 
                  className="layout-dropdown-backdrop"
                  onClick={() => setLayoutMenuVisible(false)}
                />
              )}
            </div>
          </div>
          
          <div className="footer-tip">
            💡 Drag streams to reorder • {videoUrls.length} of {currentLayout === 'grid-infinite' ? '∞' : '12'} streams
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditStreamsModal;