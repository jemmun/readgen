declare module 'expo-camera' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface BarCodeScanningResult {
    type: string;
    data: string;
  }

  export interface CameraProps extends ViewProps {
    type?: 'front' | 'back';
    barCodeScannerSettings?: {
      barCodeTypes?: string[];
    };
    onBarCodeScanned?: (result: BarCodeScanningResult) => void;
    style?: any;
  }

  export const Camera: ComponentType<CameraProps>;
  export function useCameraPermissions(): [
    { status: string; granted: boolean } | null,
    () => Promise<void>
  ];
}

declare module 'react-native-qrcode-svg' {
  import { ComponentType } from 'react';
  interface QRCodeProps {
    value: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
  }
  const QRCode: ComponentType<QRCodeProps>;
  export default QRCode;
}

declare module 'qrcode' {
  export function toDataURL(text: string, options?: any): Promise<string>;
}

declare module 'expo-auth-session' {
  export function useAuthRequest(
    config: any,
    discovery: any
  ): [any, any, (options?: any) => Promise<any>];
  export function makeRedirectUri(options?: any): string;
  export function startAsync(options: any): Promise<any>;
  export function dismissBrowser(): void;
  export function maybeCompleteAuthSession(options?: any): void;
  export const ResponseType: {
    Token: string;
    Code: string;
    IdToken: string;
  };
  export const Prompt: {
    SelectAccount: string;
    Consent: string;
    Login: string;
    None: string;
  };
}

declare module 'expo-web-browser' {
  export function openBrowserAsync(url: string, options?: any): Promise<any>;
  export function maybeCompleteAuthSession(options?: any): void;
}

declare module 'expo-crypto' {
  export function digestStringAsync(algorithm: string, data: string): Promise<string>;
}
