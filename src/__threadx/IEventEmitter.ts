export interface IEventEmitter<
  T extends object = { [s: string]: (target: any, data: any) => void },
> {
  on<K extends keyof T>(event: Extract<K, string>, listener: T[K]): void;
  once<K extends keyof T>(event: Extract<K, string>, listener: T[K]): void;
  off<K extends keyof T>(event: Extract<K, string>, listener: T[K]): void;
  emit<K extends keyof T>(
    event: Extract<K, string>,
    data: Parameters<any>[1],
  ): void;
}
