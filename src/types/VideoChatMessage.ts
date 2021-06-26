export interface IVideoChatMessage {
  callType: number;
  conversationId: number;
  eventName: string;
  eventType: number;
  isKeyMember: number;
  roomId: number;
  sponsorHeadPortrait: string;
  sponsorImKey: string;
  sponsorNickName: string;
}
