import type { MouseEventHandler } from 'react';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useCountDown, useLockFn } from 'ahooks';
import Draggable from 'react-draggable';
import type {
  GmRtcClientRef,
  IDevice,
  IGmRtcProps,
  IUpdateVideoViewParams,
  Nullable,
} from '@/GmRtc/types';
import { ResizableBox } from 'react-resizable';
import classNames from 'classnames';
import type { RemoteStreamInfo, RemoteUserInfo, Stream } from 'trtc-js-sdk';
import styles from './index.less';
import UsePrivateModel from './usePrivateModel';
import type { IVideoView, StateType } from './models';
import Model from './models';
import { EIconUrl, EAvatarUrl } from '@/types/EImageUrl';
import { CallModeText, ECallType } from '@/types/ECallType';
import { usePluginContainer } from './plugins';
import { ECallState } from '@/types/ECallState';
import type { IMembersInfo } from '@wjj/gm-type/dist/models/saas/members-info.model';
import { GmIcon, GmNotification } from '@wjj/gm-antd';
import { formatDuration, onExitFullScreen, onFullScreen, timeout } from '@/utils';
import {
  isNumber,
  capitalize,
  cloneDeep,
  filter,
  find,
  findIndex,
  isNil,
  isString,
  pullAllBy,
} from 'lodash-es';
import type { MessageItemParams } from './MessageToast';
import MessageToast, { EMessageLevel, MessageNoticeFrequency } from './MessageToast';
import type { EventTarget, IEventHandler, IGmRtc } from './GmRtc';
import GmRtc, { EventHandler, RTCEvent } from './GmRtc';
import type { IVideoChatMessage } from '@/types/VideoChatMessage';
import { EMessageText } from '@/types/EMessageText';
import {
  audioVideoSwitchTypeUsingPOST,
  cancelVideoCallUsingPOST,
  createVideoCallUsingPOST,
  getImUserInfo,
} from '@/services/index';
import { CallerUserCardText } from '@/types/ECallerUserCard';
import type { IImCallCreateResponse } from '@wjj/gm-type/dist/models/saas/im-call-create-response.model';
import { ECancelEventType } from '@/types/ECancelEventType';
import { EKeyMember } from '@/types/EKeyMember';
import { getCameras, getMicrophones } from 'trtc-js-sdk';
import { ECallAudio } from '@/types/ECallAudio';

interface IBtnItem {
  name: string;
  node: React.ReactNode;
}

export interface ICreateClientParams {
  /** 呼叫类型(1音频呼叫 2视频呼叫) */
  callType: number;
  /** 被叫accountNo */
  calledAccountNo: string;
  /** 被叫诊所id */
  calledTenantId: number;
  /** 被叫类型 1 患者,2 员工,3 团队,4 系统,5.医生,6健康管家,7.私家医生,8 .专家医生 */
  calledUserCard: number;
  /** 主叫类型 1 患者,2 员工,3 团队,4 系统,5.医生,6健康管家,7.私家医生,8 .专家医生 */
  callerUserCard?: number;
  extend?: string;
}

interface ICreateRtcClientParams {
  /** 房间号 */
  roomId: number;
}

const prefix = 'gm-rtc';

export const GmRtcClient = React.forwardRef<GmRtcClientRef, IGmRtcProps>((rawProps, ref) => {
  const props = resolveProps(rawProps);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { style, className, device } = props;

  const { namespace, data, dispatch, getState } = UsePrivateModel<StateType | null>({
    prefix: 'videochat',
    model: Model,
  });

  const [otherInfoPluginElement, setOtherInfoPluginElement] = useState<React.ReactNode>(null);

  /* 检查设备情况 */
  const checkDevice = (params: IDevice): Promise<void> =>
    new Promise(async (resolve, reject) => {
      if (params?.camera) {
        try {
          const cameras = await getCameras();
          console.log('cameras', cameras);
          if (!Array.isArray(cameras) || cameras.length === 0) {
            reject();
            return;
          }
        } catch (e) {
          reject(e);
          return;
        }
      }
      if (params?.microphone) {
        try {
          const microphones = await getMicrophones();
          console.log('microphones', microphones);
          if (!Array.isArray(microphones) || microphones.length === 0) {
            reject();
            return;
          }
        } catch (e) {
          reject(e);
          return;
        }
      }
      resolve();
    });

  /**
   * 获取倒计时时长
   */
  const getCountdownDate = useCallback<(time: number) => number>((time = 120000) => {
    return Date.now() + time;
  }, []);

  /** 倒计时结束 */
  const onCallEnd = async () => {
    console.log('onCallEnd');
    const videoCallState = getState()?.callState;
    if (videoCallState === ECallState.BE_CALLED) {
      GmNotification.warn(EMessageText.USER_CANCEL);
      await leave(ECancelEventType.TIMEOUT_REJECT);
      return;
    }
    if (videoCallState === ECallState.ON_CALL) {
      GmNotification.warn(EMessageText.SELF_TIMEOUT_CANCEL);
      await leave(ECancelEventType.TIMEOUT_CANCEL);
    }
  };

  /** 倒计时结束 */
  const onStreamEnd = async () => {
    console.log('onStreamEnd');
    GmNotification.warn(EMessageText.USER_CANCEL);
    await leave(ECancelEventType.CANCEL);
  };

  /**
   * 定时器
   * 作用：被呼叫或者呼叫他人，倒计时2分钟没有接通，就结束该次通话
   */
  const [, setCallTargetDate] = useCountDown({ onEnd: onCallEnd });

  /**
   * 定时器
   * 作用：接通后10s内没有成功建立连接（视频流订阅成功），就结束该次通话
   */
  const [, setStreamTargetDate] = useCountDown({ onEnd: onStreamEnd });

  let handlers = {};
  const addImperativeHandle = pluginHandlers => {
    handlers = Object.assign(handlers, pluginHandlers);
  };

  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const { fullScreen, selfMember, callState, expand, mainVideoView, mute, videoType } = (data ||
    {}) as StateType;

  // 提示文案
  const [tipText, setTipsText] = useState<Nullable<string>>(null);

  // 消息提示队列
  const [messageToast] = useState(
    new MessageToast({
      noticeFrequency: MessageNoticeFrequency.ALWAYS,
      interval: 1000,
    }),
  );
  // 音视频计时消息id
  const videoTimeToastId = useRef<Nullable<string>>(null);

  /** 插件初始化生命周期 */
  useEffect(() => {
    pluginContainer?.onInitial?.();
  }, []);

  /** 数据比较 */
  const compareList = <T, K>(
    oldList: T[],
    newList: T[],
    iteratee: K,
  ): {
    add: T[];
    remove: T[];
  } => {
    const add = pullAllBy(cloneDeep(newList), cloneDeep(oldList), iteratee);
    const remove = pullAllBy(cloneDeep(oldList), cloneDeep(newList), iteratee);
    return {
      add,
      remove,
    };
  };

  /** 无限时间的提示 */
  const setInfinityToast = (params: Partial<MessageItemParams>) => {
    messageToast.clear();
    return messageToast.show({
      level: EMessageLevel.LOW,
      time: Infinity,
      ...params,
    } as MessageItemParams);
  };

  /** 渲染其他信息 */
  const renderOtherInfoPlugin = (node: React.ReactNode) => {
    setOtherInfoPluginElement(node);
  };

  /** 通过userId获取流 */
  const getStreamByUserId = useCallback((userId: string | undefined) => {
    const client = getState()?.client;
    if (client) {
      return client.getMembers().get(userId as string);
    }
    return null;
  }, []);

  const getMember = useCallback<(userId: string) => IMembersInfo | undefined>(userId => {
    return find(getState()?.members, o => o.memberAccount === userId);
  }, []);

  /** 主视频视图 */
  const updateMainVideoView = async (params?: IUpdateVideoViewParams) => {
    const { userId } = params || {};
    const mainVideoViewItem = getState()?.mainVideoView;
    const newVideoView: IVideoView = {
      memberInfo: undefined,
      stream: undefined,
    };
    if (isNil(userId)) {
      // 更新数据
      const memberInfo = find(
        getState()?.members,
        o => o.memberAccount === mainVideoViewItem?.memberInfo?.memberAccount,
      );
      if (isNil(memberInfo)) {
        // 停止原数据视频流
        if (mainVideoViewItem?.stream) {
          mainVideoViewItem.stream.stop();
        }
        const defaultMember = getDefaultMember();
        newVideoView.memberInfo = defaultMember;
        newVideoView.stream = getStreamByUserId(defaultMember?.memberAccount) as Stream;
      } else {
        newVideoView.memberInfo = memberInfo;
        newVideoView.stream = getStreamByUserId(memberInfo.memberAccount) as Stream;
      }
    } else {
      const memberInfo = find(getState()?.members, o => o.memberAccount === userId);
      if (!memberInfo) {
        return;
      }
      // 停止主视频流
      if (mainVideoViewItem?.stream) {
        mainVideoViewItem.stream.stop();
      }
      newVideoView.memberInfo = memberInfo;
      newVideoView.stream = getStreamByUserId(memberInfo?.memberAccount) as Stream;
    }
    // 更新视频流
    if (newVideoView.stream) {
      newVideoView.stream.stop();
      if (document.getElementById('main-video')) {
        await newVideoView.stream.play('main-video');
      }
    }
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        mainVideoView: newVideoView,
      },
    });
  };

  /** 更新右侧用户列表视图 */
  const updateMinorVideoViews = async () => {
    const oldMinorVideoViews = getState()?.minorVideoViews || [];
    // 主视频userId
    const mainVideoUserId = getState()?.mainVideoView?.memberInfo?.memberAccount;
    const newMembers = getState()?.members || [];
    const newMinorMembers = (getState()?.minorVideoViews || []).map(o => o.memberInfo);
    // 新成员信息和旧视图数据进行比较
    const compareRes = compareList(
      newMinorMembers,
      newMembers,
      (o: IMembersInfo) => o.memberAccount,
    );
    const { add: addList, remove: removeList } = compareRes;
    // 更新成员流信息
    const newMinorVideoViews = (oldMinorVideoViews || []).map(item => ({
      ...item,
      stream: getStreamByUserId(item.memberInfo?.memberAccount),
    }));
    // 新增数据
    addList.forEach(item => {
      newMinorVideoViews.push({
        memberInfo: item,
        stream: getStreamByUserId(item?.memberAccount),
      });
    });
    // 删除数据
    removeList.forEach(item => {
      const index = findIndex(
        newMinorVideoViews,
        o => o.memberInfo?.memberAccount === item?.memberAccount,
      );
      // 停止相关流播放
      const { stream } = newMinorVideoViews[index];
      if (stream) {
        stream.stop();
      }
      newMinorVideoViews.splice(index, 1);
    });
    // 不包主视频的成员列表
    const otherVideoViews = newMinorVideoViews.filter(
      item => item?.memberInfo?.memberAccount !== mainVideoUserId,
    );
    // 更新视频状态
    for (const item of otherVideoViews) {
      if (item.stream) {
        item.stream.stop();
        if (document.getElementById(`video-${item.memberInfo?.memberAccount}`)) {
          await item?.stream?.play?.(`video-${item.memberInfo?.memberAccount}`);
        }
      }
    }
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        minorVideoViews: newMinorVideoViews,
      },
    });
  };

  /** 更新视频视图 */
  const updateVideoView = async (params?: IUpdateVideoViewParams) => {
    const { roomId } = params || {};
    await dispatch({
      type: `${namespace}/getImRoomInfo`,
      payload: {
        roomId: roomId || getState()?.roomId,
      },
    });
    await updateMainVideoView(params);
    await updateMinorVideoViews();
  };

  /** 进房成功事件 */
  const handleJoinSuccess = async () => {
    // messageToast.show({ content: EMessageText.JOIN_SUCCESS, level: EMessageLevel.MIDDLE });
    await updateVideoView();
    // 渲染对应的视频
  };

  /** 进房失败件 */
  const handleJoinError = async () => {
    messageToast.show({ content: EMessageText.JOIN_ERROR, level: EMessageLevel.MIDDLE });
    GmNotification.error(EMessageText.JOIN_ERROR);
    await leave(ECancelEventType.CANCEL);
  };

  /** 初始化成功 */
  const handleInitializeSuccess = () => {
    const cameras = getCameras();
    const microphones = getMicrophones();

    console.log('cameras', cameras);
    console.log('microphones', microphones);
  };

  /** 初始化失败事件 */
  const handleInitializeError = async (error: DOMException) => {
    console.log('handleInitializeError', error, error.name);
    switch (error.name) {
      case 'NotReadableError':
        GmNotification.error(
          '暂时无法访问摄像头/麦克风，请确保系统允许当前浏览器访问摄像头/麦克风，并且没有其他应用占用摄像头/麦克风',
        );
        break;
      case 'NotAllowedError':
        GmNotification.error('请确保系统允许当前浏览器访问摄像头/麦克风');
        break;
      case 'NotFoundError':
        GmNotification.error(
          '浏览器获取不到摄像头/麦克风设备，请检查设备连接并且确保系统允许当前浏览器访问摄像头/麦克风',
        );
        break;
      case 'AbortError':
        GmNotification.error('由于某些未知原因导致设备无法被使用');
        break;
      case 'SecurityError':
        GmNotification.error(
          '暂时无法访问摄像头/麦克风，请确保系统允许当前浏览器访问摄像头/麦克风，并且没有其他应用占用摄像头/麦克风',
        );
        break;
      default:
    }
    await leave(ECancelEventType.CANCEL);
  };

  /** Audio/Video Player 状态变化 */
  const handlePlayerStateChange = () => {};

  /** 推流成功 */
  const handlePublishSuccess = async () => {
    // const localStream = rtcClient?.getLocalStream();
    await updateVideoView();
  };

  /** 推流失败 */
  const handlePublishError = async () => {
    GmNotification.error('视频流推送失败');
    await leave(ECancelEventType.CANCEL);
  };

  const handleError = (error: any) => {
    const errorCode = error.getCode();
    if (errorCode === 0x4043) {
      // 自动播放受限，引导用户手势操作并调用 stream.resume 恢复音视频播放
      // 参考：https://trtc-1252463788.file.myqcloud.com/web/docs/module-ErrorCode.html#.PLAY_NOT_ALLOWED
    } else if (errorCode === 0x4044) {
      // 媒体设备被拔出后自动恢复失败，参考：https://trtc-1252463788.file.myqcloud.com/web/docs/module-ErrorCode.html#.DEVICE_AUTO_RECOVER_FAILED
    }
  };

  /** 用户被踢出房间 */
  const handleClientBanned = () => {
    GmNotification.error('设备已在其他端登录');
    window.location.reload();
  };

  /** 远端用户进房 */
  const handlePeerJoin = async (userInfo: RemoteUserInfo) => {
    console.log('handlePeerJoin');
    await updateVideoView();
    // 提示用户进房信息
    const memberInfo = find(getState()?.members, o => o.memberAccount === userInfo.userId);
    if (memberInfo) {
      messageToast.show({
        content: `${memberInfo.nickname}（${
          CallerUserCardText[memberInfo.userCard as number]
        }）加入房间`,
        level: EMessageLevel.MIDDLE,
      });
    }
    // 切换为视频中状态
    await changeCallState(ECallState.CALLING);
  };

  /** 远端用户离房 */
  const handlePeerLeave = async (evt: RemoteUserInfo) => {
    const memberInfo = getMember(evt.userId);
    if (memberInfo) {
      messageToast.show({
        content: `${memberInfo.nickname}（${
          CallerUserCardText[memberInfo.userCard as number]
        }）离开房间`,
        level: EMessageLevel.MIDDLE,
      });
      // 主要人离开房间
      if (memberInfo.isKeyMember === EKeyMember.MAIN) {
        await leave(ECancelEventType.CANCEL);
      }
    }
    await updateVideoView();
  };

  /** 远端流添加 */
  const handleStreamAdd = async () => {
    await updateVideoView();
  };

  /** 远端流订阅成功 */
  const handleStreamSubscribed = async () => {
    console.log('handleStreamSubscribed');
    setStreamTargetDate(undefined);
    if (!videoTimeToastId.current) {
      videoTimeToastId.current = setInfinityToast({
        content: getVideoDuration(),
      });
    }
    await updateVideoView();
  };

  /** 远端流移除 */
  const handleStreamRemove = async (evt: RemoteStreamInfo) => {
    const memberInfo = getMember(evt.stream.getUserId());
    await updateVideoView();
    // 关键人离开结束通话
    if (memberInfo.isKeyMember === EKeyMember.MAIN) {
      await leave(ECancelEventType.CANCEL);
    }
  };

  /** 远端流更新 */
  const handleStreamUpdate = async () => {
    // await updateStream(evt);
    await updateVideoView();
  };

  /** 网络断开 */
  const handleBadNetworkQuality = async () => {
    GmNotification.warn(EMessageText.NETWORK_ERROR);
    await leave(ECancelEventType.CANCEL);
  };

  /**
   * 短横线命名转驼峰命名 my-fun -> onMyFun
   * @param name
   */
  const transformKebabCaseToCamelCase = (name: string) => {
    return `on${(name || '')
      .split('-')
      .map(item => capitalize(item))
      .join('')}`;
  };

  /** 暴露rtc事件给外部 */
  const [externalEventHandler] = useState<IEventHandler>(() => {
    const handler = {} as EventTarget;
    Object.keys(RTCEvent).forEach(item => {
      const name = RTCEvent[item];
      const formatName = transformKebabCaseToCamelCase(name);
      function eventFn(...args) {
        pluginContainer?.[formatName]?.(...args);
      }
      handler[name] = eventFn;
    });
    return new EventHandler(handler);
  });

  /** 事件处理 */
  const [eventHandler] = useState<IEventHandler>(
    new EventHandler({
      [RTCEvent.JOIN_SUCCESS]: handleJoinSuccess,
      [RTCEvent.JOIN_ERROR]: handleJoinError,
      [RTCEvent.INITIALIZE_SUCCESS]: handleInitializeSuccess,
      [RTCEvent.INITIALIZE_ERROR]: handleInitializeError,
      [RTCEvent.PLAYER_STATE_CHANGED]: handlePlayerStateChange,
      [RTCEvent.PUBLISH_SUCCESS]: handlePublishSuccess,
      [RTCEvent.PUBLISH_ERROR]: handlePublishError,
      [RTCEvent.ERROR]: handleError,
      [RTCEvent.CLIENT_BANNED]: handleClientBanned,
      [RTCEvent.PEER_JOIN]: handlePeerJoin,
      [RTCEvent.PEER_LEAVE]: handlePeerLeave,
      [RTCEvent.STREAM_ADDED]: handleStreamAdd,
      [RTCEvent.STREAM_SUBSCRIBED]: handleStreamSubscribed,
      [RTCEvent.STREAM_REMOVED]: handleStreamRemove,
      [RTCEvent.STREAM_UPDATED]: handleStreamUpdate,
      [RTCEvent.BadNetworkQuality]: handleBadNetworkQuality,
    }),
  );

  /** 初始化数据 */
  const initialState = async (): Promise<void> => {
    // 清除toast资源
    if (messageToast) {
      messageToast.clear();
    }
    setTipsText(null);
    setOtherInfoPluginElement(null);
    videoTimeToastId.current = null;
    await dispatch({
      type: `${namespace}/reset`,
    });
  };

  /** 创建RTC客户端 */
  const createRtcClient = async (params: ICreateRtcClientParams): Promise<Nullable<IGmRtc>> => {
    const res = await getTencentImInfo();
    const sdkAppId = getState()?.sdkAppId as number;
    if (
      isNil(params) ||
      isNil(sdkAppId) ||
      isNil(res?.userId) ||
      isNil(res?.userSig) ||
      isNil(params.roomId)
    ) {
      console.error("create client failed: params can't empty");
      GmNotification.error('视频客户端创建失败: 参数异常');
      return null;
    }
    const newRtcClient = new GmRtc({
      sdkAppId,
      userId: res?.userId,
      userSig: res?.userSig,
      roomId: params.roomId as number,
      audio: true,
      video: getState()?.callType === ECallType.VIDEO,
    });
    newRtcClient.subscribe(eventHandler);
    newRtcClient.subscribe(externalEventHandler);
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        client: newRtcClient,
      },
    });
    return newRtcClient;
  };

  /**
   * 获取腾讯im相关信息
   */
  const getTencentImInfo = async () => {
    const { userId, userSig } = (getState() || {}) as StateType;
    if (!isNil(userId) && !isNil(userSig)) {
      return {
        userId,
        userSig,
      };
    }
    const res: any = await getImUserInfo();
    if (res) {
      return {
        userId: res.accountNo,
        userSig: res.tencentUserSig,
      };
    }
    return null;
  };

  /** 改变store中拨打状态 */
  const onChangeCallStateModel = async (state: ECallState) => {
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        callState: state,
      },
    });
  };

  /** 拨打状态切换 */
  const changeCallState = async (state: ECallState) => {
    if (state === getState()?.callState) {
      console.warn('call state repeat has been ignored');
      return;
    }
    await pluginContainer?.onChangeState?.(state);
    await onChangeCallStateModel(state);
    // 设置为拨打用户中
    if (state === ECallState.ON_CALL) {
      setCallTargetDate(getCountdownDate(120000));
      messageToast.clear();
      messageToast.show({
        content: EMessageText.WAIT_CONNECT,
        time: Infinity,
        level: EMessageLevel.LOW,
      });
    }
    // 设置为拨打用户中
    if (state === ECallState.BE_CALLED) {
      setCallTargetDate(getCountdownDate(120000));
      messageToast.clear();
      messageToast.show({
        content: `邀请您${CallModeText[getState()?.callType as ECallType]}通话...`,
        time: Infinity,
        level: EMessageLevel.LOW,
      });
    }
    // 设置为拨打用户中
    if (state === ECallState.CALLING) {
      console.log('ECallState.CALLING');
      setCallTargetDate(undefined);
      // fix: 小康没有正常进房或推流的情况，记录超时挂断
      if ((getState()?.client?.getRemoteStream?.() || []).length === 0) {
        setStreamTargetDate(getCountdownDate(15000));
      }
      messageToast.show({
        content: EMessageText.VIDEO_INITIAL,
        level: EMessageLevel.LOW,
      });
    }
  };

  /** 计算时间 */
  const getVideoDuration = useCallback(() => {
    const initialTime = performance.now();
    let time = 0;
    return (newTime: number) => {
      if (newTime) {
        time = newTime;
      }
      time = performance.now() - initialTime;
      dispatch({
        type: `${namespace}/setState`,
        payload: {
          time,
        },
      });
      pluginContainer.onTick?.(time);
      return formatDuration(time);
    };
  }, []);

  useEffect(() => {
    // 订阅消息队列
    messageToast.subscribe(message => {
      const contentText = isString(message.content) ? message.content : message.content();
      setTipsText(contentText);
    });
    return () => {
      // 销毁消息队列，防止setInterval内存泄露
      messageToast.destroy();
    };
  }, [messageToast]);

  /**
   * 默认选中的用户
   */
  const getDefaultMember = useCallback(
    () =>
      find(
        filter(getState()?.members, o => o.isKeyMember === EKeyMember.MAIN),
        o => o.memberAccount !== getState()?.userId,
      ),
    [],
  );

  /**
   * 是否忽略消息
   * @param msg 消息内容
   */
  const ignoreMessage = (msg: IVideoChatMessage): boolean => {
    return isNil(msg?.roomId) || getState()?.roomId !== msg.roomId;
  };

  /**
   * 创建音视频
   * @description 加锁：防止同时多次调用导致创建音视频异常
   */
  const handleVideoChatCreate = useLockFn(async (params: ICreateClientParams) => {
    if (getState()?.roomId) {
      GmNotification.error('存在进行中的视频通话，请先挂断');
      return;
    }
    try {
      await checkDevice({
        microphone: true,
        camera: params.callType === ECallType.VIDEO,
      });
    } catch (e) {
      GmNotification.error(
        '浏览器获取不到摄像头/麦克风设备，请检查设备连接并且确保系统允许当前浏览器访问摄像头/麦克风',
      );
      console.warn(e);
      return;
    }
    console.log('handleVideoChatCreate');
    await pluginContainer?.onCreateMessage?.(params);
    let res = {} as IImCallCreateResponse;
    try {
      // 创建音视频会话
      res = await createVideoCallUsingPOST(params);
    } catch (e) {
      console.error('创建音视频会话失败');
      return;
    }
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        roomId: res.roomId,
        conversationId: res.conversationId,
        callType: params.callType,
        videoType: params.callType,
        userCard: params.callerUserCard,
      },
    });
    await changeCallState(ECallState.ON_CALL);
    const client = await createRtcClient({
      roomId: res?.roomId as number,
    });
    await updateVideoView();
    if (client) {
      await client.join();
      await client.publish();
    }
    await setMainMember(params.calledAccountNo);
  });

  /** 取消音视频会话 */
  const cancelVideoCall = async (eventType?: ECancelEventType) => {
    if (
      isNil(getState()?.callType) ||
      isNil(getState()?.userCard) ||
      isNil(getState()?.conversationId) ||
      isNil(eventType) ||
      isNil(getState()?.roomId)
    ) {
      console.warn("cancel video params can't empty");
      return;
    }
    await cancelVideoCallUsingPOST({
      callType: getState()?.callType,
      callerUserCard: getState()?.userCard,
      conversationId: getState()?.conversationId,
      eventType,
      roomId: getState()?.roomId,
    });
  };

  /**
   * 设置主叫人
   * @param imkey 主叫人imkey
   */
  const setMainMember = async (imkey: string) => {
    const mainMember = find(getState()?.members, o => o.memberAccount === imkey);
    // 设置主叫人
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        mainMember,
      },
    });
  };

  /** 会话邀请 */
  const handleVideoChatInvite = async (msg: IVideoChatMessage) => {
    if (!isNil(getState()?.roomId)) {
      return;
    }
    let { extend } = msg;
    try {
      extend = JSON.parse(extend);
    } catch (e) {
      console.warn('extend parse error', extend);
    }
    // 主叫人imKey
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        roomId: msg.roomId,
        conversationId: msg.conversationId,
        callType: msg.callType,
        videoType: msg.callType,
        extend,
      },
    });
    await pluginContainer?.onInviteMessage?.(msg);
    try {
      await checkDevice({
        microphone: true,
        camera: true,
      });
    } catch (e) {
      GmNotification.error(
        '浏览器获取不到摄像头/麦克风设备，请检查设备连接并且确保系统允许当前浏览器访问摄像头/麦克风',
      );
      console.warn(e);
      leave(ECancelEventType.CANCEL);
      return;
    }
    await createRtcClient({
      roomId: msg.roomId,
    });
    await updateVideoView({
      roomId: msg.roomId,
      userId: msg.sponsorImKey,
    });
    await setMainMember(msg.sponsorImKey);
    // 设置拨打状态
    await changeCallState(ECallState.BE_CALLED);
  };

  /** 取消会话 */
  const handleVideoChatCancel = async (msg: IVideoChatMessage) => {
    if (ignoreMessage(msg)) {
      return;
    }
    await pluginContainer?.onCancelMessage?.(msg);
    GmNotification.warn(EMessageText.USER_CANCEL);
    if (msg.isKeyMember === EKeyMember.MAIN) {
      await leave(ECancelEventType.CANCEL);
    }
  };

  /** 超时取消 */
  const handleVideoChatTimeoutCancel = async (msg: IVideoChatMessage) => {
    if (ignoreMessage(msg)) {
      return;
    }
    await pluginContainer?.onTimeoutCancelMessage?.(msg);
    GmNotification.warn(EMessageText.USER_CANCEL);
    if (msg.isKeyMember === EKeyMember.MAIN) {
      await leave(ECancelEventType.CANCEL);
    }
  };

  /** 挂断 */
  const handleVideoChatHangup = async (msg: IVideoChatMessage) => {
    if (ignoreMessage(msg)) {
      return;
    }
    await pluginContainer?.onHangUpMessage?.(msg);
    GmNotification.warn(EMessageText.USER_HANG_UP);
    if (msg.isKeyMember === EKeyMember.MAIN) {
      await leave(ECancelEventType.CANCEL);
    }
  };

  /** 拒绝 */
  const handleVideoChatReject = async (msg: IVideoChatMessage) => {
    if (ignoreMessage(msg)) {
      return;
    }
    await pluginContainer?.onRejectMessage?.(msg);
    GmNotification.warn(EMessageText.USER_REJECT);
    if (msg.isKeyMember === EKeyMember.MAIN) {
      await leave(ECancelEventType.CANCEL);
    }
  };

  /** 超时拒绝 */
  const handleVideoChatTimeoutReject = async (msg: IVideoChatMessage) => {
    if (ignoreMessage(msg)) {
      return;
    }
    await pluginContainer?.onTimeoutRejectMessage?.(msg);
    GmNotification.warn(EMessageText.USER_CANCEL);
    if (msg.isKeyMember === EKeyMember.MAIN) {
      await leave(ECancelEventType.CANCEL);
    }
  };

  /** 音视频切换 */
  const handleVideoChatSwitch = async (msg: IVideoChatMessage) => {
    if (ignoreMessage(msg)) {
      return;
    }
    await pluginContainer?.onSwitchMessage?.(msg);
    GmNotification.success(EMessageText.SWITCH_TO_AUDIO_SUCCESS);
  };

  /** 进房 */
  const handleVideoChatEnterRoom = async (msg: IVideoChatMessage) => {
    if (ignoreMessage(msg)) {
      return;
    }
    await pluginContainer?.onEnterRoomMessage?.(msg);
    await updateVideoView();
  };

  /*
   * 新增成员 */
  const handleVideoChatAddMember = async (msg: IVideoChatMessage) => {
    if (ignoreMessage(msg)) {
      return;
    }
    await pluginContainer?.onAddMemberMessage?.(msg);
    await updateVideoView();
  };

  /**
   * 结束通话
   * @param eventType 取消音视频事件类型
   * @description （1）加锁：防止同时多次调用导致同时释放资源异常;
   * （2）需要处理catch,防止网络中断导致后续函数不执行；
   */
  const leave = useLockFn(async (eventType?: ECancelEventType) => {
    if (isNumber(eventType)) {
      try {
        await cancelVideoCall(eventType);
      } catch (e) {
        console.warn(e);
      }
    }
    if (getState()?.client) {
      await getState()?.client?.leave?.();
    }
    // 关闭视图
    await changeCallState(ECallState.FREE);
    try {
      await pluginContainer?.onLeave?.();
    } catch (e) {
      console.warn(e);
    }
    // 等待一秒让rtc资源释放
    await timeout(1000);
    await initialState();
  });

  /** 改变展开状态 */
  const onChangeExpand = (state: boolean) => {
    dispatch({
      type: `${namespace}/setState`,
      payload: {
        expand: !state,
      },
    });
  };

  /** 改变全屏状态 */
  const changeFullScreenState = (state: boolean) => {
    dispatch({
      type: `${namespace}/setState`,
      payload: {
        fullScreen: state,
      },
    });
  };

  /** 退出全屏 */
  const onChangeExitFullScreen = () => {
    changeFullScreenState(false);
    onExitFullScreen();
  };

  /** 退出全屏 */
  const onChangeFullScreen = () => {
    changeFullScreenState(true);
    onFullScreen();
  };

  /**
   * 全屏切换
   * @param val 是否全屏
   */
  const handleChangeFullScreen = (val: boolean) => {
    // 退出全屏
    if (val) {
      onChangeExitFullScreen();
    } else {
      onChangeFullScreen();
    }
  };

  /** 监听全屏事件 */
  const onFullscreenChange = () => {
    // 退出全屏
    if (!document.fullscreenElement) {
      changeFullScreenState(false);
    }
  };

  useEffect(() => {
    // 监听全屏事件
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'].forEach(item => {
      window.addEventListener(item, onFullscreenChange);
    });
    return () => {
      // 销毁全屏事件
      ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'].forEach(item => {
        window.removeEventListener(item, onFullscreenChange);
      });
    };
  }, []);

  /** 选中用户 */
  const handleSelectMember = async (
    event: React.MouseEvent<HTMLDivElement>,
    memberInfo?: IMembersInfo,
  ) => {
    event.stopPropagation();
    // 设置主视频流停止渲染
    const mainVideoViewItem = getState()?.mainVideoView;
    if (memberInfo?.memberAccount === mainVideoViewItem?.memberInfo?.memberAccount) {
      return;
    }
    await updateVideoView({
      userId: memberInfo?.memberAccount,
    });
  };

  /** 接听 */
  const handleOnAccept = async () => {
    const client = getState()?.client;
    GmNotification.success(EMessageText.SELF_ACCEPT);
    await changeCallState(ECallState.CALLING);
    if (client) {
      await client.join();
      await client.publish();
    }
  };

  /** 拒绝 */
  const handleOnRefuse = async () => {
    GmNotification.warn(EMessageText.SELF_REJECT);
    await leave(ECancelEventType.REJECT);
  };

  /** 挂断 */
  const handleOnCancel = async () => {
    GmNotification.warn(EMessageText.SELF_CANCEL);
    await leave(ECancelEventType.HANG_UP);
  };

  /** 切换语音通话 */
  const handleOnAudio = async () => {
    const client = getState()?.client;
    if (client) {
      await client.removeVideoTrack();
    }
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        videoType: ECallType.AUDIO,
      },
    });
    GmNotification.success(EMessageText.SWITCH_AUDIO);
    messageToast.show({
      content: EMessageText.SWITCH_AUDIO,
      level: EMessageLevel.MIDDLE,
    });
    await audioVideoSwitchTypeUsingPOST({
      callType: ECallType.AUDIO,
      callerUserCard: getState()?.userCard,
      conversationId: getState()?.conversationId,
      roomId: getState()?.roomId,
    });
  };

  /** 静音 */
  const handleOnMute = async () => {
    const client = getState()?.client;
    if (client) {
      client.muteLocalAudio();
    }
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        mute: true,
      },
    });
    GmNotification.success(EMessageText.MUTE_SUCCESS);
    messageToast.show({
      content: EMessageText.MUTE_SUCCESS,
      level: EMessageLevel.MIDDLE,
    });
  };

  /** 取消静音 */
  const handleOnUnmute = async () => {
    const client = getState()?.client;
    if (client) {
      client.unmuteLocalAudio();
    }
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        mute: false,
      },
    });
    GmNotification.success(EMessageText.UNMUTE_SUCCESS);
    messageToast.show({
      content: EMessageText.UNMUTE_SUCCESS,
      level: EMessageLevel.MIDDLE,
    });
  };

  const utilsFn = {
    updateVideoView,
    messageToast,
    namespace,
    getState,
    dispatch,
    onLeave: leave,
    onCreateMessage: handleVideoChatCreate,
    onInviteMessage: handleVideoChatInvite,
    onCancelMessage: handleVideoChatCancel,
    onTimeoutCancelMessage: handleVideoChatTimeoutCancel,
    onHangUpMessage: handleVideoChatHangup,
    onRejectMessage: handleVideoChatReject,
    onTimeoutRejectMessage: handleVideoChatTimeoutReject,
    onSwitchMessage: handleVideoChatSwitch,
    onEnterRoomMessage: handleVideoChatEnterRoom,
    onAddMemberMessage: handleVideoChatAddMember,
  };

  const pluginContext = {
    addImperativeHandle,
    forceUpdate,
    renderOtherInfoPlugin,
    ...utilsFn,
  };

  const pluginContainer = usePluginContainer(props, pluginContext);

  useImperativeHandle(ref, () => ({
    ...utilsFn,
    ...handlers,
  }));

  // 渲染呼叫提示信息
  const renderTips = useCallback(
    (text?: React.ReactNode) => (
      <div className={styles.tips} id="videochat-tips">
        {text}
      </div>
    ),
    [],
  );

  // 渲染操作按钮
  const renderOperateBtn = (name: React.ReactNode, icon: string, onClick?: MouseEventHandler) => (
    <div className={styles.operateBtn} onClick={onClick}>
      <div className={styles.operateBtnIcon} style={{ backgroundImage: `url("${icon}")` }} />
      <div className={styles.operateBtnText}>{name}</div>
    </div>
  );

  /**
   * 渲染展开状态
   * @param val 是否展开
   */
  const renderExpandIcon = (val: boolean) => (
    <div className={styles.expandIconContent} onClick={() => onChangeExpand(val)}>
      <GmIcon className={styles.expandIcon} type={`fas fa-chevron-${val ? 'left' : 'right'}`} />
    </div>
  );

  const renderName = (userInfo?: IMembersInfo | undefined, alias?: string) => (
    <div>
      <span title={alias || userInfo?.nickname}>{alias || userInfo?.nickname}</span>
      {!isNil(userInfo?.userCard) && (
        <span title={CallerUserCardText[userInfo?.userCard as number]}>
          （{CallerUserCardText[userInfo?.userCard as number]}）
        </span>
      )}
    </div>
  );

  /**
   * 渲染用户卡片
   * @param userInfo 用户信息
   * @param selected 是否选中
   * @param alias 自定义别名
   */
  const renderUserCard = (userInfo: IMembersInfo, selected: boolean = false, alias?: string) => (
    <div
      className={classNames(styles.userCard, {
        [styles.userCardSelected]: selected,
        [styles.userCardUnSelected]: !selected,
      })}
    >
      <div className={styles.videoItem} id={`video-${userInfo?.memberAccount}`} />
      <div
        className={styles.userCardAvatar}
        style={{ backgroundImage: `url("${EAvatarUrl[userInfo?.userCard]}")` }}
      />
      <div className={styles.userCardShade} />
      <div className={styles.userCardText}>{renderName(userInfo, alias)}</div>
    </div>
  );

  /**
   * 渲染呼叫信息
   * @param videoView
   */
  const renderUserInfo = (videoView?: IVideoView) => (
    <div className={styles.userInfo}>
      {!isNil(videoView?.stream?.getVideoTrack?.()) && (
        <div
          className={styles.userInfoAvatarLeftTop}
          style={{ backgroundImage: `url("${EAvatarUrl[videoView?.memberInfo?.userCard]}")` }}
        />
      )}
      {isNil(videoView?.stream?.getVideoTrack?.()) && (
        <div
          className={styles.userInfoAvatarCenter}
          style={{ backgroundImage: `url("${EAvatarUrl[videoView?.memberInfo?.userCard]}")` }}
        />
      )}
      <div className={styles.userInfoText}>
        <div className={styles.userInfoName}>{renderName(videoView?.memberInfo)}</div>
        <div id={`${prefix}__user-info__tips`} className={styles.userInfoTips}>
          {otherInfoPluginElement}
        </div>
      </div>
    </div>
  );

  const renderAudio = useCallback((url: string) => {
    return (
      // @ts-ignore
      <audio src={url} loop autoplay="autoplay" />
    );
  }, []);

  // 渲染被呼叫
  const renderBeCall = (
    <React.Fragment>
      <div className={styles.callContainer}>{renderUserInfo(mainVideoView)}</div>
      {renderAudio(ECallAudio.BE_CALLED)}
    </React.Fragment>
  );

  // 渲染呼叫用户中
  const renderOnCall = (
    <React.Fragment>
      <div className={styles.callContainer}>{renderUserInfo(mainVideoView)}</div>
      {renderAudio(ECallAudio.ON_CALL)}
    </React.Fragment>
  );

  // 渲染通话中
  const renderCalling = (
    <React.Fragment>
      <div className={styles.callContainer}>{renderUserInfo(mainVideoView)}</div>
    </React.Fragment>
  );

  // 渲染右侧用户列表
  const renderMemberList = (data?.minorVideoViews || [])
    .map(item => item.memberInfo as IMembersInfo)
    .map(item => {
      const isSelf = selfMember?.memberAccount === item?.memberAccount;
      const isSelected = data?.mainVideoView?.memberInfo?.memberAccount === item?.memberAccount;
      return (
        <div key={item?.memberAccount} onClick={e => handleSelectMember(e, item)}>
          {renderUserCard(item, isSelected, isSelf ? '我' : undefined)}
        </div>
      );
    });

  // 渲染挂断按钮
  const renderHangUpBtn =
    (callState === ECallState.ON_CALL || callState === ECallState.CALLING) &&
    renderOperateBtn('挂断', EIconUrl.HANG_UP, handleOnCancel);

  // 渲染接通按钮
  const renderAcceptBtn =
    callState === ECallState.BE_CALLED && renderOperateBtn('接通', EIconUrl.ACCEPT, handleOnAccept);

  // 拒绝按钮
  const renderRefuseBtn =
    callState === ECallState.BE_CALLED &&
    renderOperateBtn('拒绝', EIconUrl.HANG_UP, handleOnRefuse);

  // 渲染切换语音按钮
  const renderAudioBtn =
    callState === ECallState.CALLING &&
    videoType === ECallType.VIDEO &&
    renderOperateBtn('切换语音', EIconUrl.AUDIO, handleOnAudio);

  // 渲染静音按钮
  const renderMuteBtn =
    callState === ECallState.CALLING &&
    videoType === ECallType.AUDIO &&
    !mute &&
    renderOperateBtn('静音', EIconUrl.MUTE, handleOnMute);

  // 渲染静音按钮
  const renderUnMuteBtn =
    callState === ECallState.CALLING &&
    videoType === ECallType.AUDIO &&
    mute &&
    renderOperateBtn('取消静音', EIconUrl.UNMUTE, handleOnUnmute);

  // 渲染按钮组
  const renderButtonGroup: React.ReactNode = [
    { name: 'hang-up', node: renderHangUpBtn },
    { name: 'accept', node: renderAcceptBtn },
    { name: 'refuse', node: renderRefuseBtn },
    { name: 'audio', node: renderAudioBtn },
    { name: 'mute', node: renderMuteBtn },
    { name: 'unmute', node: renderUnMuteBtn },
  ].map((item: IBtnItem) => <React.Fragment key={item.name}>{item.node}</React.Fragment>);

  // 空闲状态不展示
  if (callState === ECallState.FREE) {
    return null;
  }

  return (
    <div
      className={classNames({ [styles.fullScreen]: fullScreen }, styles.container, className)}
      style={style}
    >
      <Draggable handle=".can-drag" disabled={fullScreen}>
        <ResizableBox
          draggableOpts={{ disabled: fullScreen }}
          width={512}
          height={300}
          minConstraints={[379, 222]}
          resizeHandles={['sw', 'se', 'nw', 'ne']}
          className={classNames(styles.resizableBox, 'videochat-realize-box')}
          // maxConstraints={[800, 800]}
          lockAspectRatio
        >
          <div className={classNames(styles.bg, 'can-drag')}>
            <div className={styles.leftContent}>
              <div className={styles.mainVideo} id="main-video" />
              <GmIcon
                type={`fa ${fullScreen ? 'fa-compress-alt' : 'fa-expand-alt'}`}
                className={styles.screenFullIcon}
                onClick={() => handleChangeFullScreen(fullScreen)}
              />
              {callState === ECallState.BE_CALLED && renderBeCall}
              {callState === ECallState.ON_CALL && renderOnCall}
              {callState === ECallState.CALLING && renderCalling}
              {renderExpandIcon(expand)}
              <div className={styles.footer}>
                {renderTips(tipText)}
                <div className={styles.buttonGroup}>{renderButtonGroup}</div>
              </div>
            </div>
            <div className={classNames(styles.rightContent, { [styles.contentExpand]: expand })}>
              {renderMemberList}
            </div>
          </div>
        </ResizableBox>
      </Draggable>
    </div>
  );
});

export function resolveProps(props: IGmRtcProps) {
  const { plugins = [], device = true } = props;

  return {
    ...props,
    device,
    plugins,
  };
}
