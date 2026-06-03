import { Platform } from 'react-native';

/**
 * API base URL — auto-detected, no manual configuration needed.
 *
 *   Dev (Expo Go / web dev server):
 *     - Web / iOS:      http://localhost:8000
 *     - Android:        http://10.0.2.2:8000
 *
 *   Production (expo export → nginx):
 *     - Relative /api, nginx proxies to backend on the same origin.
 */

const API_BASE_URL: string = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : 'http://localhost:8000'
  : '/api';

export default API_BASE_URL;
