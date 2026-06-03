// Polyfills for older browsers (IE11 support)

if (typeof Promise === 'undefined') {
  console.warn('Promise is not available. Please install promise-polyfill for IE11 support.');
}

if (typeof Object.assign !== 'function') {
  Object.assign = function (target: any, ...sources: any[]) {
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    const to = Object(target);
    for (let index = 0; index < sources.length; index++) {
      const nextSource = sources[index];
      if (nextSource != null) {
        for (const nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

if (!Array.from) {
  Array.from = function (obj: any) {
    return Array.prototype.slice.call(obj);
  };
}

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function (search: string, pos?: number) {
    return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
  };
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function (search: string, len?: number) {
    if (len === undefined || len > this.length) {
      len = this.length;
    }
    return this.substring(len - search.length, len) === search;
  };
}

if (!Number.isNaN) {
  Number.isNaN = function (value: any) {
    return value !== value;
  };
}

if (!Number.isFinite) {
  Number.isFinite = function (value: any) {
    return typeof value === 'number' && isFinite(value);
  };
}

// fetch polyfill check
if (typeof fetch === 'undefined') {
  console.warn('fetch is not available. Please include a fetch polyfill for IE11 support.');
}

// IE11 flexbox helper: ensure min-height works in flex containers (Web only)
if (typeof document !== 'undefined') {
  try {
    const style = document.createElement('style');
    style.textContent = `
      /* IE11 flexbox fallbacks */
      .react-native-scroll-view {
        display: -ms-flexbox;
        display: flex;
        -ms-flex-direction: column;
        flex-direction: column;
      }
      .react-native-scroll-view-content {
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
      }
      /* Ensure buttons are visible in IE11 */
      button {
        overflow: visible;
      }
    `;
    document.head.appendChild(style);
  } catch (error) {
    // Silently ignore on mobile platforms
  }
}
