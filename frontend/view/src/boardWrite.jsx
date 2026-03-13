import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import { createWriteStyles, getNormalize } from '../../styles/board.style';
import { useAppNavigation } from '../../navigation/useAppNavigation';

const BoardWrite = ({ route }) => {
  const { resetTo, goBack } = useAppNavigation();
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createWriteStyles(width, normalize), [width, normalize]);

  const [content, setContent] = useState('');
  // 이 화면이 어디에서 열렸는지 (기본값: Main 게시판)
  const fromScreen = route?.params?.from ?? 'Main';

  const handleBack = () => {
    goBack();
  };

  const handleComplete = () => {
    // TODO: 게시글 저장 로직 (API 호출 등)
    // 진입 위치에 따라 뒤로가기 동작을 다르게 처리
    if (fromScreen === 'Main') {
      // 메인 게시판에서 온 경우: 전체 스택을 Main 하나로 초기화
      resetTo('Main');
    } else if (fromScreen === 'SchoolBoardAll') {
      // 학교 게시판에서 온 경우:
      //   Main(학교 탭) → SchoolBoardAll → BoardWrite 스택 구조라고 가정
      //   글쓰기 완료 후엔 단순히 한 단계만 돌아가서 SchoolBoardAll로 복귀
      goBack();
    } else {
      // 기타 진입 경로는 보수적으로 한 단계만 뒤로가기
      goBack();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1 }}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <SubHeader
            title="글쓰기"
            onBack={handleBack}
            rightButtonText="완료"
            onRightPress={handleComplete}
          />

          <View style={styles.box} />

          <View style={styles.content}>
            <TextInput
              style={styles.textInput}
              placeholder="오늘의 이야기를 들려주세요"
              placeholderTextColor={styles.placeholder.color}
              multiline
              value={content}
              onChangeText={setContent}
            />
          </View>
        </SafeAreaView>
        <View style={styles.box2}>
          <View style={styles.guideContainer}>
            <Text style={styles.guideText}>비방/욕설 게시글은 </Text>
            <TouchableOpacity onPress={() => {/* TODO: 가이드 페이지로 이동 */}}>
              <Text style={styles.guideLink}>커뮤니티 가이드</Text>
            </TouchableOpacity>
            <Text style={styles.guideText}>에 따라 삭제될 수 있어요</Text>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default BoardWrite;
