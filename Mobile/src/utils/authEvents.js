import { EventEmitter } from 'eventemitter3';

const authEvents = new EventEmitter();

export const AUTH_EVENTS = {
  UNAUTHORIZED: 'unauthorized',
};

export default authEvents;
