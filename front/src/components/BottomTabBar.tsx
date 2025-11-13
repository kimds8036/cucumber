import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../constants/colors';

interface TabItem {
  id: string;
  icon: React.ReactNode;
}

interface BottomTabBarProps {
  tabs: TabItem[];
  activeTab?: string;
  onTabPress?: (tabId: string) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tabButton}
          onPress={() => onTabPress?.(tab.id)}
        >
          {tab.icon}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.brand,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
});