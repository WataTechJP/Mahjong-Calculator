const mockConstants = {
  expoConfig: { hostUri: undefined as string | undefined },
  manifest: undefined as { debuggerHost?: string } | undefined,
  manifest2: undefined as
    | { extra?: { expoClient?: { hostUri?: string } } }
    | undefined,
};

const mockReactNative = {
  NativeModules: {
    SourceCode: {
      scriptURL: undefined as string | undefined,
    },
  },
  Platform: {
    OS: 'ios' as 'ios' | 'android',
  },
};

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: mockConstants,
}));

jest.mock('react-native', () => mockReactNative);

import { resolveApiBaseUrl } from './client';

describe('resolveApiBaseUrl', () => {
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    mockConstants.expoConfig.hostUri = undefined;
    mockConstants.manifest = undefined;
    mockConstants.manifest2 = undefined;
    mockReactNative.NativeModules.SourceCode.scriptURL = undefined;
    mockReactNative.Platform.OS = 'ios';
  });

  afterAll(() => {
    if (originalApiBaseUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
      return;
    }

    process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
  });

  it('prefers EXPO_PUBLIC_API_BASE_URL when set', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://192.168.0.50:8000';

    expect(resolveApiBaseUrl()).toBe('http://192.168.0.50:8000');
  });

  it('uses the Expo bundle host on LAN for devices', () => {
    mockConstants.expoConfig.hostUri = '192.168.0.50:8081';

    expect(resolveApiBaseUrl()).toBe('http://192.168.0.50:8000');
  });

  it('maps localhost to the Android emulator loopback', () => {
    mockReactNative.Platform.OS = 'android';
    mockConstants.expoConfig.hostUri = 'localhost:8081';

    expect(resolveApiBaseUrl()).toBe('http://10.0.2.2:8000');
  });

  it('falls back to the Android emulator loopback when Expo is in tunnel mode', () => {
    mockReactNative.Platform.OS = 'android';
    mockReactNative.NativeModules.SourceCode.scriptURL = 'exp://abcd1234.exp.direct:80';

    expect(resolveApiBaseUrl()).toBe('http://10.0.2.2:8000');
  });

  it('falls back to iOS simulator localhost when no local host is discoverable', () => {
    mockReactNative.NativeModules.SourceCode.scriptURL = 'exp://abcd1234.exp.direct:80';

    expect(resolveApiBaseUrl()).toBe('http://127.0.0.1:8000');
  });
});
