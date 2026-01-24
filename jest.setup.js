process.env.NODE_ENV = 'test';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
  getStringAsync: jest.fn(() => Promise.resolve('')),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: false, assets: [{ uri: 'test://image' }] })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: false, assets: [{ uri: 'test://image' }] })),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

// Mock ML Kit OCR
jest.mock('@react-native-ml-kit/text-recognition', () => ({
  default: {
    recognize: jest.fn(() => Promise.resolve({ blocks: [] })),
  },
}));

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
