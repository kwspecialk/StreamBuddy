// Make a non-button element behave like a button for keyboard and screen readers
export const clickableProps = (onActivate, label) => ({
  role: 'button',
  tabIndex: 0,
  'aria-label': label,
  onClick: onActivate,
  onKeyDown: (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
    }
  }
});
