react-native-keyboard-controllerReact Native에 내장된 키보드 API를 넘어 추가적인 기능을 제공하여 최소한의 설정으로 Android와 iOS에서 일관성을 유지하고 사용자가 기대하는 네이티브 키보드 느낌을 제공합니다.

설치
단말기

복사

npx expo install react-native-keyboard-controller
기존 React Native 앱 에 설치하는 경우 , 먼저 프로젝트에 설치 하세요 . 그런 다음 라이브러리의 README 또는 문서에 제공된 설치 지침을 따르세요. expo

용법
키보드 컨트롤러

복사

스낵 에서 열기

import { TextInput, View, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';

export default function FormScreen() {
return (
<>
<KeyboardAwareScrollView bottomOffset={62} contentContainerStyle={styles.container}>
<View>
<TextInput placeholder="Type a message..." style={styles.textInput} />
<TextInput placeholder="Type a message..." style={styles.textInput} />
</View>
<TextInput placeholder="Type a message..." style={styles.textInput} />
<View>
<TextInput placeholder="Type a message..." style={styles.textInput} />
<TextInput placeholder="Type a message..." style={styles.textInput} />
<TextInput placeholder="Type a message..." style={styles.textInput} />
</View>
<TextInput placeholder="Type a message..." style={styles.textInput} />
</KeyboardAwareScrollView>
<KeyboardToolbar />
</>
);
}

const styles = StyleSheet.create({
container: {
gap: 16,
padding: 16,
},
listStyle: {
padding: 16,
gap: 16,
},
textInput: {
width: 'auto',
flexGrow: 1,
flexShrink: 1,
height: 45,
borderWidth: 1,
borderRadius: 8,
borderColor: '#d8d8d8',
backgroundColor: '#fff',
padding: 8,
marginBottom: 8,
},
});

더 보기
키보드 사용법 기본
다음 섹션에서는 일반적인 API에서 키보드 상호 작용을 처리하는 방법을 설명합니다.

키보드 회피 보기
이 KeyboardAvoidingView구성 요소는 화면에 표시되는 동안 키보드 높이에 따라 뷰의 높이, 위치 또는 하단 패딩을 자동으로 조정하여 계속 보이도록 합니다.

Android와 iOS는 `<input>` 속성을 다르게 처리합니다 behavior. iOS에서는 padding일반적으로 `<input>`이 가장 효과적이며, Android에서는 `<input>`만 있어도 KeyboardAvoidingView입력란이 가려지는 것을 방지할 수 있습니다. 따라서 다음 예제에서는 undefinedAndroid에서 `<input>`을 사용합니다. behavior하지만 앱에 따라 다른 옵션이 더 적합할 수 있으므로 `<input>` 속성을 다양하게 시도해 보는 것이 좋습니다.

홈스크린.tsx

복사

import { KeyboardAvoidingView, TextInput } from 'react-native';

export default function HomeScreen() {
return (
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
<TextInput placeholder="Type here..." />
</KeyboardAvoidingView>;
);
}
위 예시에서처럼 입력란의 높이는 KeyboardAvoidingView기기의 키보드 높이에 따라 자동으로 조절되므로 입력 내용이 항상 보이도록 합니다.

Android에서 하단 탭 네비게이터를 사용할 때 입력 필드에 포커스가 맞춰지면 하단 탭이 키보드 위로 밀려나는 현상이 발생할 수 있습니다. 이 문제를 해결하려면 앱 구성softwareKeyboardLayoutMode 의 Android 설정에 해당 속성을 추가 하고 값을 로 설정하세요 .pan

앱.json

복사

"expo" {
"android": {
"softwareKeyboardLayoutMode": "pan"
}
}
이 속성을 추가한 후 개발 서버를 다시 시작하고 앱을 다시 로드하여 변경 사항을 적용하세요.

키보드가 열릴 때 하단 탭을 숨기는 것도 가능합니다 tabBarHideOnKeyboard. 이는 Bottom Tab Navigator의 옵션 중 하나이며, 이 옵션을 로 설정하면 true키보드가 열릴 때 하단 탭이 숨겨집니다.

src/app/\_layout.tsx

복사

import { Tabs } from 'expo-router';

export default function TabLayout() {
return (
<Tabs
screenOptions={{
        tabBarHideOnKeyboard: true,
      }}>
<Tabs.Screen name="index" />
</Tabs>
);
}
키보드 이벤트
React Native의 모듈 Keyboard을 사용하면 네이티브 이벤트를 수신하고, 이에 반응하여 키보드를 숨기는 등의 변경을 수행할 수 있습니다.

키보드 이벤트를 수신하려면 해당 Keyboard.addListener메서드를 사용하십시오. 이 메서드는 이벤트 이름과 콜백 함수를 인수로 받습니다. 키보드가 표시되거나 숨겨질 때, 콜백 함수가 이벤트 데이터와 함께 호출됩니다.

다음 예제는 키보드 리스너를 추가하는 사용 사례를 보여줍니다. 상태 변수는 isKeyboardVisible키보드가 나타나거나 숨겨질 때마다 토글됩니다. 이 변수를 기반으로, 키보드가 활성화된 경우에만 사용자가 키보드를 숨길 수 있는 버튼을 제공합니다. 또한, 버튼이 해당 Keyboard.dismiss메서드를 사용하는 것을 확인할 수 있습니다.

홈스크린.tsx

복사

import { useEffect, useState } from 'react';
import { Keyboard, View, Button, TextInput } from 'react-native';

export default function HomeScreen() {
const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

useEffect(() => {
const showSubscription = Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
const hideSubscription = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };

}, []);

const handleKeyboardShow = event => {
setIsKeyboardVisible(true);
};

const handleKeyboardHide = event => {
setIsKeyboardVisible(false);
};

return (
<View>
{isKeyboardVisible && <Button title="Dismiss keyboard" onPress={Keyboard.dismiss} />}
<TextInput placeholder="Type here..." />
</View>
);
}
키보드 컨트롤러를 이용한 고급 키보드 조작
여러 개의 텍스트 입력 필드가 있는 스크롤 가능한 대형 입력 양식과 같이 더 복잡한 키보드 상호 작용의 경우 react-native-keyboard-controller(Keyboard Controller) 라이브러리 사용을 고려해 보세요. 이 라이브러리는 React Native의 내장 키보드 API보다 더 많은 기능을 제공하며, 최소한의 설정으로 Android와 iOS에서 일관성을 유지하고 사용자가 기대하는 네이티브 앱과 같은 느낌을 제공합니다.

필수 조건
Expo Go에는 키보드 컨트롤러 라이브러리가 포함되어 있지 않으므로 다음 단계는 개발 빌드를 기준으로 설명합니다. 자세한 내용은 개발 빌드 생성하기를 참조하십시오.

키보드 컨트롤러 도 react-native-reanimated제대로 작동해야 합니다. 설치하려면 다음 설치 지침을 따르세요 .

설치하다
먼저 Expo 프로젝트에 Keyboard Controller 라이브러리를 설치하세요.

단말기

복사

npx expo install react-native-keyboard-controller
설정 제공업체
설정을 완료하려면 KeyboardProvider앱에 추가하세요.

src/app/\_layout.tsx

복사

import { Stack } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';

export default function RootLayout() {
return (
<KeyboardProvider>
<Stack>
<Stack.Screen name="home" />
<Stack.Screen name="chat" />
</Stack>
</KeyboardProvider>
);
}
여러 입력값 처리
이 KeyboardAvoidingView구성 요소는 프로토타입 제작에 매우 유용하지만, 플랫폼별 구성이 필요하고 사용자 정의 기능이 제한적입니다.

더 강력한 대안으로 컴포넌트를 사용할 수 있습니다 KeyboardAwareScrollView. 이 컴포넌트는 포커스된 위치로 자동으로 스크롤되며 TextInput네이티브 앱과 유사한 성능을 제공합니다. 요소가 몇 개 없는 간단한 화면에는 KeyboardAwareScrollView이 방법을 사용하는 것이 좋습니다.

여러 입력 포트가 있는 화면의 경우, 키보드 컨트롤러 라이브러리는 KeyboardToolbar함께 사용할 수 있는 컴포넌트 도 제공합니다 KeyboardAwareScrollView. 이 두 컴포넌트를 함께 사용하면 입력 포트 탐색을 처리하고 사용자 지정 설정 없이 키보드가 화면을 가리는 것을 방지할 수 있습니다.

폼스크린.tsx

복사

import { TextInput, View, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';

export default function FormScreen() {
return (
<>
<KeyboardAwareScrollView bottomOffset={62} contentContainerStyle={styles.container}>
<View>
<TextInput placeholder="Type a message..." style={styles.textInput} />
<TextInput placeholder="Type a message..." style={styles.textInput} />
</View>
<TextInput placeholder="Type a message..." style={styles.textInput} />
<View>
<TextInput placeholder="Type a message..." style={styles.textInput} />
<TextInput placeholder="Type a message..." style={styles.textInput} />
<TextInput placeholder="Type a message..." style={styles.textInput} />
</View>
<TextInput placeholder="Type a message..." style={styles.textInput} />
</KeyboardAwareScrollView>
<KeyboardToolbar />
</>
);
}

const styles = StyleSheet.create({
container: {
gap: 16,
padding: 16,
},
listStyle: {
padding: 16,
gap: 16,
},
textInput: {
width: 'auto',
flexGrow: 1,
flexShrink: 1,
height: 45,
borderWidth: 1,
borderRadius: 8,
borderColor: '#d8d8d8',
backgroundColor: '#fff',
padding: 8,
marginBottom: 8,
},
});

더 보기
위 예시는 KeyboardAwareScrollView키보드가 입력 필드를 가리지 않도록 입력 필드를 감싸는 요소를 보여줍니다. 이 KeyboardToolbar컴포넌트는 탐색 컨트롤과 닫기 버튼을 표시합니다. 별도의 설정 없이도 작동하지만, 필요한 경우 툴바 콘텐츠를 사용자 지정할 수 있습니다.

키보드 높이에 맞춰 뷰 애니메이션을 적용합니다.
보다 고급스럽고 사용자 정의 가능한 접근 방식을 위해서는 를 사용할 수 있습니다 useKeyboardHandler. 는 키보드 수명 주기 이벤트에 접근할 수 있도록 해주며, 키보드 애니메이션이 시작되는 시점과 애니메이션의 각 프레임에서 키보드의 위치를 ​​파악할 수 있게 해줍니다.

이 후크를 사용하면 useKeyboardHandler각 프레임에서 키보드의 높이에 접근할 수 있는 사용자 지정 후크를 만들 수 있습니다. useSharedValue아래와 같이 reanimated에서 높이를 반환합니다.

채팅 화면.tsx

복사

import { useKeyboardHandler } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const useGradualAnimation = () => {
const height = useSharedValue(0);

useKeyboardHandler(
{
onMove: event => {
'worklet';
height.value = Math.max(event.height, 0);
},
},
[]
);
return { height };
};
useGradualAnimation`reanimated` 훅을 사용하면 키보드가 활성화되거나 닫힐 때 뷰에 부드러운 애니메이션 효과를 줄 수 있습니다. 예를 들어 아래 예시의 채팅 화면 컴포넌트에서 사용할 수 있습니다. 이 컴포넌트는 `reanimated` 훅을 통해 키보드 높이를 가져옵니다. 그런 다음 `reanimated` 훅을 fakeView사용하여 `animated`라는 애니메이션 스타일을 생성합니다. 이 스타일에는 `keyboard`의 높이를 값으로 하는 `style` useAnimatedStyle이라는 속성 하나만 포함됩니다 .height

이 fakeView애니메이션 스타일은 <div> 태그 다음에 나오는 애니메이션 뷰에 사용됩니다 TextInput. 이 뷰의 높이는 매 프레임마다 키보드의 높이에 따라 애니메이션되어 콘텐츠가 키보드 위로 부드러운 애니메이션 효과를 내며 밀려납니다. 또한 키보드가 사라지면 높이가 0으로 줄어듭니다.

채팅 화면.tsx

복사

import { StyleSheet, Platform, FlatList, View, StatusBar, TextInput } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';

import MessageItem from '@/components/MessageItem';
import { messages } from '@/messages';

const useGradualAnimation = () => {
// Code remains same from previous example
};

export default function ChatScreen() {
const { height } = useGradualAnimation();

const fakeView = useAnimatedStyle(() => {
return {
height: Math.abs(height.value),
};
}, []);

return (
<View style={styles.container}>
<FlatList
data={messages}
renderItem={({ item }) => <MessageItem message={item} />}
keyExtractor={item => item.createdAt.toString()}
contentContainerStyle={styles.listStyle}
/>
<TextInput placeholder="Type a message..." style={styles.textInput} />
<Animated.View style={fakeView} />
</View>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
},
listStyle: {
padding: 16,
gap: 16,
},
textInput: {
width: '95%',
height: 45,
borderWidth: 1,
borderRadius: 8,
borderColor: '#d8d8d8',
backgroundColor: '#fff',
padding: 8,
alignSelf: 'center',
marginBottom: 8,
},
});

더 보기
