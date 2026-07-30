// app.config.js
// .env 로드: expo prebuild/run 시 CLI가 처리, AAB gradlew 시 scripts/gradle-bundle-release.mjs
import { resolveApiBaseUrl, resolveAppEnv } from './config/apiEnv.js';

const apiBaseUrl = resolveApiBaseUrl();
const appEnv = resolveAppEnv();
const isProduction = appEnv === 'production';

export default ({ config }) => ({
  expo: {
    name: 'Youth Paper',
    slug: 'youth-paper',
    scheme: 'youthpaper',
    version: '1.5.12',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,

    splash: {
      image: './assets/splash-icon-android.png',
      resizeMode: 'contain',
      backgroundColor: '#E5F4E0',
    },

    ios: {
      supportsTablet: true,
      // 핵심: EAS에서는 secret 파일 경로, 로컬은 기존 파일 경로
      googleServicesFile:
        process.env.GOOGLE_SERVICE_INFO_PLIST || './GoogleService-Info.plist',
      infoPlist: {
        UIViewControllerBasedStatusBarAppearance: false,
        NSCameraUsageDescription:
          '학생증 인증을 위해 카메라 접근 권한이 필요합니다.',
        NSLocationWhenInUseUsageDescription:
          '게시판 근처 글·거리 표시를 위해 사용 중에만 위치 정보를 사용합니다.',
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
        ITSAppUsesNonExemptEncryption: false,
      },
      bundleIdentifier: 'com.ucost.YouthPaper',
      splash: {
        image: './assets/splash-icon-android.png',
        resizeMode: 'contain',
        backgroundColor: '#E5F4E0',
      },
    },

    android: {
      versionCode: 21,
      usesCleartextTraffic: !isProduction,
      // (선택) 안드로이드도 같은 방식으로 secret 적용 가능
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      splash: {
        image: './assets/splash-icon-android.png',
        resizeMode: 'contain',
        backgroundColor: '#E5F4E0',
      },
      edgeToEdgeEnabled: true,
      permissions: [
        'CAMERA',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
        'android.permission.READ_MEDIA_IMAGES',
      ],
      package: 'com.ucost.YouthPaper',
      softwareKeyboardLayoutMode: 'pan',
    },

    web: {
      favicon: './assets/favicon.png',
    },

    plugins: [
      'expo-font',
      'expo-web-browser',
      'expo-image',
      'expo-status-bar',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#E5F4E0',
          image: './assets/splash-icon-android.png',
          imageWidth: 220,
          resizeMode: 'contain',
          ios: {
            image: './assets/splash-icon-android.png',
            imageWidth: 220,
            resizeMode: 'contain',
            backgroundColor: '#E5F4E0',
          },
          android: {
            image: './assets/splash-icon-android.png',
            imageWidth: 220,
            resizeMode: 'contain',
            backgroundColor: '#E5F4E0',
          },
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            '학생증 인증을 위해 카메라 접근 권한이 필요합니다.',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            '게시판 근처 글·거리 표시를 위해 사용 중에만 위치 정보를 사용합니다.',
        },
      ],
      [
        'expo-media-library',
        {
          photosPermission:
            '갤러리에서 사진을 불러오기 위해 접근 권한이 필요합니다.',
          savePhotosPermission:
            '캡처한 이미지를 갤러리에 저장하기 위해 권한이 필요합니다.',
          granularPermissions: ['photo'],
        },
      ],
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      '@react-native-firebase/messaging',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            extraPods: [
              { name: 'GoogleUtilities', modular_headers: true },
              { name: 'FirebaseCoreInternal', modular_headers: true },
            ],
          },
          android: {
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            extraProguardRules:
              '-keep class com.facebook.react.** { *; }\n-keep class com.facebook.hermes.** { *; }\n-keep class com.facebook.jni.** { *; }\n-dontwarn com.facebook.react.**\n',
          },
        },
      ],
      './plugins/withFirebaseModularHeaders',
      './plugins/withAndroidReleaseSigning.cjs',
      './plugins/withAndroidMainActivityLaunchMode.cjs',
      './plugins/withAndroidCameraPreviewCompatible.cjs',
    ],

    extra: {
      ...(config?.expo?.extra ?? {}),
      apiBaseUrl,
      appEnv,
      eas: {
        projectId: '39e0f4f8-dd46-4921-a4bf-68856fdfc85c',
        ...(config?.expo?.extra?.eas ?? {}),
      },
    },

    owner: 'ucost',
  },
});
