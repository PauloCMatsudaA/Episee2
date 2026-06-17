// src/utils/authEvents.js
// Event emitter leve para comunicar 401 do api.js → AuthContext
import { EventEmitter } from 'eventemitter3';

const authEvents = new EventEmitter();

export const AUTH_EVENTS = {
  UNAUTHORIZED: 'unauthorized',
};

export default authEvents;
