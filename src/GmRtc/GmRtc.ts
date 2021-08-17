import type {
  Client,
  LocalStream,
  RemoteStream,
  Stream,
  ClientEventMap,
  StreamEventMap,
  RtcError,
  Callback,
  RemoteUserInfo,
} from 'trtc-js-sdk';
import TRTC, { createStream } from 'trtc-js-sdk';
import { isBoolean, findIndex } from 'lodash-es';
import { v4 as uuid } from 'uuid';

type Nullable<T> = T | null;

export interface IGmRtcOptions {
  /** 应用标识 */
  sdkAppId: number;
  /** 用户标识 */
  userId: string;
  /** 用户签名 */
  userSig: string;
  /** 房间号 */
  roomId: number;
  /** 是否从麦克风采集音频 */
  audio?: boolean;
  /** 是否从摄像头采集视频 */
  video?: boolean;
  /** 通知错误 */
  notificationError?: boolean;
  /** 打印日志 */
  debugLog?: boolean;
  /** 网络异常最大计数 */
  badNetworkMaxCount?: number;
}

export enum RTCEvent {
  /** 进房成功 */
  JOIN_SUCCESS = 'join-success',
  /** 进房失败 */
  JOIN_ERROR = 'join-error',
  /** 初始化成功 */
  INITIALIZE_SUCCESS = 'initialize-success',
  /** 初始化失败 */
  INITIALIZE_ERROR = 'initialize-error',
  /** Audio/Video Player 状态变化 */
  PLAYER_STATE_CHANGED = 'player-state-changed',
  /** 推流成功 */
  PUBLISH_SUCCESS = 'publish-success',
  /** 推流失败 */
  PUBLISH_ERROR = 'publish-error',
  /** 不可恢复错误后 */
  ERROR = 'error',
  /** 用户被踢出房间 */
  CLIENT_BANNED = 'client-banned',
  /** 远端用户进房通知 */
  PEER_JOIN = 'peer-join',
  /** 远端用户退房 */
  PEER_LEAVE = 'peer-leave',
  /** 远端流添加 */
  STREAM_ADDED = 'stream-added',
  /** 远端流订阅成功 */
  STREAM_SUBSCRIBED = 'stream-subscribed',
  /** 远端流移除 */
  STREAM_REMOVED = 'stream-removed',
  /** 远端流更新 */
  STREAM_UPDATED = 'stream-updated',
  /** 远端用户禁用音频 */
  MUTE_AUDIO = 'mute-audio',
  /** 远端用户启用音频 */
  UNMUTE_AUDIO = 'unmute-audio',
  /** 远端用户禁用视频 */
  MUTE_VIDEO = 'mute-video',
  /** 远端用户启用视频 */
  UNMUTE_VIDEO = 'unmute-video',
  /** 网络质量统计数据事件 */
  NetworkQuality = 'network-quality',
  /** 网络断开事件 */
  BadNetworkQuality = 'bad-network-quality',
}

export interface RTCEventMap extends StreamEventMap, ClientEventMap {
  [RTCEvent.JOIN_SUCCESS]: void;
  [RTCEvent.JOIN_ERROR]: any;
  [RTCEvent.INITIALIZE_SUCCESS]: void;
  [RTCEvent.INITIALIZE_ERROR]: DOMException;
  [RTCEvent.PUBLISH_SUCCESS]: LocalStream;
  [RTCEvent.PUBLISH_ERROR]: RtcError;
  [RTCEvent.BadNetworkQuality]: void;
}

/** 事件函数 */
// declare type EventFn<K extends keyof RTCEventMap> = (params: RTCEventMap[K]) => void;

/** 事件对象 */
// export interface EventTarget<T, K extends keyof T> {
//   [key: T[K]]: EventFn;
// }

export type EventTarget = {
  [K in keyof RTCEventMap]?: Callback<RTCEventMap[K]>;
};

export interface IEventHandler {
  /** 获取所有事件 */
  getEvents: () => EventTarget;
  /** 新增多个事件 */
  addEvents: (event?: EventTarget) => void;
  /** 删除所有事件 */
  removeEvents: () => void;
  /** 获取事件 */
  getEvent: <K extends keyof RTCEventMap>(eventName: K) => Callback<RTCEventMap[K]> | undefined;
  /** 新增事件 */
  addEvent: <K extends keyof RTCEventMap>(eventName: K, eventFn: Callback<RTCEventMap[K]>) => void;
  /** 删除事件 */
  removeEvent: <K extends keyof RTCEventMap>(eventName: K) => void;
}

/**
 * 事件处理
 */
export class EventHandler implements IEventHandler {
  /** 事件map */
  private _events: Map<string, any>;

  constructor(event?: EventTarget) {
    this._events = new Map();
    if (event) {
      this._events = new Map(Object.entries(event));
    }
  }

  public getEvents(): EventTarget {
    const newEventTarget: EventTarget = {} as EventTarget;
    this._events.forEach((value, key) => {
      newEventTarget[key] = value;
    });
    return newEventTarget;
  }

  public addEvents(event?: EventTarget) {
    this._events = new Map([...this._events, ...Object.entries(event || {})]);
  }

  public removeEvents(): void {
    this._events = new Map();
  }

  public getEvent<K extends keyof RTCEventMap>(eventName: K): Callback<RTCEventMap[K]> | undefined {
    return this._events.get(eventName);
  }

  public addEvent<K extends keyof RTCEventMap>(
    eventName: K,
    eventFn: Callback<RTCEventMap[K]>,
  ): void {
    this._events.set(eventName, eventFn);
  }

  public removeEvent<K extends keyof RTCEventMap>(eventName: K): void {
    this._events.delete(eventName);
  }
}

export interface IGmRtc {
  /** 获取房间流成员 */
  getMembers: () => Map<string, Stream>;
  /** 获取客户端 */
  getClient: () => Client;
  /** 获取本地流 */
  getLocalStream: () => Nullable<LocalStream>;
  /** 获取本地流 */
  getRemoteStream: () => RemoteStream[];
  /** 订阅事件 */
  subscribe: (handler: IEventHandler) => string;
  /** 进房 */
  join: () => Promise<void>;
  /** 推送本地流 */
  publish: () => Promise<void>;
  /** 停止推流 */
  unpublish: () => Promise<void>;
  /** 离开 */
  leave: () => Promise<void>;
  /** 移除视频轨道 */
  removeVideoTrack: () => Promise<void>;
  /** 禁用本地音频轨道 */
  muteLocalAudio: () => void;
  /** 启用本地音频轨道 */
  unmuteLocalAudio: () => void;
  /** 禁用本地视频轨道 */
  muteLocalVideo: () => void;
  /** 启用本地视频轨道 */
  unmuteLocalVideo: () => void;
  /** 恢复视频流播放 */
  resumeStreams: () => Promise<void>;
}

class GmRtc implements IGmRtc {
  /** 音视频通话客户端对象 */
  private readonly _client: Client;
  /** 应用标识 */
  private readonly _sdkAppId: number;
  /** 用户标识 */
  private readonly _userId: string;
  /** 用户签名 */
  private readonly _userSig: string;
  /** 房间号 */
  private readonly _roomId: number;
  /** 是否从麦克风采集音频 */
  private readonly _audio: boolean;
  /** 是否从摄像头采集视频 */
  private readonly _video: boolean;
  /** 是否进房 */
  private _isJoined: boolean;
  /** 是否推流中 */
  private _isPublished: boolean;
  /** 是否语音静音 */
  private _localAudioMuted: boolean;
  /** 是否视频静音 */
  private _localVideoMuted: boolean;
  /** 本地流 */
  private _localStream: Nullable<LocalStream>;
  /** 远端流 */
  private _remoteStreams: RemoteStream[];
  /** 房间内成员 */
  private readonly _members: Map<string, Stream>;
  /** 房间内成员 */
  private _eventHandler: Map<string, IEventHandler>;
  /** 网络异常最大计数 */
  private readonly _BadNetworkMaxCount: number;
  /** 上行网络计数 */
  private _upLinkBadNetworkCount: number;
  /** 下行网络计数 */
  private _downLinkBadNetworkCount: number;

  constructor(options: IGmRtcOptions) {
    this._sdkAppId = options.sdkAppId;
    this._userId = options.userId;
    this._userSig = options.userSig;
    this._roomId = options.roomId;
    this._audio = isBoolean(options.audio) ? options.audio : true;
    this._video = isBoolean(options.video) ? options.video : true;
    this._BadNetworkMaxCount = options.badNetworkMaxCount || 5;
    this._isJoined = false;
    this._isPublished = false;
    this._localAudioMuted = false;
    this._localVideoMuted = false;
    this._localStream = null;
    this._remoteStreams = [];
    this._members = new Map();
    this._eventHandler = new Map<string, IEventHandler>();

    // 创建一个实时音视频通话的客户端对象
    this._client = TRTC.createClient({
      mode: 'rtc',
      sdkAppId: this._sdkAppId,
      userId: this._userId,
      userSig: this._userSig,
    });
    // 处理相关事件
    this.handleEvents();
  }

  /** 获取房间流成员 */
  public getMembers(): Map<string, Stream> {
    return this._members;
  }

  /** 获取客户端 */
  public getClient(): Client {
    return this._client;
  }

  /** 获取本地流 */
  public getLocalStream(): Nullable<LocalStream> {
    return this._localStream;
  }

  /** 获取本地流 */
  public getRemoteStream(): RemoteStream[] {
    return this._remoteStreams;
  }

  /**
   * 执行事件的回调函数
   * @param eventName 事件名称
   * @param handler 处理
   */
  private executeEventFn<K extends keyof RTCEventMap>(eventName: K, handler?: RTCEventMap[K]) {
    this._eventHandler.forEach(item => {
      const eventFn = item.getEvent(eventName);
      if (eventFn) {
        eventFn(handler as RTCEventMap[K]);
      }
    });
  }

  /**
   * 绑定处理事件
   * @param handler 事件处理器
   */
  public subscribe(handler: IEventHandler) {
    const subscribeId = uuid();
    this._eventHandler.set(subscribeId, handler);
    return subscribeId;
  }

  /**
   * 取消绑定
   * @param subscribeId 订阅id
   */
  public unsubscribe(subscribeId?: string) {
    if (subscribeId) {
      this._eventHandler.delete(subscribeId);
    } else {
      this._eventHandler.clear();
    }
  }

  /**
   * 进房
   */
  public join(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // 重复进房忽略
      if (this._isJoined) {
        resolve();
        return;
      }
      // 开始进房
      try {
        await this._client.join({
          roomId: this._roomId,
        });
        this._isJoined = true;
        this.executeEventFn(RTCEvent.JOIN_SUCCESS);
      } catch (error) {
        console.error(`进房失败:`, error);
        this.executeEventFn(RTCEvent.JOIN_ERROR, error);
        reject(error);
        return;
      }
      resolve();
    });
  }

  /**
   * 推送本地流
   */
  public publish(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // 创建本地流
      this._localStream = createStream({
        audio: this._audio,
        video: this._video,
        userId: this._userId,
      });
      await this._localStream.setVideoProfile('360p');
      // 本地流初始化
      try {
        await this._localStream.initialize();
        this.executeEventFn(RTCEvent.INITIALIZE_SUCCESS);
      } catch (error) {
        // 初始化失败
        console.error(error);
        this.executeEventFn(RTCEvent.INITIALIZE_ERROR, error);
        reject(error);
        return;
      }
      if (this._localStream) {
        this._members.set(this._localStream.getUserId(), this._localStream);
        // Audio/Video Player 状态变化事件
        // doc: https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-StreamEvent.html#.PLAYER_STATE_CHANGED
        this._localStream.on(RTCEvent.PLAYER_STATE_CHANGED, event => {
          this.executeEventFn(RTCEvent.PLAYER_STATE_CHANGED, event);
        });
      }
      if (!this._isJoined) {
        resolve();
        return;
      }
      if (this._isPublished) {
        resolve();
        return;
      }
      // 推送本地流
      try {
        await this._client.publish(this._localStream as LocalStream);
        this.executeEventFn(RTCEvent.PUBLISH_SUCCESS, this._localStream);
      } catch (error) {
        console.error(`failed to publish local stream ${error}`);
        this.executeEventFn(RTCEvent.PUBLISH_ERROR, error);
        this._isPublished = false;
        reject(error);
        return;
      }
      this._isPublished = true;
      resolve();
    });
  }

  /**
   * 停止推流
   */
  async unpublish() {
    if (!this._isJoined) {
      console.warn('unpublish() - please join() firstly');
      return;
    }
    if (!this._isPublished) {
      console.warn('RtcClient.unpublish() called but not published yet');
      return;
    }
    if (this._localStream) {
      await this._client.unpublish(this._localStream);
    }
    this._isPublished = false;
  }

  /**
   * 结束音视频通话
   */
  public async leave() {
    if (!this._isJoined) {
      console.warn('leave() - please join() firstly');
      return;
    }
    // 停止推流
    await this.unpublish();
    // 离开房间
    await this._client.leave();
    if (this._localStream) {
      this._localStream.stop();
      this._localStream.close();
    }
    for (const item of this._remoteStreams) {
      await item.stop();
      await item.close();
    }
    this.offEvents();
    this._localStream = null;
    this._isJoined = false;
  }

  /** 取消所有事件绑定 */
  public offEvents() {
    this._client.off('*');
  }

  /** 移除视频轨道 */
  async removeVideoTrack() {
    if (!this._localStream) {
      console.warn('localStream not exist');
      return;
    }
    const videoTrack = this._localStream.getVideoTrack();
    if (videoTrack) {
      await this._localStream.removeTrack(videoTrack);
      await videoTrack.stop();
    }
  }

  /**
   * 禁用本地音频轨道
   */
  public muteLocalAudio() {
    if (!this._localStream) {
      return;
    }
    this._localStream.muteAudio();
  }

  /**
   * 启用本地音频轨道
   */
  public unmuteLocalAudio() {
    if (!this._localStream) {
      return;
    }
    this._localStream.unmuteAudio();
  }

  /**
   * 禁用本地视频轨道
   */
  public muteLocalVideo() {
    if (!this._localStream) {
      return;
    }
    this._localStream.muteVideo();
  }

  /**
   * 启用本地视频轨道
   */
  public unmuteLocalVideo() {
    if (!this._localStream) {
      return;
    }
    this._localStream.unmuteVideo();
  }

  /**
   * 恢复视频流播放
   * @description chromeM71以下会自动暂停，需手动唤醒
   */
  public async resumeStreams() {
    if (this._localStream) {
      await this._localStream.resume();
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const stream of this._remoteStreams) {
      stream.resume();
    }
  }

  /**
   * 处理相关事件
   */
  private handleEvents() {
    /**
     * 错误事件，当出现不可恢复错误后，会抛出此事件
     * @link https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-StreamEvent.html#.ERROR
     */
    this._client.on(RTCEvent.ERROR, err => {
      console.error('RTCEvent.ERROR', err);
      this.executeEventFn(RTCEvent.ERROR, err);
    });

    /**
     * 用户被踢出房间通知
     * @link https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-ClientEvent.html#.CLIENT_BANNED
     */
    this._client.on(RTCEvent.CLIENT_BANNED, evt => {
      this.executeEventFn(RTCEvent.CLIENT_BANNED, evt);
    });

    /**
     * 远端用户进房通知
     * @link https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-ClientEvent.html#.PEER_JOIN
     */
    this._client.on(RTCEvent.PEER_JOIN, evt => {
      const { userId } = evt;
      console.log(`用户： ${userId} 进房成功！`);
      this.executeEventFn(RTCEvent.PEER_JOIN, evt);
    });

    /**
     * 远端用户退房通知
     * @link https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-ClientEvent.html#.PEER_LEAVE
     */
    this._client.on(RTCEvent.PEER_LEAVE, evt => {
      const { userId } = evt;
      // 用户离开
      console.log(`用户： ${userId} 退房成功！`);
      this.executeEventFn(RTCEvent.PEER_LEAVE, evt as RemoteUserInfo);
    });

    /**
     * 远端流添加事件，当远端用户发布流后会收到该通知
     * @link https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-ClientEvent.html#.STREAM_ADDED
     */
    this._client.on(RTCEvent.STREAM_ADDED, evt => {
      const remoteStream = evt.stream;
      const id = remoteStream.getId();
      const userId = remoteStream.getUserId();
      this._members.set(userId, remoteStream);
      this.executeEventFn(RTCEvent.STREAM_ADDED, evt);
      console.log(`远端流添加: [${userId}] ID: ${id} type: ${remoteStream.getType()}`);
      this._client.subscribe(remoteStream);
    });

    /**
     * 远端流订阅成功事件，调用 subscribe() 成功后会触发该事件
     * @link https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-ClientEvent.html#.STREAM_SUBSCRIBED
     */
    this._client.on(RTCEvent.STREAM_SUBSCRIBED, evt => {
      const remoteStream = evt.stream;
      const id = remoteStream.getId();
      const remoteStreamIndex = findIndex(this._remoteStreams, o => o.getId() === id);
      if (remoteStreamIndex === -1) {
        this._remoteStreams.push(remoteStream);
      } else {
        this._remoteStreams.splice(remoteStreamIndex, 1, remoteStream);
      }
      this.executeEventFn(RTCEvent.STREAM_SUBSCRIBED, evt);
      // Audio/Video Player 状态变化事件
      // doc: https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-StreamEvent.html#.PLAYER_STATE_CHANGED
      remoteStream.on(RTCEvent.PLAYER_STATE_CHANGED, event => {
        this.executeEventFn(RTCEvent.PLAYER_STATE_CHANGED, event);
      });
    });

    /**
     * 远端流移除事件，当远端用户取消发布流后会收到该通知
     * @link https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-ClientEvent.html#.STREAM_REMOVED
     */
    this._client.on(RTCEvent.STREAM_REMOVED, evt => {
      const remoteStream = evt.stream;
      const id = remoteStream.getId();
      remoteStream.stop();
      this._remoteStreams = this._remoteStreams.filter(stream => stream.getId() !== id);
      this.executeEventFn(RTCEvent.STREAM_REMOVED, evt);
      console.log(`视频流移除 ID: ${id}  type: ${remoteStream.getType()}`);
    });

    /**
     * 远端流更新事件，当远端用户添加、移除或更换音视频轨道后会收到该通知
     * @link https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-ClientEvent.html#.STREAM_UPDATED
     */
    this._client.on(RTCEvent.STREAM_UPDATED, evt => {
      this.executeEventFn(RTCEvent.STREAM_UPDATED, evt);
    });

    /**
     * 远端用户禁用音频通知
     * @link https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-ClientEvent.html#.MUTE_AUDIO
     */
    this._client.on(RTCEvent.MUTE_AUDIO, evt => {
      // 设置本地音频静音
      if (evt.userId === this._userId) {
        this._localAudioMuted = true;
      }
      this.executeEventFn(RTCEvent.MUTE_AUDIO, evt);
    });

    /**
     * 远端用户启用音频通知
     * @link https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-ClientEvent.html#.UNMUTE_AUDIO
     */
    this._client.on(RTCEvent.UNMUTE_AUDIO, evt => {
      // 取消本地音频静音
      if (evt.userId === this._userId) {
        this._localAudioMuted = false;
      }
      this.executeEventFn(RTCEvent.UNMUTE_AUDIO, evt);
    });

    /**
     * 远端用户禁用视频通知
     * @link https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-ClientEvent.html#.MUTE_VIDEO
     */
    this._client.on(RTCEvent.MUTE_VIDEO, evt => {
      // 设置本地视频静音
      if (evt.userId === this._userId) {
        this._localVideoMuted = true;
      }
      this.executeEventFn(RTCEvent.MUTE_VIDEO, evt);
    });

    /**
     * 远端用户启用视频通知
     * @link https://web.sdk.qcloud.com/trtc/webrtc/doc/zh-cn/module-ClientEvent.html#.UNMUTE_VIDEO
     */
    this._client.on(RTCEvent.UNMUTE_VIDEO, evt => {
      // 取消本地视频静音
      if (evt.userId === this._userId) {
        this._localVideoMuted = false;
      }
      this.executeEventFn(RTCEvent.UNMUTE_VIDEO, evt);
    });

    this._client.on(RTCEvent.NetworkQuality, evt => {
      this.executeEventFn(RTCEvent.NetworkQuality, evt);
      if (evt.uplinkNetworkQuality === 6) {
        // 网络断开计数加一
        this._upLinkBadNetworkCount += 1;
      } else {
        // 网络不是断开计数置空
        this._upLinkBadNetworkCount = 0;
      }
      if (evt.downlinkNetworkQuality === 6) {
        this._downLinkBadNetworkCount += 1;
      } else {
        this._downLinkBadNetworkCount = 0;
      }
      // 十秒内计数达到5（连续五次都网络失败就断开）
      if (
        this._upLinkBadNetworkCount === this._BadNetworkMaxCount ||
        this._downLinkBadNetworkCount === this._BadNetworkMaxCount
      ) {
        this.executeEventFn(RTCEvent.BadNetworkQuality);
        this._upLinkBadNetworkCount = 0;
        this._downLinkBadNetworkCount = 0;
      }
    });
  }
}

export default GmRtc;
