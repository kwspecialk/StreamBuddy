# StreamBuddy Design System Implementation Guide

## 🎨 Overview

This design system refactor creates a consistent, modular, and maintainable CSS architecture for your StreamBuddy application. The system is built with design tokens, reusable components, and follows modern CSS best practices.

## 📁 File Structure

```
src/styles/
├── variables.css      # Design tokens (colors, spacing, typography, etc.)
├── reset.css         # Modern CSS reset and base styles
├── buttons.css       # Button component styles
├── forms.css         # Form component styles  
├── modals.css        # Modal component styles
├── layout.css        # Layout utilities and components
└── main.css          # Main stylesheet that imports everything + utilities
```

## 🚀 Implementation Steps

### Step 1: Update Your Main CSS Import

Replace your current CSS imports in `/src/index.js` or `/src/App.js`:

```javascript
// Remove these old imports:
// import './index.css';
// import './App.css';

// Add this single import:
import './styles/main.css';
```

### Step 2: Update Component Imports

For each component, you can now remove individual CSS imports and rely on the global design system:

```javascript
// OLD - Remove these:
// import './EditStreamsModal.css';
// import './StreamBrowserModal.css';

// NEW - The main stylesheet handles everything
// Just import the component file
```

### Step 3: Migrate Component Classes

Update your component JSX to use the new standardized classes:

#### Buttons
```jsx
// OLD
<button className="watch-now-btn">Watch Now</button>

// NEW  
<button className="btn btn--primary btn--lg">Watch Now</button>
<button className="btn btn--secondary btn--md">Cancel</button>
<button className="btn btn--icon btn--close">×</button>
```

#### Modals
```jsx
// OLD
<div className="stream-browser-backdrop">
  <div className="stream-browser-modal">
    <div className="browser-modal-header">

// NEW
<div className="modal-backdrop">
  <div className="modal modal--lg">
    <div className="modal__header modal__header--accent">
```

#### Forms
```jsx
// OLD
<input className="search-input" type="text" />

// NEW
<input className="form-input" type="text" />
<input className="form-search__input" type="text" />
```

## 🎯 Key Design Tokens

### Colors
- **Primary**: `var(--color-p)` (#25815F)
- **Secondary**: `var(--color-s)` (#56B77A) 
- **Accent**: `var(--color-butterscotch)` (#DE8C3A)
- **Text**: `var(--color-text-primary)` (white)
- **Muted**: `var(--color-text-muted)` (#9ca3af)

### Spacing Scale
- **XS**: `var(--space-xs)` (4px)
- **SM**: `var(--space-sm)` (8px)
- **MD**: `var(--space-md)` (12px)
- **LG**: `var(--space-lg)` (16px)
- **XL**: `var(--space-xl)` (24px)
- **2XL**: `var(--space-2xl)` (32px)

### Typography Scale
- **XS**: `var(--font-size-xs)` (12px)
- **SM**: `var(--font-size-sm)` (14px)
- **Base**: `var(--font-size-base)` (16px)
- **LG**: `var(--font-size-lg)` (18px)
- **XL**: `var(--font-size-xl)` (20px)
- **2XL**: `var(--font-size-2xl)` (24px)
- **3XL**: `var(--font-size-3xl)` (30px)

## 🔧 Component Migration Examples

### EditStreamsModal
```jsx
// Update the modal structure
<div className="modal-backdrop" onClick={onClose}>
  <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>
    <div className="modal__header modal__header--accent">
      <div className="modal__header-content">
        <h2 className="modal__title">Manage Streams</h2>
        <p className="modal__subtitle">Add, remove, or reorder streams ({videoUrls.length} active)</p>
      </div>
      <button className="btn btn--close modal__close" onClick={onClose}>
        <X size={24} />
      </button>
    </div>
    
    <div className="modal__content">
      {/* Stream list content */}
    </div>
    
    <div className="modal__footer">
      <div className="modal__actions">
        <button className="btn btn--primary">
          <Plus size={20} />
          Add Stream
        </button>
        <button className="btn btn--danger" disabled={videoUrls.length === 0}>
          <Trash2 size={16} />
          Clear All
        </button>
      </div>
    </div>
  </div>
</div>
```

### StreamBrowserModal
```jsx
<div className="modal-backdrop">
  <div className="modal modal--xl">
    <div className="modal__header">
      <div className="modal__header-content">
        <h2 className="modal__title">Browse Content</h2>
        <p className="modal__subtitle">Find movies, TV shows, and live sports</p>
      </div>
      <button className="btn btn--close modal__close">
        <X size={24} />
      </button>
    </div>
    
    <div className="modal__nav">
      <div className="modal__nav-buttons">
        <button className="modal__nav-btn active">Sports</button>
        <button className="modal__nav-btn">Movies</button>
        <button className="modal__nav-btn">TV Shows</button>
      </div>
      
      <div className="modal__search">
        <Search className="modal__search-icon" size={16} />
        <input 
          className="modal__search-input" 
          placeholder="Search content..."
        />
      </div>
    </div>
    
    <div className="modal__content">
      <div className="browser-content-grid">
        {/* Content cards */}
      </div>
    </div>
  </div>
</div>
```

### Homepage Header
```jsx
<header className="header">
  <div className="header__content container">
    <div className="header__logo">
      <h1>StreamBuddy</h1>
    </div>
    
    <nav className="header__nav">
      <button className="header__nav-btn active">Sports</button>
      <button className="header__nav-btn">Movies</button>
      <button className="header__nav-btn">TV Shows</button>
      <button className="header__nav-btn">Player</button>
    </nav>
    
    <div className="header__actions">
      <div className="search">
        <Search className="search__icon" size={16} />
        <input className="search__input" placeholder="Search..." />
      </div>
      <button className="btn btn--icon btn--icon-circle">
        <Maximize2 size={16} />
      </button>
      <button className="btn btn--icon btn--icon-circle">
        <HelpCircle size={16} />
      </button>
      <button className="btn btn--icon btn--icon-circle">
        <User size={16} />
      </button>
    </div>
  </div>
</header>
```

## 🎨 Utility Classes

The design system includes comprehensive utility classes for rapid development:

### Spacing
```jsx
<div className="p-lg m-xl">Padding large, margin extra-large</div>
<div className="mt-md mb-lg">Top margin medium, bottom margin large</div>
```

### Typography
```jsx
<h1 className="text-3xl font-bold text-primary">Main Title</h1>
<p className="text-base text-muted leading-relaxed">Body text</p>
```

### Layout
```jsx
<div className="flex flex--between flex--items-center gap-md">
  <span>Left content</span>
  <span>Right content</span>
</div>

<div className="grid grid--cols-3 gap-lg">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>
```

### Colors & States
```jsx
<div className="bg-dark-surface border border-dark-light rounded-lg">
  <button className="btn btn--primary transition-all hover:scale-105">
    Hover me
  </button>
</div>
```

## 📱 Responsive Design

All components are responsive by default with these breakpoints:
- **XS**: 480px and below
- **SM**: 640px
- **MD**: 768px
- **LG**: 1024px
- **XL**: 1280px
- **2XL**: 1536px

### Responsive Utilities
```jsx
<div className="hidden-mobile">Desktop only</div>
<div className="hidden-desktop">Mobile only</div>
<div className="grid grid--cols-1 md:grid--cols-2 lg:grid--cols-3">
  {/* Responsive grid */}
</div>
```

## 🔍 Z-Index Management

Standardized z-index scale prevents stacking issues:
- **Dropdown**: `var(--z-dropdown)` (1000)
- **Modal Backdrop**: `var(--z-modal-backdrop)` (2000)
- **Modal**: `var(--z-modal)` (2100)
- **Popover**: `var(--z-popover)` (2200)
- **Tooltip**: `var(--z-tooltip)` (2300)
- **Wizard Overlay**: `var(--z-overlay)` (10000)

## 🎯 Migration Priority

Recommended order for migrating components:

1. **High Priority** (Most visible)
   - HomePage header and navigation
   - EditStreamsModal
   - StreamBrowserModal
   - QuickstartWizard

2. **Medium Priority**
   - Sidebar components
   - Form components
   - Card components

3. **Low Priority** (Less visible)
   - Utility components
   - Error boundaries
   - Loading states

## 🚀 Quick Start

1. **Copy the design system files** to `/src/styles/`
2. **Update your main CSS import** in `index.js`
3. **Start with one component** (recommend EditStreamsModal)
4. **Test thoroughly** before moving to the next component
5. **Remove old CSS files** once migration is complete

## 🛠️ Customization

To customize the design system:

1. **Update design tokens** in `variables.css`
2. **Modify component styles** in respective CSS files
3. **Add new utilities** in `main.css`
4. **Test across all components** to ensure consistency

## 💡 Best Practices

- **Use design tokens** instead of hardcoded values
- **Prefer utility classes** for simple styling
- **Create component classes** for complex, reusable patterns
- **Follow the naming convention**: `component__element--modifier`
- **Test on mobile devices** early and often
- **Use semantic HTML** with proper ARIA attributes

## 🐛 Troubleshooting

### Common Issues

**Styles not applying:**
- Check import order in `main.css`
- Ensure CSS custom properties are supported
- Verify class names match exactly

**Z-index conflicts:**
- Use the standardized z-index variables
- Check for `position: relative` on parent elements

**Responsive issues:**
- Test at various screen sizes
- Use browser dev tools to debug breakpoints
- Check for conflicting CSS rules

**Animation performance:**
- Use `transform` and `opacity` for smooth animations
- Add `will-change` property for complex animations
- Test on lower-end devices

## 📞 Need Help?

If you run into issues during migration:
1. Check this README first
2. Compare with the provided examples
3. Test one component at a time
4. Keep the old CSS files as backup until migration is complete

---

**Happy styling! 🎨** Your StreamBuddy app will look more polished and professional with this consistent design system.
