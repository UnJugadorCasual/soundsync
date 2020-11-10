import { EventEmitter } from 'events';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import { l } from '../utils/environment/log';
import { AirplaySink } from './sinks/airplay_sink';
import { onExit } from '../utils/on_exit';
import { assertNever } from '../utils/misc';
import { HueLightSink } from './sinks/huelight_sink';
import { ShairportSource } from './sources/shairport_souce';
import { WebAudioSink } from './sinks/webaudio_sink';
import { AudioSource } from './sources/audio_source';
import { LibrespotSource } from './sources/librespot_source';
import { SourceDescriptor, SourceUUID } from './sources/source_type';
import { RemoteSource } from './sources/remote_source';
import { AudioSink } from './sinks/audio_sink';
import { SinkDescriptor, SinkUUID } from './sinks/sink_type';
import { LocalDeviceSink } from './sinks/localdevice_sink';
import { RemoteSink } from './sinks/remote_sink';
import { getConfigField, updateConfigArrayItem, deleteConfigArrayItem } from '../coordinator/config';
import { audioApiSupportsLoopback, getAudioDevices, onAudioDevicesChange } from '../utils/audio/localAudioDevice';
import { NullSource } from './sources/null_source';
import { NullSink } from './sinks/null_sink';
import { getLocalPeer } from '../communication/local_peer';
import { LocalDeviceSource } from './sources/localdevice_source';

const log = l.extend(`sourcesSinksManager`);

export class AudioSourcesSinksManager extends EventEmitter {
  autodetect: boolean;
  sources: AudioSource[] = [];
  sinks: AudioSink[] = [];

  constructor() {
    super();
    const updateConfigForSource = (source: AudioSource) => {
      if (source.local) {
        updateConfigArrayItem('sources', source);
      }
    };
    const updateConfigForSink = (sink: AudioSink) => {
      if (sink.local) {
        updateConfigArrayItem('sinks', sink);
      }
    };
    this.on('sourceUpdate', updateConfigForSource);
    this.on('newLocalSource', updateConfigForSource);

    this.on('sinkUpdate', updateConfigForSink);
    this.on('newLocalSink', updateConfigForSink);
    onExit(async () => {
      await Promise.all(this.sinks.map(async (sink) => {
        if (sink.local) {
          await sink._stopSink();
        }
      }));
    });
    this.setMaxListeners(500);
  }

  autodetectDevices = () => {
    log(`Detecting local audio devices`);
    const audioDevices = getAudioDevices();
    onAudioDevicesChange(this.autodetectDevices);
    audioDevices.outputDevices.forEach((device) => {
      if (device.state !== 'enabled') {
        return;
      }
      this.addSink({
        type: 'localdevice',
        deviceId: device.id,
        name: device.name,
        uuid: uuidv4(),
        peerUuid: getLocalPeer().uuid,
        volume: 1,
        pipedFrom: null,
        available: true,
      });
    });
    audioDevices.inputDevices.forEach((device) => {
      if (device.state !== 'enabled') {
        return;
      }
      this.addSource({
        type: 'localdevice',
        uuid: uuidv4(),
        deviceId: device.id,
        name: device.name,
        peerUuid: getLocalPeer().uuid,
        available: true,
        active: false,
        started: false,
      });
    });
    if (audioApiSupportsLoopback()) {
      audioDevices.outputDevices.forEach((device) => {
        if (device.state !== 'enabled') {
          return;
        }
        this.addSource({
          type: 'localdevice',
          deviceId: device.id,
          name: device.name.includes('monitor') ? device.name : `${device.name} (monitor)`,
          uuid: uuidv4(),
          peerUuid: getLocalPeer().uuid,
          available: true,
          active: false,
          started: false,
          isLoopback: true,
        });
      });
    }
  }

  getSourceByUuid = (uuid: SourceUUID) => _.find(this.sources, { uuid });
  getSinkByUuid = (uuid: SinkUUID) => _.find(this.sinks, { uuid });

  addSource(sourceDescriptor: SourceDescriptor) {
    if (this.getSourceByUuid(sourceDescriptor.uuid)) {
      this.getSourceByUuid(sourceDescriptor.uuid).updateInfo(sourceDescriptor);
      return;
    }
    if (sourceDescriptor.type === 'localdevice' && sourceDescriptor.peerUuid === getLocalPeer().uuid) {
      // when auto detecting localdevices sources on local host, we cannot compare with the uuid
      // so we need to compare with the device id to see if we need to update the existing
      // or add a new Source
      const existingSource = _.find(this.sources, (source) => source instanceof LocalDeviceSource
        && source.deviceId === sourceDescriptor.deviceId
        && source.peerUuid === sourceDescriptor.peerUuid);
      if (existingSource) {
        return;
      }
    }

    const isLocal = !sourceDescriptor.peerUuid || sourceDescriptor.peerUuid === getLocalPeer().uuid;
    log(`Adding source ${sourceDescriptor.name} of type ${sourceDescriptor.type}`);
    let source;
    // TODO: lazy load every source type to prevent unused load on webui
    if (!isLocal) {
      source = new RemoteSource(sourceDescriptor, this);
    } else if (sourceDescriptor.type === 'librespot') {
      source = new LibrespotSource(sourceDescriptor, this);
    } else if (sourceDescriptor.type === 'null') {
      source = new NullSource(sourceDescriptor, this);
    } else if (sourceDescriptor.type === 'localdevice') {
      source = new LocalDeviceSource(sourceDescriptor, this);
    } else if (sourceDescriptor.type === 'shairport') {
      source = new ShairportSource(sourceDescriptor, this);
    } else {
      assertNever(sourceDescriptor);
    }

    this.sources.push(source);
    if (source.local) {
      this.emit('newLocalSource', source);
      this.emit('localSoundStateUpdated');
    }
    this.emit('soundstateUpdated');
  }

  removeSource(uuid: string) {
    const source = this.getSourceByUuid(uuid);
    if (!source) {
      log(`Tried to remove unknown source ${uuid}, ignoring`);
      return;
    }
    source.stop();
    log(`Removing source ${source.name} (type: ${source.type} uuid: ${uuid})`);
    this.sources = _.filter(this.sources, (s) => s.uuid !== uuid);
    this.emit('soundstateUpdated');
    if (source.local) {
      this.emit('localSoundStateUpdated');
      deleteConfigArrayItem('sources', source.toDescriptor());
    }
  }

  addSink(sinkDescriptor: SinkDescriptor) {
    if (sinkDescriptor.uuid && this.getSinkByUuid(sinkDescriptor.uuid)) {
      this.getSinkByUuid(sinkDescriptor.uuid).updateInfo(sinkDescriptor);
      return;
    }
    if (sinkDescriptor.type === 'localdevice' && sinkDescriptor.peerUuid === getLocalPeer().uuid) {
      // when auto detecting localdevice devices on local host, we cannot compare with the uuid
      // so we need to compare with the device name to see if we need to update the existing
      // or add a new Sink
      const existingSink = _.find(this.sinks, (sink) => sink instanceof LocalDeviceSink
        && sink.deviceId === sinkDescriptor.deviceId
        && sink.peerUuid === sinkDescriptor.peerUuid);
      if (existingSink) {
        return;
      }
    }
    if (sinkDescriptor.type === 'webaudio' && sinkDescriptor.peerUuid === getLocalPeer().uuid) {
      // Only one webaudio sink per browser can be created, if trying to create a new local one, update the existing
      const existingSink = _.find(this.sinks, (sink) => sink instanceof WebAudioSink
        && sink.peerUuid === sinkDescriptor.peerUuid);
      if (existingSink) {
        existingSink.updateInfo(sinkDescriptor);
        return;
      }
    }

    log(`Adding sink  ${sinkDescriptor.name} of type ${sinkDescriptor.type}`);
    let sink: AudioSink;
    const isLocal = !sinkDescriptor.peerUuid || sinkDescriptor.peerUuid === getLocalPeer().uuid;
    // TODO: lazy load every sink type to prevent unused load on webui
    if (!isLocal) {
      sink = new RemoteSink(sinkDescriptor, this);
    } else if (sinkDescriptor.type === 'localdevice') {
      sink = new LocalDeviceSink(sinkDescriptor, this);
    } else if (sinkDescriptor.type === 'null') {
      sink = new NullSink(sinkDescriptor, this);
    } else if (sinkDescriptor.type === 'webaudio') {
      sink = new WebAudioSink(sinkDescriptor, this);
    } else if (sinkDescriptor.type === 'huelight') {
      sink = new HueLightSink(sinkDescriptor, this);
    } else if (sinkDescriptor.type === 'airplay') {
      sink = new AirplaySink(sinkDescriptor, this);
    } else {
      assertNever(sinkDescriptor);
    }

    this.sinks.push(sink);
    if (sink.local) {
      this.emit('newLocalSink', sink);
      this.emit('localSoundStateUpdated');
    }
    this.emit('soundstateUpdated');
  }

  removeSink(uuid: string) {
    const sink = this.getSinkByUuid(uuid);
    if (!sink) {
      log(`Tried to remove unknown sink ${uuid}, ignoring`);
      return;
    }
    // TODO: stop sink
    log(`Removing sink ${sink.name} (type: ${sink.type} uuid: ${uuid})`);
    this.sinks = _.filter(this.sinks, (s) => s.uuid !== uuid);
    this.emit('soundstateUpdated');
    if (sink.local) {
      this.emit('localSoundStateUpdated');
      deleteConfigArrayItem('sinks', sink.toDescriptor());
    }
  }

  addFromConfig() {
    const sources = getConfigField('sources');
    sources.forEach((source) => {
      this.addSource({
        ...source,
        peerUuid: getLocalPeer().uuid,
      });
    });
    const sinks = getConfigField('sinks');
    sinks.forEach((sink) => {
      this.addSink({
        ...sink,
        peerUuid: getLocalPeer().uuid,
      });
    });
  }
}
