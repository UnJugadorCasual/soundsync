import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/app';
import 'bulma';
import './styles.scss';
import '../../src/utils/vendor_integrations/sentry';

const mountNode = document.getElementById('app');
ReactDOM.render(<App />, mountNode);

// @ts-ignore
window.soundsyncDebug = () => {
  localStorage['soundsync:debug'] = true;
  localStorage.debug = "soundsync,soundsync:*,-soundsync:timekeeper,-soundsync:*:timekeepResponse,-soundsync:*:timekeepRequest,-soundsync:*:peerDiscovery,-soundsync:api,-soundsync:wrtcPeer:*:soundState,-soundsync:*:librespot,-soundsync:*:peerSoundState,-soundsync:*:peerConnectionInfo,soundsync:audioSinkDebug";
  document.location.reload();
}
