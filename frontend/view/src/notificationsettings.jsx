import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';

const NotificationSettings = ({ navigation }) => {
  const [settings, setSettings] = useState({
    pushEnabled: true,
    newPost: true,
    newComment: true,
    newLike: false,
    announcement: true,
  });

  const toggleSetting = (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const SettingItem = ({ title, subtitle, value, onToggle }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#ddd', true: '#8FD397' }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader
        title="알림 설정"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView}>
        <SettingItem
          title="푸시 알림"
          subtitle="모든 알림을 받습니다"
          value={settings.pushEnabled}
          onToggle={() => toggleSetting('pushEnabled')}
        />
        <SettingItem
          title="새 게시글 알림"
          value={settings.newPost}
          onToggle={() => toggleSetting('newPost')}
        />
        <SettingItem
          title="댓글 알림"
          value={settings.newComment}
          onToggle={() => toggleSetting('newComment')}
        />
        <SettingItem
          title="좋아요 알림"
          value={settings.newLike}
          onToggle={() => toggleSetting('newLike')}
        />
        <SettingItem
          title="공지사항 알림"
          value={settings.announcement}
          onToggle={() => toggleSetting('announcement')}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#999',
  },
});

export default NotificationSettings;