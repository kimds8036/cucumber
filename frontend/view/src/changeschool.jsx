import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';

const ChangeSchool = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const [query, setQuery] = useState('');

  // TODO: 실제 학교 검색 API 연동
  const mockSchools = ['오이고등학교', '서울고등학교', '부산고등학교', '대구고등학교'];
  const filtered = mockSchools.filter((name) => name.includes(query));

  const handleSelectSchool = (name) => {
    // TODO: 실제 학교 변경 처리 로직
    console.log('학교 변경:', name);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <SubHeader
            title="학교 변경"
            onBack={() => navigation.goBack()}
          />
          <View style={[styles.container, { paddingTop: normalize(8) }]}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={20} color="#999" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="학교 이름을 입력하세요"
                value={query}
                onChangeText={setQuery}
              />
            </View>

            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {filtered.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={styles.item}
                  onPress={() => handleSelectSchool(name)}
                >
                  <Text style={styles.itemText}>{name}</Text>
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  list: {
    flex: 1,
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemText: {
    fontSize: 15,
    color: '#333',
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});

export default ChangeSchool;

