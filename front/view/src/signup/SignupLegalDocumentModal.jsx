import React, { useMemo } from 'react';
import { View, ScrollView, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../../frame/subHeader';
import { colors } from '../../../styles/colors';
import { createServiceStyles } from '../../../styles/service.style';
import PolicyMarkdownBody from '../../../src/screens/Terms-of-Service/PolicyMarkdownBody';
import PolicyDocumentMeta from '../../../src/screens/Terms-of-Service/PolicyDocumentMeta';
import PolicyDocumentSkeleton from '../../../src/screens/Terms-of-Service/PolicyDocumentSkeleton';
import { useLegalDocument } from '../../../utils/useLegalDocument';

const LEGAL_CONFIG = {
  terms_of_service: {
    fallback: require('../../../src/screens/Terms-of-Service/_terms_md.json'),
    defaultTitle: '서비스 이용약관',
  },
  privacy_policy: {
    fallback: require('../../../src/screens/Terms-of-Service/_privacy_md.json'),
    defaultTitle: '개인정보 처리방침',
  },
};

/**
 * @param {object} props
 * @param {'terms_of_service'|'privacy_policy'} props.slug
 * @param {(size: number) => number} props.normalize
 * @param {() => void} props.onClose
 */
export function SignupLegalDocumentContent({ slug, normalize, onClose }) {
  const config = LEGAL_CONFIG[slug] || LEGAL_CONFIG.terms_of_service;
  const styles = useMemo(() => createServiceStyles(normalize), [normalize]);
  const { markdown, meta, loading } = useLegalDocument(slug, config.fallback);

  const title = meta?.title || config.defaultTitle;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <SubHeader
        title={title}
        onBack={onClose}
        backIconSet="feather"
        backIconName="x"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <PolicyDocumentSkeleton styles={styles} normalize={normalize} />
        ) : (
          <>
            <PolicyDocumentMeta meta={meta} styles={styles} />
            <PolicyMarkdownBody markdown={markdown} styles={styles} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 약관·방침 전문. SignupConsentSheet는 screen swap으로 이 컴포넌트를 직접 렌더한다.
 * 독립 풀스크린 Modal이 필요할 때만 SignupLegalDocumentModal(overlay=false) 사용.
 */
const SignupLegalDocumentModal = ({
  visible,
  slug,
  normalize,
  onClose,
  overlay = false,
}) => {
  if (!visible) return null;

  if (overlay) {
    return (
      <View style={overlayStyles.root}>
        <SignupLegalDocumentContent
          slug={slug}
          normalize={normalize}
          onClose={onClose}
        />
      </View>
    );
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SignupLegalDocumentContent
        slug={slug}
        normalize={normalize}
        onClose={onClose}
      />
    </Modal>
  );
};

const overlayStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
    backgroundColor: colors.background,
  },
});

export default SignupLegalDocumentModal;
