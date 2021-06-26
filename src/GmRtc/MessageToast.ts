import { v4 as uuid } from 'uuid';
import { cloneDeep, sortBy, findIndex } from 'lodash-es';

interface IMessageItem {
  id: string;
  /* 消息等级 */
  level: number;
  /* 消息内容 */
  content: string | Function;
  /* 持续时长(ms) 用不过期消息传Infinity */
  time: number;
}

export type MessageItemParams = Omit<IMessageItem, 'id' | 'time'> & {
  /* 持续时长(ms) 用不过期消息传Infinity */
  time?: number;
};

interface MessageToastQueueParams {
  /* 消息轮询频率(ms) */
  interval?: number;
  /* 消息队列 */
  queue?: Array<IMessageItem>;
  /* 消息通知频率 */
  noticeFrequency?: MessageNoticeFrequency;
}

export enum MessageNoticeFrequency {
  /* 只通知一次 一个消息被完整消费完才通知 */
  ONCE = 1,
  /* 总是通知 一个消息被部分消费也通知 */
  ALWAYS,
  /* 从不通知 */
  NEVER,
}

/* 消息等级 */
export enum EMessageLevel {
  /* 低: 默认长时间展示的消息都是低等级 */
  LOW = 1,
  /* 中等: 普通几秒的消息一般都设为中等级 */
  MIDDLE,
  /* 高：非常重要的消息立刻被展示出来，比如进房失败报错信息等 */
  HIGH,
}

/* 消息事件 */
export declare type MessageEventListener = (message: IMessageItem) => void;

export interface IMessageToast {
  /* 析构 */
  destory: () => void;
  /* 获取消息 */
  get: (id: string) => Nullable<IMessageItem>;
  /* 新增消息 */
  update: (id: string, item: Partial<MessageItemParams>) => void;
  /* 删除消息 */
  hide: (id: string) => void;
  /* 清空消息 */
  clear: () => void;
  /* 订阅消息 */
  subscribe: (listener: MessageEventListener) => void;
}

/**
 * 消息提示
 */
export default class MessageToast implements IMessageToast {
  /* 消息队列 */
  private queue: Array<IMessageItem>;
  /* 定时器id */
  private timeoutId: NodeJS.Timeout;
  /* 消息轮询频率(ms) */
  private interval: number;
  /* 消息通知频率 */
  private noticeFrequency: MessageNoticeFrequency;
  /* 消息回调事件 */
  private eventListener: Nullable<MessageEventListener>;

  constructor(params?: MessageToastQueueParams) {
    this.queue = params?.queue || [];
    this.interval = params?.interval || 500;
    this.timeoutId = setInterval(() => {
      this.consumeMessage();
    }, this.interval);
    this.noticeFrequency = params?.noticeFrequency || MessageNoticeFrequency.ONCE;
    this.eventListener = null;
  }

  /* 析构 */
  public destory(): void {
    clearTimeout(this.timeoutId);
  }

  /* 消费可用消息 */
  private consumeMessage() {
    // 消费级别最高的消息
    const firstNode = cloneDeep(sortBy(this.queue, item => -item.level)[0]);
    // 无数据
    if (!firstNode) {
      return;
    }
    // 第一个数据为无限时间数据 相当于消息队列被第一个数据一直阻塞
    if (firstNode.time === Infinity) {
      // 消息回调事件
      if (this.noticeFrequency === MessageNoticeFrequency.ALWAYS) {
        this.noticeConsumer(firstNode);
      }
      return;
    }
    const messageIndex = findIndex(this.queue, o => o.id === firstNode.id);
    // 队列时间大于零，下次继续轮询，直到数据小于零移除该项
    if (firstNode.time > 0) {
      this.queue[messageIndex] = {
        ...firstNode,
        time: (firstNode as IMessageItem).time - this.interval,
      };
      if (this.noticeFrequency === MessageNoticeFrequency.ALWAYS) {
        this.noticeConsumer(firstNode);
      }
      return;
    }
    // 移除该队列
    this.queue.splice(messageIndex, 1);
    if (
      this.noticeFrequency === MessageNoticeFrequency.ALWAYS ||
      this.noticeFrequency === MessageNoticeFrequency.ONCE
    ) {
      this.noticeConsumer(firstNode);
    }
  }

  /* 通知消费者 */
  private noticeConsumer(message: IMessageItem) {
    if (this.eventListener) {
      this.eventListener(message);
    }
  }

  /* 获取消息 */
  public get(id: string): Nullable<IMessageItem> {
    const messageIndex = findIndex(this.queue, o => o.id === id);
    if (messageIndex === -1) {
      return null;
    }
    return this.queue[messageIndex];
  }

  /* 新增消息 */
  public show(item: MessageItemParams): string {
    const id = uuid();
    this.queue.unshift({
      id: uuid(),
      // 默认2s
      time: 1000,
      ...item,
    });
    return id;
  }

  /* 新增消息 */
  public update(id: string, item: Partial<MessageItemParams>) {
    const messageIndex = findIndex(this.queue, o => o.id === id);
    if (messageIndex === -1) {
      return;
    }
    this.queue[messageIndex] = {
      // 默认2s
      // time: 1000,
      ...this.queue[messageIndex],
      ...item,
      id,
    };
  }

  /* 删除消息 */
  public hide(id: string) {
    const messageIndex = findIndex(this.queue, o => o.id === id);
    if (messageIndex === -1) {
      return;
    }
    this.queue.splice(messageIndex, 1);
  }

  /* 清空消息 */
  public clear() {
    this.queue = [];
  }

  /* 订阅消息 */
  public subscribe(listener: MessageEventListener): void {
    this.eventListener = listener;
  }
}
