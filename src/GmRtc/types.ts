import { Action, AnyAction, Reducer, Dispatch } from 'redux';
import { EffectsMapObject, SubscriptionsMapObject } from 'dva';
import React from 'react';
import { StateType } from './models/index';
import { IMessageToast } from './MessageToast';
import { ICreateClientParams, resolveProps } from '@/GmRtc/GmRtcClient';
import { IVideoChatMessage } from '@/types/VideoChatMessage';
import {
  Callback,
  ConnectionState,
  NetworkQuality,
  RemoteStreamInfo,
  RemoteUserInfo,
  RtcError,
} from 'trtc-js-sdk';

export type BaseReducers<S = any, A extends Action = AnyAction> = {
  [key: string]: Reducer<S, A>;
};

export interface BaseModel<S = any, A extends Action = AnyAction> {
  namespace: string;
  state?: S;
  reducers?: BaseReducers<S, A>;
  effects?: EffectsMapObject;
  subscriptions?: SubscriptionsMapObject;
}

export interface IUpdateVideoViewParams {
  roomId?: number;
  userId?: string;
}

export interface IGmRtcProps {
  /**  通话弹窗是否可见 */
  visible?: boolean;
  style?: React.CSSProperties;
  className?: string;
  /** 插件 */
  plugins: GmRtcClientPlugin[];
}

/** 插件事件 */
export enum PluginEvent {
  /** 初始化 */
  INITIAL = 'onInitial',
  /** 离开 */
  LEAVE = 'onLeave',
  /** 计时 */
  TICK = 'onTick',
  /** 进房成功 */
  JOIN_SUCCESS = 'onJoinSuccess',
  /** 进房失败 */
  JOIN_ERROR = 'onJoinError',
  /** 初始化成功 */
  INITIALIZE_SUCCESS = 'onInitializeSuccess',
  /** 初始化失败 */
  INITIALIZE_ERROR = 'onInitializeError',
  /** Audio/Video Player 状态变化 */
  PLAYER_STATE_CHANGED = 'onPlayerStateChanged',
  /** 推流成功 */
  PUBLISH_SUCCESS = 'onPublishSuccess',
  /** 推流失败 */
  PUBLISH_ERROR = 'onPublishError',
  /** 不可恢复错误后 */
  ERROR = 'onError',
  /** 用户被踢出房间 */
  CLIENT_BANNED = 'onClientBanned',
  /** 远端用户进房通知 */
  PEER_JOIN = 'onPeerJoin',
  /** 远端用户退房 */
  PEER_LEAVE = 'onPeerLeave',
  /** 远端流添加 */
  STREAM_ADDED = 'onStreamAdded',
  /** 远端流订阅成功 */
  STREAM_SUBSCRIBED = 'onStreamSubscribed',
  /** 远端流移除 */
  STREAM_REMOVED = 'onStreamRemoved',
  /** 远端流更新 */
  STREAM_UPDATED = 'onStreamUpdated',
  /** 远端用户禁用音频 */
  MUTE_AUDIO = 'onMuteAudio',
  /** 远端用户启用音频 */
  UNMUTE_AUDIO = 'onUnmuteAudio',
  /** 远端用户禁用视频 */
  MUTE_VIDEO = 'onMuteVideo',
  /** 远端用户启用视频 */
  UNMUTE_VIDEO = 'onUnmuteVideo',
  /** 信令通道连接状态变化事件 */
  CONNECTION_STATE_CHANGED = 'onConnectionStateChanged',
  /** 网络质量统计数据事件，进房后开始统计，每两秒触发一次，包括上行（uplinkNetworkQuality）和下行（downlinkNetworkQuality）的质量统计数据。 */
  NETWORK_QUALITY = 'onNetworkQuality',
  /** 本地屏幕分享停止事件通知，仅对本地屏幕分享流有效。 */
  SCREEN_SHARING_STOPPED = 'onScreenSharingStopped',
}

export interface PluginRtcEventMap {
  [PluginEvent.INITIAL]: void;
  [PluginEvent.LEAVE]: void;
  [PluginEvent.TICK]: number;
  [PluginEvent.JOIN_SUCCESS]: any;
  [PluginEvent.JOIN_ERROR]: any;
  [PluginEvent.INITIALIZE_SUCCESS]: any;
  [PluginEvent.INITIALIZE_ERROR]: DOMException;
  [PluginEvent.PUBLISH_SUCCESS]: any;
  [PluginEvent.PUBLISH_ERROR]: RtcError;
  [PluginEvent.STREAM_ADDED]: RemoteStreamInfo;
  [PluginEvent.STREAM_REMOVED]: RemoteStreamInfo;
  [PluginEvent.STREAM_UPDATED]: RemoteStreamInfo;
  [PluginEvent.STREAM_SUBSCRIBED]: RemoteStreamInfo;
  [PluginEvent.CONNECTION_STATE_CHANGED]: {
    prevState: ConnectionState;
    state: ConnectionState;
  };
  [PluginEvent.PEER_JOIN]: RemoteUserInfo;
  [PluginEvent.PEER_LEAVE]: RemoteUserInfo;
  [PluginEvent.MUTE_AUDIO]: RemoteUserInfo;
  [PluginEvent.MUTE_VIDEO]: RemoteUserInfo;
  [PluginEvent.UNMUTE_AUDIO]: RemoteUserInfo;
  [PluginEvent.UNMUTE_VIDEO]: RemoteUserInfo;
  [PluginEvent.CLIENT_BANNED]: RtcError;
  [PluginEvent.NETWORK_QUALITY]: NetworkQuality;
  [PluginEvent.ERROR]: RtcError;
  [PluginEvent.PLAYER_STATE_CHANGED]: {
    type: string;
    state: 'PLAYING' | 'PAUSED' | 'STOPPED';
    reason: 'playing' | 'mute' | 'unmute' | 'ended';
  };
  [PluginEvent.SCREEN_SHARING_STOPPED]: undefined;
}

export interface GmRtcClientRef {
  /** 获取namespace */
  namespace: string;
  /** 获取数据对象 */
  getState: () => Nullable<StateType>;
  dispatch: Dispatch;
  /** 获取消息提示实例 */
  messageToast: IMessageToast;
  /** 更新视频视图 */
  updateVideoView(params?: IUpdateVideoViewParams): Promise<void>;
  /** 创建通话消息 */
  onCreateMessage: (params: ICreateClientParams) => Promise<void>;
  /** 邀请通话消息 */
  onInviteMessage: (params: IVideoChatMessage) => Promise<void>;
  /** 取消通话消息 */
  onCancelMessage: (params: IVideoChatMessage) => Promise<void>;
  /** 超时取消通话消息 */
  onTimeoutCancelMessage: (params: IVideoChatMessage) => Promise<void>;
  /** 挂断通话消息 */
  onHangUpMessage: (params: IVideoChatMessage) => Promise<void>;
  /** 拒绝通话消息 */
  onRejectMessage: (params: IVideoChatMessage) => Promise<void>;
  /** 超时拒绝通话消息 */
  onTimeoutRejectMessage: (params: IVideoChatMessage) => Promise<void>;
  /** 视频和语音切换消息 */
  onSwitchMessage: (params: IVideoChatMessage) => Promise<void>;
  /** 进入房间消息 */
  onEnterRoomMessage: (params: IVideoChatMessage) => Promise<void>;
  /** 新增成员消息 */
  onAddMemberMessage: (params: IVideoChatMessage) => Promise<void>;
}

export interface GmRtcClientPluginContext extends GmRtcClientRef {
  /** 内部使用 允许给组件的 ref 上添加一些对外暴露的属性 */
  addImperativeHandle(handlers: object): void;
  /** 强制组件重渲染 */
  forceUpdate: React.DispatchWithoutAction;
}

export type GmRtcClientPluginFunc = {
  [K in keyof PluginRtcEventMap]: Callback<PluginRtcEventMap[K]>;
};

export interface GmRtcClientPlugin {
  (props: IGmRtcProps, context: GmRtcClientPluginContext): Partial<GmRtcClientPluginFunc>;
}

export type ResolvedProps = ReturnType<typeof resolveProps>;
