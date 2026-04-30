import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TouchableOpacity, View } from 'react-native';
import SubHeader from '../../../view/frame/subHeader';
import styles from './timetable.style';

const CHOICE_ITEMS = [
  {
    key: 'auto',
    title: '시간표 자동 선택',
    description: '학교와 학년, 반 정보를 기반으로 시간표를 자동으로 구성합니다.',
  },
  {
    key: 'manual',
    title: '시간표 직접 선택',
    description: '수강하는 과목을 직접 선택해서 시간표를 구성합니다.',
  },
];

function TimetablePreview() {
  return (
    <View style={styles.choicePreviewWrap}>
      <View style={styles.choicePreviewHeaderRow}>
        <View style={styles.choicePreviewPeriodCell} />
        <View style={styles.choicePreviewDayCell} />
        <View style={styles.choicePreviewDayCell} />
        <View style={styles.choicePreviewDayCell} />
        <View style={styles.choicePreviewDayCell} />
        <View style={styles.choicePreviewDayCell} />
      </View>
      {[1, 2, 3].map((row) => (
        <View key={row} style={styles.choicePreviewBodyRow}>
          <View style={styles.choicePreviewPeriodCell} />
          <View style={styles.choicePreviewClassCell} />
          <View style={styles.choicePreviewClassCell} />
          <View style={styles.choicePreviewClassCell} />
          <View style={styles.choicePreviewClassCell} />
          <View style={styles.choicePreviewClassCell} />
        </View>
      ))}
    </View>
  );
}

export default function TimetabelChoice({ navigation }) {
  const handleSelect = (mode) => {
    navigation.navigate('AddTimetable', { selectionMode: mode });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="시간표 선택" onBack={() => navigation.goBack()} />
      <View style={styles.choiceContent}>
        {CHOICE_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.8}
            style={styles.choiceCard}
            onPress={() => handleSelect(item.key)}
          >
            <Text style={styles.choiceTitle}>{item.title}</Text>
            <Text style={styles.choiceDescription}>{item.description}</Text>
            <TimetablePreview />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}
