import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createHeaderStyles, getNormalize } from '../../styles/frame.style';
import { colors } from '../../styles/colors';
import { useNotification } from '../../context/NotificationContext';
import CommuteHeaderIndicator from '../../components/CommuteHeaderIndicator';
import {
  getMainTabTitle,
  useMainShellOptional,
} from '../../context/MainShellContext';
import { navigate as navigateRoot } from '../../navigation/navigationRef';

const MainHeader = ({ headerTitle: headerTitleProp, navigation: navigationProp }) => {
  const shell = useMainShellOptional();
  const headerTitle =
    headerTitleProp ??
    shell?.headerTitle ??
    getMainTabTitle(shell?.activeTab ?? 'board');
  const navigation = navigationProp ?? shell?.navigation;
  const { width, height } = useWindowDimensions();
  const headerStyles = useMemo(
    () => createHeaderStyles(width, height),
    [width, height],
  );
  const normalize = useMemo(() => getNormalize(width), [width]);
  const { hasUnread } = useNotification();

  const openScreen = (name) => {
    const names = navigation?.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes(name) && navigation?.navigate) {
      navigation.navigate(name);
      return;
    }
    const parent = navigation?.getParent?.();
    const parentNames = parent?.getState?.()?.routeNames;
    if (
      Array.isArray(parentNames) &&
      parentNames.includes(name) &&
      parent?.navigate
    ) {
      parent.navigate(name);
      return;
    }
    navigateRoot(name);
  };

  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.tabContainer}>
        <Text style={headerStyles.tabText}>{headerTitle}</Text>
      </View>

      <View style={headerStyles.buttonContainer}>
        <CommuteHeaderIndicator />
        <TouchableOpacity
          style={headerStyles.iconButton}
          hitSlop={normalize(10)}
          onPress={() => openScreen('Search')}
        >
          <Ionicons name="search-outline" size={normalize(26)} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={headerStyles.iconButton}
          hitSlop={normalize(10)}
          onPress={() => openScreen('Notification')}
        >
          <Ionicons
            name="notifications-outline"
            size={normalize(26)}
            color={colors.text}
          />
          {hasUnread && <View style={headerStyles.badge} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MainHeader;
