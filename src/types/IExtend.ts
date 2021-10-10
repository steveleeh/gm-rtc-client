/**
 * 拓展字段
 * 音视频房间信息extend，标识一些自定义特殊字段处理业务
 */
export interface IExtend {
  /** 拨打场景 */
  callSense?: number;
  /** 患者地址 */
  patientAddress?: string;
  /** 来源名称 */
  sourceName?: string;
  /** 来源类型 */
  sourceType?: number;
  /** 手机号 */
  phoneNo?: string;
  /** 关系类型 */
  relationType?: string;
  [key: string]: any;
}
