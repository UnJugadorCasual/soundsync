import { SharedState } from '../coordinator/shared_state';
import { RPCType } from './rpc/rpc';
import { Peer, PeerDescriptor } from './peer';
import {
  BaseSourceDescriptor, SourceDescriptor,
} from '../audio/sources/source_type';
import { BaseSinkDescriptor } from '../audio/sinks/sink_type';
import { AudioInstance } from '../audio/utils';

export interface BaseMessage {
  type;
}

export interface LightMessage extends BaseMessage {
  type: 'requestSoundState' | 'disconnect';
}

export interface SourcePatchMessage extends BaseMessage {
  type: 'sourcePatch';
  source: Partial<AudioInstance<BaseSourceDescriptor>>;
}

export interface SourceCreateMessage extends BaseMessage {
  type: 'sourceCreate';
  source: SourceDescriptor;
}

export interface SourceDeleteMessage extends BaseMessage {
  type: 'sourceDelete';
  sourceUuid: string;
}

export interface SinkPatchMessage extends BaseMessage {
  type: 'sinkPatch';
  sink: Partial<AudioInstance<BaseSinkDescriptor>>;
}

export interface PeerConnectionInfoMessage extends BaseMessage {
  type: 'peerConnectionInfo';
  messageUuid: string; // this is used to deduplicate messages as they are broadcasted to everyone
  targetUuid: string;
  senderUuid: string;
  senderVersion: string;
  initiatorUuid: string;
  senderInstanceUuid: string;
  description?: RTCSessionDescription;
  candidate?: RTCIceCandidate;
}

export interface TimekeepRequest extends BaseMessage {
  type: 'timekeepRequest';
  sentAt: number;
}

export interface TimekeepResponse extends BaseMessage {
  type: 'timekeepResponse';
  sentAt: number;
  respondedAt: number;
}

export interface PeerSoundStateMessage extends BaseMessage {
  type: 'peerSoundState';
  sources: AudioInstance<BaseSourceDescriptor>[];
  sinks: AudioInstance<BaseSinkDescriptor>[];
}

export interface PeerDiscoveryMessage extends BaseMessage {
  type: 'peerDiscovery';
  peersUuid: string[];
}

export interface PeerInfoMessage extends BaseMessage {
  type: 'peerInfo';
  peer: PeerDescriptor;
  sharedState?: SharedState;
}

export interface RPCMessage extends BaseMessage {
  type: 'rpc';
  rpcType: RPCType;
  uuid: string;
  body?: any;
  isResponse: boolean;
  isError?: boolean;
}

export type ControllerMessage =
  LightMessage |
  SourcePatchMessage |
  SourceCreateMessage |
  SourceDeleteMessage |
  SinkPatchMessage |
  PeerConnectionInfoMessage |
  TimekeepRequest | TimekeepResponse |
  PeerDiscoveryMessage |
  PeerInfoMessage |
  PeerSoundStateMessage |
  RPCMessage;

type ControllerMessageSingleHandler<T extends BaseMessage, Y> = ((type: T['type'], handler: (message: T, peer: Peer) => any) => Y);

export type ControllerMessageHandler<T> =
  ControllerMessageSingleHandler<LightMessage, T> &
  ControllerMessageSingleHandler<SourcePatchMessage, T> &
  ControllerMessageSingleHandler<SourceCreateMessage, T> &
  ControllerMessageSingleHandler<SourceDeleteMessage, T> &
  ControllerMessageSingleHandler<SinkPatchMessage, T> &
  ControllerMessageSingleHandler<PeerConnectionInfoMessage, T> &
  ControllerMessageSingleHandler<TimekeepRequest, T> &
  ControllerMessageSingleHandler<TimekeepResponse, T> &
  ControllerMessageSingleHandler<PeerDiscoveryMessage, T> &
  ControllerMessageSingleHandler<PeerInfoMessage, T> &
  ControllerMessageSingleHandler<PeerSoundStateMessage, T> &
  ControllerMessageSingleHandler<RPCMessage, T>;
