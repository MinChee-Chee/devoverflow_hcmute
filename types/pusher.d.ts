export {};

declare global {
  interface Window {
    PusherPushNotifications?: {
      Client: new (options: { instanceId: string }) => {
        start: () => Promise<void>;
        addDeviceInterest: (interest: string) => Promise<void>;
        removeDeviceInterest: (interest: string) => Promise<void>;
        clearDeviceInterests: () => Promise<void>;
        getDeviceInterests: () => Promise<string[]>;
      };
    };
  }
}

