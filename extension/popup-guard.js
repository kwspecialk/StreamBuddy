// Optional. Runs in the page's main world, in every frame, while the popup
// blocking option is on. It stops window.open only in frames inside StreamBuddy,
// so other sites keep working (sign-in popups, for example).
(() => {
  const APP_ORIGIN = /^(http:\/\/(localhost|127\.0\.0\.1)(:\d+)?|https:\/\/([^/]+\.)?streambuddy\.cc)$/;

  const ancestors = window.location.ancestorOrigins;
  if (!ancestors?.length || !APP_ORIGIN.test(ancestors[ancestors.length - 1])) return;

  const createFakeWindow = () => ({
    closed: false,
    opener: window,
    location: { href: 'about:blank' },
    document: { write() {}, close() {} },
    focus() {},
    blur() {},
    close() {
      this.closed = true;
    }
  });

  // A Proxy keeps .name and still prints as native code, unlike a plain function.
  // Scripts that see null retry or report a blocker, so hand back a fake window.
  window.open = new Proxy(window.open, {
    apply: () => createFakeWindow()
  });
})();
