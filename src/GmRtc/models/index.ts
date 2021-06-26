import { find } from 'lodash-es';
import { Stream } from 'trtc-js-sdk';
import { ECallState } from '@/types/ECallState';
import { IMembersInfo } from '@wjj/gm-type/dist/models/saas/members-info.model';
import { ECallerUserCard } from '@/types/ECallerUserCard';
import { ECallType } from '@/types/ECallType';
import { getImUserInfo, getImVideoConversationRoomInfoVOUsingPOST } from '@/services';
import { IGmRtc } from '../GmRtc';
import { BaseModel } from '../types';

export interface IVideoView {
  /* 成员信息 */
  memberInfo?: IMembersInfo;
  /* 音视频流 */
  stream?: Stream;
}

export interface StateType {
  client: Nullable<IGmRtc>;
  /* 会话id */
  conversationId: Nullable<number>;
  /*  视频通话状态 */
  callState: ECallState;
  /*  视频弹窗是否可见 */
  visible: boolean;
  /*  房间信息 */
  roomId: Nullable<number>;
  /*  应用标识 */
  sdkAppId: Nullable<number>;
  /* 用户标识 */
  userId: Nullable<string>;
  /* 用户签名 */
  userSig: Nullable<string>;
  /*  房间成员 */
  members: IMembersInfo[];
  /*  用户自己信息 */
  selfMember: Nullable<IMembersInfo>;
  /*  选中的用户 */
  selectedMember: Nullable<IMembersInfo>;
  /*  当前用户主叫类型 */
  userCard: ECallerUserCard;
  /*  拨打模式：（创建音视频时候定义的，和服务端一致） */
  callType: ECallType;
  /*  页面视频模式 */
  videoType: ECallType;
  /*  是否全屏 */
  fullScreen: boolean;
  /*  来源渠道 */
  sourceName: Nullable<string>;
  /*  面板是否展开 */
  expand: boolean;
  /*  是否静音 */
  mute: boolean;
  /* 主视频视图 */
  mainVideoView: IVideoView;
  /* 右侧用户列表视图 */
  minorVideoViews: IVideoView[];
}

// 初始数据
const initialState = (): StateType => ({
  client: null,
  conversationId: null,
  callState: ECallState.FREE,
  visible: false,
  roomId: null,
  sdkAppId: null,
  userId: null,
  userSig: null,
  members: [],
  selfMember: null,
  selectedMember: null,
  userCard: ECallerUserCard.HEALTH_STEWARD,
  callType: ECallType.VIDEO,
  videoType: ECallType.VIDEO,
  fullScreen: false,
  sourceName: '',
  expand: false,
  mute: false,
  mainVideoView: {},
  minorVideoViews: [],
});

const Model: BaseModel<StateType> = {
  namespace: 'videochat',
  state: initialState(),
  effects: {
    /* 获取用户im消息 */
    *getImUserInfo({ payload }, { put, call }) {
      try {
        const res = yield call(getImUserInfo, payload);
        const { accountNo, tencentUserSig } = res;
        yield put({
          type: 'setState',
          payload: {
            userId: accountNo,
            userSig: tencentUserSig,
          },
        });
        return { userId: accountNo, userSig: tencentUserSig };
      } catch (error) {
        console.warn(error);
        return null;
      }
    },
    /**
     * 音视频房间信息
     * @param {Object} payload 参数
     * @param {string} payload.roomId
     * @param {Number} payload.memberStatusCol 状态集合(10待呼叫，20呼叫中，30通话中，40已拒接，50已超时，60已挂断), 不传或者为null时查询全部
     * @param put
     * @param call
     * @param select
     */
    *getImRoomInfo({ payload }, { put, call, select }) {
      const res = yield call(getImVideoConversationRoomInfoVOUsingPOST, {
        roomId: payload.roomId,
        memberStatusCol: payload.memberStatusCol,
      });
      const userId = yield select((state: any) => state.imchat.userId);
      if (!res || !Array.isArray(res.roomMembersInfo)) {
        return;
      }
      const selfMemberInfo = find(res.roomMembersInfo, o => o.memberAccount === userId);
      const params: any = {
        members: res.roomMembersInfo,
      };
      if (selfMemberInfo) {
        params.selfMember = selfMemberInfo;
      }
      yield put({
        type: 'setState',
        payload: params,
      });
    },
  },
  reducers: {
    setState(state, { payload }) {
      console.log('setState', payload);
      return {
        ...state,
        ...payload,
      };
    },
    clear() {
      return initialState();
    },
  },
};

export default Model;
