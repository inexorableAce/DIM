import { bootstrap } from 'angular';
import 'babel-polyfill';
// Promise.finally isn't in the base polyfill
import 'core-js/fn/promise/finally';

import './app/google';
import './app/exceptions';

// Initialize the main DIM app
import './app/app.module';

import './scss/main.scss';

import { initi18n } from './app/i18n';

// Drag and drop
import { polyfill } from "mobile-drag-drop";
import 'mobile-drag-drop/default.css';

import registerServiceWorker from './register-service-worker';

polyfill({
  holdToDrag: 300
});

// https://github.com/timruffles/ios-html5-drag-drop-shim/issues/77
window.addEventListener('touchmove', () => { return; });

if ($DIM_FLAVOR !== 'dev') {
  registerServiceWorker();
}

initi18n().then(() => {
  bootstrap(document.body, ['app'], { strictDi: true });
});
