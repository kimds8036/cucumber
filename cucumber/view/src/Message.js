import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { createMessageStyles, getNormalize } from '../../styles/message.style';
import { colors, fonts } from '../../styles/colors';

// 메인 화면(MainScreen)에서 헤더/푸터 없이 메인 영역만 렌더할 때 사용
export function MessageContent() {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMessageStyles(width, normalize), [width, normalize]);

  const [messageType, setMessageType] = useState('note'); // 'note' | 'mail'

  return (
    <>
      {/* 쪽지/개인우편 토글 (게시판 정렬 버튼 영역과 동일 위치) */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleTrack}>
          <TouchableOpacity
            style={[styles.toggleOption, messageType === 'note' ? styles.toggleOptionActive : styles.toggleOptionInactive]}
            onPress={() => setMessageType('note')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleOptionText, messageType === 'note' && styles.toggleOptionTextActive]}>
              쪽지
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, messageType === 'mail' ? styles.toggleOptionActive : styles.toggleOptionInactive]}
            onPress={() => setMessageType('mail')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleOptionText, messageType === 'mail' && styles.toggleOptionTextActive]}>
              개인 우편
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 메인 내용 영역 - 추후 쪽지 목록 / 개인우편 목록 등 */}
      <View style={styles.contentArea}>
        {messageType === 'note' ? (
          <Text style={{ fontFamily: fonts.regular, color: colors.textPrimary, fontSize: normalize(14) }}>
            쪽지 목록 영역 (추가 예정)
          </Text>
        ) : (
          <Text style={{ fontFamily: fonts.regular, color: colors.textPrimary, fontSize: normalize(14) }}>
            개인 우편 목록 영역 (추가 예정)
          </Text>
        )}
      </View>
    </>
  );
}

// 단독 메시지 화면 (헤더+푸터 포함, 필요 시 사용)
const Message = ({ navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <MainHeader activeTab="message" />
      <MessageContent />
      <MainFooter
        activeTab="message"
        onTabPress={(tab) => {
          if (tab === 'board') navigation.navigate('Main');
          // school, mypage 화면 추가 시 navigate 연동
        }}
      />
    </SafeAreaView>
  );
};

export default Message;
