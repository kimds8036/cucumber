# 📦 Expo 의존성 관리 브랜치

> ⚠️ 이 브랜치는 **설정 파일과 패키지 의존성만** 관리합니다.  
> 실제 소스 코드는 `dev/ui-design` 브랜치에서 관리됩니다.

## 📋 포함된 파일

### 필수 설정 파일
- `package.json` - 패키지 목록 및 버전
- `package-lock.json` - 정확한 의존성 트리
- `app.json` - Expo 앱 설정
- `babel.config.js` - Babel 설정
- `metro.config.js` - Metro 번들러 설정
- `tsconfig.json` - TypeScript 설정

### 코드 품질 도구
- `.eslintrc.js` - ESLint 설정
- `.prettierrc.js` - Prettier 설정

### 기타
- `.watchmanconfig` - Watchman 설정
- `.gitignore` - Git 제외 파일 목록

## 🎯 사용 목적

1. **버전 통일**: 팀 전체가 동일한 패키지 버전 사용
2. **충돌 방지**: 의존성 충돌 최소화
3. **안정성**: 검증된 패키지 조합 유지

## 🔄 워크플로우

### 담당자: 새 패키지 추가
```bash
# 1. 이 브랜치로 전환
git checkout deps/expo-stable
git pull origin deps/expo-stable

# 2. 패키지 설치
npm install 패키지명

# 3. 커밋 & 푸시
git add package.json package-lock.json
git commit -m "chore: Add 패키지명"
git push origin deps/expo-stable

# 4. 팀 채팅에 공지
```

### 팀원: 의존성 동기화
```bash
# dev/ui-design 브랜치에서
git checkout dev/ui-design

# 패키지 정보만 가져오기
git fetch origin deps/expo-stable
git checkout origin/deps/expo-stable -- package.json package-lock.json

# 의존성 재설치
rm -rf node_modules
npm install

# 캐시 정리
rm -rf .expo
npx expo start -c
```

## 🚨 충돌 자주 나는 패키지 (주의!)

다음 패키지들은 **버전이 매우 중요**합니다:

- `expo` - Expo SDK 버전 (모든 expo-* 패키지 버전 결정)
- `react` & `react-native` - 서로 호환되는 버전 필수
- `react-navigation` 관련 - 모든 하위 패키지 버전 맞춰야 함
- `react-native-reanimated` - 네이티브 코드 포함, 버전 중요
- `react-native-gesture-handler` - 네이티브 코드 포함

## 📌 버전 고정 규칙

- `~51.0.0` - 마이너 버전 고정 (51.0.x만 허용)
- `18.2.0` - 정확한 버전 고정
- `^7.0.0` - 메이저 버전 고정 (7.x.x 허용) - 사용 지양

## ⚠️ 주의사항

1. **직접 설치 금지**: 담당자만 패키지 설치
2. **코드 작업 금지**: 이 브랜치에서는 설정만 수정
3. **즉시 공유**: 변경사항은 바로 푸시하고 팀에 알림
4. **정기 동기화**: 일주일에 한 번은 dev/ui-design과 동기화

## 🔧 문제 해결

### "버전 충돌" 발생 시
```bash
rm -rf node_modules package-lock.json
git checkout origin/deps/expo-stable -- package.json package-lock.json
npm install
```

### "캐시 오류" 발생 시
```bash
rm -rf .expo node_modules
npm install
npx expo start -c
```

## 📞 문의

패키지 관련 문제나 새 패키지 필요 시:
- 담당자: [이름]
- 채널: [Slack/Discord 채널명]