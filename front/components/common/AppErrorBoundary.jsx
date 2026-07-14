import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';
import { appAlert } from '../../utils/appAlert';

/**
 * 렌더 트리 예외 시 화이트 스크린 대신 복구 UI 표시
 */
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (__DEV__) {
      console.error('[AppErrorBoundary]', error, info?.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleNotify = () => {
    appAlert.alert(
      '일시적인 오류',
      '화면을 불러오는 중 문제가 발생했어요. 앱을 다시 시작하거나 잠시 후 다시 시도해 주세요.',
    );
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>화면을 불러오지 못했어요</Text>
        <Text style={styles.body}>
          일시적인 오류일 수 있어요. 다시 시도해 주세요.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={this.handleRetry}>
          <Text style={styles.primaryText}>다시 시도</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={this.handleNotify}>
          <Text style={styles.secondaryText}>안내 보기</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    minWidth: 160,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textWhite,
  },
  secondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
