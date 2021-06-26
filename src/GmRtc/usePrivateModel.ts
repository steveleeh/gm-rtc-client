import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useSelector, Model, useDispatch } from 'dva';
import { Dispatch } from 'redux';

export interface ConnectState {
  [key: string]: Model;
}

interface IInitialValue {
  /* 前缀 */
  prefix?: string;
  model: Model;
}

interface PrivateModelValue<T> {
  /* model名称 */
  namespace: string;
  /* model数据 */
  data: T;
  dispatch: Dispatch;
  /* 获取model数据 */
  getState: () => Nullable<T>;
}

/**
 * 私有model
 * @param initialValue
 * @constructor
 */
function UsePrivateModel<T = any>(initialValue?: IInitialValue): PrivateModelValue<T> {
  const [namespace] = useState<string>(() => {
    if (initialValue?.prefix) {
      return `${initialValue?.prefix}-${uuid()}`;
    }
    return uuid();
  });
  const data = useSelector<ConnectState, any>(state => state[namespace]);

  const dispatch: Dispatch = useDispatch();

  // @ts-ignore
  const getState = (): T =>
    // @ts-ignore
    window.g_app._store.getState()[namespace];

  useEffect(() => {
    // @ts-ignore
    window.g_app.model({
      ...initialValue?.model,
      namespace,
    });

    return () => {
      // @ts-ignore
      window.g_app.unmodel(namespace);
    };
  }, []);

  return {
    namespace,
    data,
    dispatch,
    getState,
  };
}

export default UsePrivateModel;
