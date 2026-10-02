import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Pressable,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from '@expo/vector-icons/Feather';
import { Ionicons } from '@expo/vector-icons';
import ProfileIcon from '../assets/Profile.svg';
import { getNormalize, createProfileCardStyles } from '../styles/mypage.style';
import * as ImagePicker from 'expo-image-picker';
import { api, getApiUserFacingMessage } from '../utils/api';
import { appAlert } from '../utils/appAlert';
import { patchMypageProfileCache } from '../utils/mypageProfileCache';
import ProfilePhotoCropModal from './mypage/ProfilePhotoCropModal';
import { PROFILE_COUNTS_CACHE_KEY } from '../utils/profileCountsCache';
import { getProfileHexByColorId } from '../utils/profileColor';
import { useGuidePreview } from '../context/GuidePreviewContext';
import EquippedBadge from './EquippedBadge';
import { getGuideMyPageStats } from '../src/screens/UserGuide/guidePreviewData';
import { colors } from '../styles/colors';
import { useFriend } from '../context/FriendContext';
import { useAuth } from '../context/AuthContext';
import { useMainShellOptional } from '../context/MainShellContext';
import StudentVerificationRejectedModal from './auth/StudentVerificationRejectedModal';
const PROFILE_COUNTS_CACHE_TTL_MS = 10 * 60 * 1000;
const ENROLLMENT_TOOLTIP_MS = 3000;

const ProfileCard = ({
  userInfo,
  navigation,
  timetableSection,
  onNavigateToTimetableChoice,
  onAvatarChange,
}) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createProfileCardStyles(normalize, width), [normalize, width]);
  const insets = useSafeAreaInsets();
  const { studentVerificationStatus, rejectReason, refreshStudentVerification } =
    useAuth();
  const shell = useMainShellOptional();
  const isStudentApproved = studentVerificationStatus === 'APPROVED';
  const isPending = studentVerificationStatus === 'PENDING';
  const isRejected = studentVerificationStatus === 'REJECTED';
  const [rejectionNoticeVisible, setRejectionNoticeVisible] = useState(false);
  const [cropDraft, setCropDraft] = useState(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const seededCounts =
    userInfo?.postCount != null && userInfo?.scrapCount != null;
  const [counts, setCounts] = useState({
    friendCount: Number(userInfo?.friendCount ?? 0),
    postCount: Number(userInfo?.postCount ?? 0),
    scrapCount: Number(userInfo?.scrapCount ?? 0),
  });
  const [countsLoading, setCountsLoading] = useState(!seededCounts);
  const [enrollmentTipVisible, setEnrollmentTipVisible] = useState(false);
  const { isGuidePreview } = useGuidePreview();
  const { hasUnreadFriendRequests } = useFriend();
  const profileEyeColor = getProfileHexByColorId(userInfo?.colorId);

  const gradeClassLabel =
    userInfo?.gradeClass ||
    (userInfo?.grade && userInfo?.classNumber
      ? `${userInfo.grade}학년 ${userInfo.classNumber}반`
      : '');

  const showEnrollmentTip = useCallback(() => {
    setEnrollmentTipVisible(true);
  }, []);

  useEffect(() => {
    if (!enrollmentTipVisible) return undefined;
    const timer = setTimeout(() => setEnrollmentTipVisible(false), ENROLLMENT_TOOLTIP_MS);
    return () => clearTimeout(timer);
  }, [enrollmentTipVisible]);

  const loadCounts = useCallback(
    async ({ force = false } = {}) => {
      if (isGuidePreview) {
        setCounts(getGuideMyPageStats());
        setCountsLoading(false);
        return;
      }
      const fallbackFriendCount = Number(userInfo?.friendCount ?? 0);
      try {
        const raw = await AsyncStorage.getItem(PROFILE_COUNTS_CACHE_KEY);
        let shouldFetch = true;

        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const cachedCounts = parsed?.counts;
            const ts = Number(parsed?.ts || 0);
            const isFresh = Date.now() - ts < PROFILE_COUNTS_CACHE_TTL_MS;
            if (cachedCounts) {
              setCounts((prev) => ({
                friendCount: Number.isFinite(fallbackFriendCount)
                  ? fallbackFriendCount
                  : Number(cachedCounts.friendCount ?? prev.friendCount ?? 0),
                postCount: Number(cachedCounts.postCount ?? 0),
                scrapCount: Number(cachedCounts.scrapCount ?? 0),
              }));
              setCountsLoading(false);
            }
            shouldFetch = force || !isFresh;
          } catch {
            shouldFetch = true;
          }
        }

        if (!shouldFetch) return;

        const res = await api.get('/api/users/me/stats');
        const nextCounts = {
          friendCount: Number.isFinite(fallbackFriendCount)
            ? fallbackFriendCount
            : Number(res.data?.data?.friendCount ?? 0),
          postCount: Number(res.data?.data?.postCount ?? 0),
          scrapCount: Number(res.data?.data?.scrapCount ?? 0),
        };
        setCounts(nextCounts);
        setCountsLoading(false);
        await AsyncStorage.setItem(
          PROFILE_COUNTS_CACHE_KEY,
          JSON.stringify({
            ts: Date.now(),
            counts: nextCounts,
          }),
        );
      } catch (e) {
        console.warn('[ProfileCard] 통계 로드 실패:', e?.message || e);
        setCountsLoading(false);
      }
    },
    [userInfo?.friendCount, isGuidePreview],
  );

  useEffect(() => {
    loadCounts();
    const unsub = navigation.addListener('focus', () => loadCounts());
    return unsub;
  }, [navigation, loadCounts]);

  useEffect(() => {
    if (
      userInfo?.postCount == null &&
      userInfo?.scrapCount == null &&
      userInfo?.friendCount == null
    ) {
      return;
    }
    setCounts((prev) => ({
      friendCount: Number(userInfo?.friendCount ?? prev.friendCount ?? 0),
      postCount:
        userInfo?.postCount != null
          ? Number(userInfo.postCount)
          : prev.postCount,
      scrapCount:
        userInfo?.scrapCount != null
          ? Number(userInfo.scrapCount)
          : prev.scrapCount,
    }));
    if (userInfo?.postCount != null && userInfo?.scrapCount != null) {
      setCountsLoading(false);
    }
  }, [userInfo?.friendCount, userInfo?.postCount, userInfo?.scrapCount]);

  const pickAvatar = useCallback(async () => {
    if (isGuidePreview || savingAvatar) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      appAlert.alert('권한 필요', '프로필 사진을 위해 앨범 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: false,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!asset.base64 || !asset.uri) {
      appAlert.alert('사진을 불러오지 못했어요', '다른 사진을 선택해 주세요.');
      return;
    }
    setCropDraft({
      uri: asset.uri,
      base64: asset.base64,
      width: asset.width || 1,
      height: asset.height || 1,
    });
  }, [isGuidePreview, savingAvatar]);

  const handleCropCancel = useCallback(() => {
    if (savingAvatar) return;
    setCropDraft(null);
  }, [savingAvatar]);

  const openAvatarPicker = useCallback(() => {
    if (isGuidePreview || savingAvatar) return;
    if (userInfo?.avatarUrl) {
      setAvatarMenuVisible(true);
      return;
    }
    pickAvatar();
  }, [isGuidePreview, savingAvatar, userInfo?.avatarUrl, pickAvatar]);

  const handleChangePhoto = useCallback(() => {
    setAvatarMenuVisible(false);
    setTimeout(() => {
      pickAvatar();
    }, 280);
  }, [pickAvatar]);

  const handleResetAvatar = useCallback(async () => {
    if (isGuidePreview || savingAvatar) return;
    setSavingAvatar(true);
    try {
      await api.delete('/api/auth/me/avatar');
      onAvatarChange?.(null);
      await patchMypageProfileCache({ avatarUrl: null });
      setAvatarMenuVisible(false);
    } catch (error) {
      appAlert.alert(
        '변경 실패',
        getApiUserFacingMessage(
          error,
          '기본 프로필로 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.',
        ),
      );
    } finally {
      setSavingAvatar(false);
    }
  }, [isGuidePreview, savingAvatar, onAvatarChange]);

  const handleCropConfirm = useCallback(
    async (cropRegion) => {
      if (!cropDraft?.base64 || savingAvatar) return;
      setSavingAvatar(true);
      try {
        const res = await api.patch('/api/auth/me/avatar', {
          imageBase64: cropDraft.base64,
          cropRegion,
        });
        const avatarUrl = res.data?.data?.avatarUrl || null;
        if (avatarUrl) {
          onAvatarChange?.(avatarUrl);
          await patchMypageProfileCache({ avatarUrl });
        }
        setCropDraft(null);
      } catch (error) {
        appAlert.alert(
          '저장 실패',
          getApiUserFacingMessage(
            error,
            '프로필 사진을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
          ),
        );
      } finally {
        setSavingAvatar(false);
      }
    },
    [cropDraft, savingAvatar, onAvatarChange],
  );

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatarWrap}>
          <Pressable
            onPress={openAvatarPicker}
            style={styles.profileCircle}
            accessibilityLabel={
              userInfo?.avatarUrl ? '프로필 사진 변경' : '프로필 사진 설정'
            }
          >
            {userInfo?.avatarUrl ? (
              <Image
                source={{ uri: userInfo.avatarUrl }}
                style={styles.profileAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <ProfileIcon
                width={normalize(70)}
                height={normalize(70)}
                color={profileEyeColor}
              />
            )}
          </Pressable>
          <Pressable
            onPress={openAvatarPicker}
            style={styles.profileAvatarCam}
            hitSlop={8}
            accessibilityLabel="프로필 사진 변경"
          >
            <Ionicons name="camera" size={normalize(12)} color={colors.white} />
          </Pressable>
        </View>

        <View
          style={[
            styles.profileInfo,
            !isStudentApproved ? styles.profileInfoUnverified : null,
          ]}
        >
          <View style={styles.profileNameRow}>
            <Text style={styles.profileName} numberOfLines={1} ellipsizeMode="tail">
              {userInfo.name}
            </Text>
            <EquippedBadge
              badge={userInfo.equippedBadge}
              size={normalize(18)}
              style={{ flexShrink: 0 }}
            />
            <Text
              style={styles.profileUsername}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {userInfo.username}
            </Text>
          </View>
          {userInfo.school ? (
            <Text style={styles.profileSchoolLine} numberOfLines={2}>
              {userInfo.school}
              {!isStudentApproved ? ' · 인증 전' : ''}
            </Text>
          ) : !isStudentApproved ? (
            <Text style={styles.profileSchoolLine} numberOfLines={1}>
              학교 미등록 · 인증 전
            </Text>
          ) : null}
          {isStudentApproved && gradeClassLabel ? (
            <View style={styles.profileEnrollmentBlock}>
              <View style={styles.profileEnrollmentRow}>
                <Text
                  style={styles.profileEnrollmentLine}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {gradeClassLabel}
                </Text>
              </View>
              {enrollmentTipVisible ? (
                <View style={styles.profileInfoTooltip}>
                  <Text style={styles.profileInfoTooltipText}>
                    계정 관리에서 학년·반을 변경할 수 있어요.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {!isStudentApproved ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (isPending) return;
                if (isRejected) {
                  void refreshStudentVerification().finally(() => {
                    setRejectionNoticeVisible(true);
                  });
                  return;
                }
                shell?.requestStudentVerification?.({
                  reason: 'mypage',
                  statusHint: studentVerificationStatus,
                });
              }}
              style={[
                styles.verifyCtaBtn,
                isRejected ? styles.verifyCtaBtnRejected : null,
              ]}
              disabled={isPending}
              hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
            >
              {isRejected ? (
                <Ionicons
                  name="warning"
                  size={normalize(14)}
                  color={colors.scrap || '#F5A623'}
                  style={styles.verifyCtaIcon}
                />
              ) : null}
              <Text
                style={[
                  styles.verifyCtaText,
                  isPending ? styles.verifyCtaTextPending : null,
                  isRejected ? styles.verifyCtaTextRejected : null,
                ]}
              >
                {isPending
                  ? '학생증 검수 중이에요'
                  : isRejected
                    ? '거절됨 · 사유 보기'
                    : '학생 인증하기'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.quickLinksRow}>
            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('Friends')}
              activeOpacity={0.7}
              disabled={countsLoading}
            >
              {countsLoading ? (
                <>
                  <View style={styles.quickLinkSkeletonMeta} />
                  <View style={styles.quickLinkSkeletonLabel} />
                </>
              ) : (
                <>
                  <View
                    style={[
                      styles.quickLinkInlineRow,
                      { alignSelf: 'flex-start' },
                    ]}
                  >
                    <Text style={styles.quickLinkLabelInline}>친구</Text>
                    <Text style={styles.quickLinkMetaInline}>
                      {counts.friendCount}
                    </Text>
                  </View>
                  {hasUnreadFriendRequests ? (
                    <View style={styles.quickLinkDot} />
                  ) : null}
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('MyPosts', { tab: 'written' })}
              activeOpacity={0.7}
              disabled={countsLoading}
            >
              {countsLoading ? (
                <>
                  <View style={styles.quickLinkSkeletonMeta} />
                  <View style={styles.quickLinkSkeletonLabel} />
                </>
              ) : (
                <>
                  <View
                    style={[
                      styles.quickLinkInlineRow,
                      { alignSelf: 'flex-start' },
                    ]}
                  >
                    <Text style={styles.quickLinkLabelInline}>게시글</Text>
                    <Text style={styles.quickLinkMetaInline}>
                      {counts.postCount}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() =>
                navigation.navigate('MyPosts', { tab: 'scrapped' })
              }
              activeOpacity={0.7}
              disabled={countsLoading}
            >
              {countsLoading ? (
                <>
                  <View style={styles.quickLinkSkeletonMeta} />
                  <View style={styles.quickLinkSkeletonLabel} />
                </>
              ) : (
                <>
                  <View
                    style={[
                      styles.quickLinkInlineRow,
                      { alignSelf: 'flex-start' },
                    ]}
                  >
                    <Text style={styles.quickLinkLabelInline}>스크랩</Text>
                    <Text style={styles.quickLinkMetaInline}>
                      {counts.scrapCount}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {timetableSection ? (
        timetableSection
      ) : (
        <View style={styles.timetableActionRow}>
          <TouchableOpacity
            style={styles.timetableActionCard}
            onPress={
              onNavigateToTimetableChoice ||
              (() =>
                navigation.navigate(
                  isStudentApproved ? 'TimetabelChoice' : 'EditTimetable',
                  isStudentApproved
                    ? undefined
                    : {
                        existingTimetable: {},
                        returnToMypage: true,
                      },
                ))
            }
            activeOpacity={0.7}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: normalize(4),
              }}
            >
              <Text style={styles.timetableActionMeta}>시간표 추가하기</Text>
              <Feather
                name="plus-circle"
                size={normalize(14)}
                color={styles.timetableActionMeta.color}
              />
            </View>
          </TouchableOpacity>
        </View>
      )}
      <StudentVerificationRejectedModal
        visible={rejectionNoticeVisible}
        rejectReason={rejectReason}
        canResubmit={isRejected}
        onClose={() => setRejectionNoticeVisible(false)}
        onPressResubmit={() => {
          if (!isRejected) return;
          setRejectionNoticeVisible(false);
          shell?.requestStudentVerification?.({
            reason: 'mypage_rejected',
            statusHint: 'REJECTED',
          });
        }}
      />
      <ProfilePhotoCropModal
        visible={Boolean(cropDraft)}
        uri={cropDraft?.uri}
        imageWidth={cropDraft?.width}
        imageHeight={cropDraft?.height}
        confirming={savingAvatar}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
      <Modal
        visible={avatarMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!savingAvatar) setAvatarMenuVisible(false);
        }}
      >
        <TouchableOpacity
          style={styles.avatarSheetOverlay}
          onPress={() => {
            if (!savingAvatar) setAvatarMenuVisible(false);
          }}
          activeOpacity={1}
        />
        <View
          style={[
            styles.avatarSheet,
            { paddingBottom: Math.max(normalize(40), insets.bottom) },
          ]}
        >
          <View style={styles.avatarSheetHandle} />
          <Text style={styles.avatarSheetTitle}>프로필 사진</Text>
          <TouchableOpacity
            style={[
              styles.avatarSheetAction,
              styles.avatarSheetActionPrimary,
              savingAvatar && styles.avatarSheetActionDisabled,
            ]}
            onPress={handleChangePhoto}
            disabled={savingAvatar}
            activeOpacity={0.85}
          >
            <Ionicons
              name="image-outline"
              size={normalize(18)}
              color={colors.text}
            />
            <Text style={styles.avatarSheetActionTextPrimary}>사진 변경</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.avatarSheetAction,
              styles.avatarSheetActionSecondary,
              savingAvatar && styles.avatarSheetActionDisabled,
            ]}
            onPress={handleResetAvatar}
            disabled={savingAvatar}
            activeOpacity={0.85}
          >
            <Ionicons
              name="trash-outline"
              size={normalize(18)}
              color={colors.text}
            />
            <Text style={styles.avatarSheetActionTextSecondary}>
              {savingAvatar ? '변경 중...' : '기본 프로필 변경'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default ProfileCard;
