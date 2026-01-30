import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import { createWriteStyles, getNormalize } from '../../styles/board.style';

const BoardWrite = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createWriteStyles(width, normalize), [width, normalize]);

  const [content, setContent] = useState('');

  const handleBack = () => {
    navigation.goBack();
  };

  const handleComplete = () => {
    // TODO: 게시글 저장 로직
    navigation.navigate('Main');
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
