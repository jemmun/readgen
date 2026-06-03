import axios from 'axios';
import { Platform } from 'react-native';

const API_BASE_URL = Platform.OS === 'web'
  ? '/api'
  : 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default client;
