# 작업 경로 (Windows)

이 레포의 로컬 루트는 **`C:\y`** 입니다.

| 폴더 | 설명 |
|------|------|
| `C:\y\back` | 백엔드 (Node.js / Express) |
| `C:\y\front` | 모바일 앱 (Expo / React Native) |

이전 경로 `C:\cucumber\frontend` → `C:\y\front`, `C:\cucumber\back` → `C:\y\back` 로 옮겼습니다.  
Windows 네이티브 빌드(260자 경로 제한) 대응을 위해 경로를 짧게 유지합니다.

## 최초 설정 (복사 후 1회)

```powershell
cd C:\y\back
npm install

cd C:\y\front
npm install
```

## Android develop 빌드

```powershell
cd C:\y
git checkout develop
cd C:\y\front
Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
npm run android:device:dev
```

자세한 내용: `front/BUILD_ANDROID.md`

## Cursor / IDE

**File → Open Folder → `C:\y`** 로 워크스페이스를 열어 주세요.  
`C:\cucumber` 는 더 이상 사용하지 않습니다 (삭제 전 백업 권장).
