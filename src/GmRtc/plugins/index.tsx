import { ResolvedProps, GmRtcClientPluginContext } from '../types';

export enum RTCEvent {
  /* 进房成功 */
  JOIN_SUCCESS = 'onJoinSuccess',
  /* 进房失败 */
  JOIN_ERROR = 'onJoinError',
}

export const usePluginContainer = (props: ResolvedProps, context: GmRtcClientPluginContext) => {
  const { plugins: rawPlugins } = props;

  const plugins = rawPlugins.map(usePlugin => usePlugin?.(props, context)).filter(Boolean);

  const container: IContainer = {} as IContainer;
  Object.keys(RTCEvent).map(item => {
    function pluginFn() {
      for (const plugin of plugins) {
        if (plugin?.[item]) {
          plugin[item]?.(...arguments);
        }
      }
    }
    container[item] = pluginFn;
  });

  // const container = Object.fromEntries(
  //   Object.keys(RTCEvent).map(item => {
  //     function pluginFn() {
  //       for (const plugin of plugins) {
  //         plugin?.[item]?.(...(arguments as any));
  //       }
  //     }
  //     return [item, pluginFn];
  //   }),
  // );
  return container;
};

interface IContainer {
  onJoinSuccess: (name: string) => void;
  onJoinError: (name: string) => void;
}
