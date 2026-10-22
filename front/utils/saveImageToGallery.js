import { Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library/legacy';
import { getUserFacingErrorMessageFromUnknown } from './userFacingError';

export class GalleryPermissionError extends Error {
  constructor() {
    super('PERMISSION_DENIED');
    this.code = 'PERMISSION_DENIED';
    this.name = 'GalleryPermissionError';
  }
}

/** ViewShot 등으로 얻은 로컬 URI를 갤러리(사진 앱)에 저장 */
export async function saveImageUriToGallery(uri) {
  if (!uri) {
    throw new Error('MISSING_URI');
  }

  // 전체 앨범 읽기 권한 없이, 앱이 만든 이미지를 갤러리에 추가하는 저장만 요청한다.
  const { status } = await MediaLibrary.requestPermissionsAsync(true);
  if (status !== 'granted') {
    throw new GalleryPermissionError();
  }

  await MediaLibrary.saveToLibraryAsync(uri);
}

export function alertGalleryPermissionDenied() {
  Alert.alert('권한 필요', '사진 저장을 위해 갤러리 접근 권한이 필요해요');
}

export function alertGallerySaveFailure(error) {
  if (error?.code === 'PERMISSION_DENIED') {
    alertGalleryPermissionDenied();
    return;
  }
  Alert.alert(
    '저장 실패',
    getUserFacingErrorMessageFromUnknown(
      error,
      '이미지 저장에 실패했어요. 다시 시도해 주세요.',
    ),
  );
}
