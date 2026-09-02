import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Keyboard,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import { api } from '../../../utils/api';

function formatSchoolAddress(school) {
  if (!school) return '';
  const address = String(
    school.address || school.road_address || school.addressDetail || '',
  ).trim();
  const region = String(school.region || '').trim();
  if (address && region && !address.startsWith(region)) {
    return `${region} · ${address}`;
  }
  return address || region;
}

/** 학교 검색·선택 — 입력 아래 목록 + 주소로 동명이교 구분 (목록 선택만) */
const SchoolSearchField = ({
  styles,
  normalize = (n) => n,
  selectedSchool,
  onSelect,
  label = '재학 중인 학교',
  disabled = false,
  helperBelowLabel = null,
  labelMarginTop,
  hideLabel = false,
  autoFocus = false,
  /** @type {'boxed'|'underline'} */
  inputVariant = 'boxed',
  placeholder = '학교 이름 검색',
  /** true면 검색 목록이 남은 세로 공간을 채움 (학교 선택 전용 화면) */
  expandList = false,
  /** true면 검색 결과가 1건 이상일 때만 목록 영역 표시 */
  showListOnlyWithResults = false,
  rowMarginHorizontal,
  /** 트리거 모드 — 탭 시 onActivate, 입력·목록 비활성 */
  readOnly = false,
  onActivate,
  /** 선택 확정 시 행 우측 취소 버튼 */
  showClearButton = false,
  onClear,
}) => {
  const dropdownStyles = useMemo(
    () => makeDropdownStyles(normalize, expandList),
    [normalize, expandList],
  );
  const searchRowStyles = useMemo(
    () =>
      createSchoolSearchRowStyles(normalize, {
        marginHorizontal:
          rowMarginHorizontal != null
            ? rowMarginHorizontal
            : normalize(20),
      }),
    [normalize, rowMarginHorizontal],
  );
  const [query, setQuery] = useState(selectedSchool?.name || '');
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!autoFocus) return undefined;
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  const searchSchools = useCallback(async (q) => {
    const term = String(q || '').trim();
    if (term.length < 1) {
      setSchools([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/api/schools/search', {
        params: { query: term, limit: 15 },
      });
      setSchools(res.data?.data?.schools || []);
      setSearched(true);
    } catch {
      setSchools([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (readOnly) return undefined;
    const t = setTimeout(() => searchSchools(query), 250);
    return () => clearTimeout(t);
  }, [query, readOnly, searchSchools]);

  useEffect(() => {
    if (selectedSchool?.name) setQuery(selectedSchool.name);
  }, [selectedSchool?.id, selectedSchool?.name]);

  const trimmedQuery = query.trim();
  const pendingSelection =
    !selectedSchool ||
    trimmedQuery !== String(selectedSchool.name || '').trim();

  const showDropdown =
    !readOnly &&
    !disabled &&
    (focused || pendingSelection) &&
    trimmedQuery.length >= 1 &&
    (showListOnlyWithResults
      ? schools.length > 0
      : loading || searched);

  const selectedAddress = formatSchoolAddress(selectedSchool);

  const selectSchool = (school) => {
    onSelect?.(school);
    setQuery(school.name);
    setSchools([]);
    setSearched(false);
    setFocused(false);
  };

  const isUnderline = inputVariant === 'underline';
  const ListSlot = expandList ? Pressable : View;
  const hasConfirmedSelection =
    Boolean(selectedSchool) &&
    trimmedQuery === String(selectedSchool?.name || '').trim();

  const handleClear = () => {
    onSelect?.(null);
    setQuery('');
    setSchools([]);
    setSearched(false);
    setFocused(false);
    onClear?.();
  };

  const renderUnderlineRow = () => {
    const RowMain = readOnly ? TouchableOpacity : View;
    const rowMainProps = readOnly
      ? { onPress: onActivate, activeOpacity: 0.75 }
      : {};

    return (
      <View
        style={[
          searchRowStyles.row,
          hasConfirmedSelection && showClearButton && searchRowStyles.rowSelected,
        ]}
      >
        <RowMain style={searchRowStyles.rowMainTap} {...rowMainProps}>
          {!hasConfirmedSelection ? (
            <Feather
              name="search"
              size={normalize(18)}
              color={colors.textSecondary}
            />
          ) : null}
          <TextInput
            ref={inputRef}
            style={[
              searchRowStyles.input,
              readOnly &&
                !hasConfirmedSelection &&
                searchRowStyles.inputPlaceholder,
              { marginBottom: 0 },
            ]}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              if (selectedSchool && t !== selectedSchool.name) onSelect?.(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setTimeout(() => setFocused(false), 180);
            }}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            editable={!readOnly && !disabled}
            showSoftInputOnFocus={!readOnly}
            pointerEvents={readOnly ? 'none' : 'auto'}
            returnKeyType="search"
          />
        </RowMain>
        {showClearButton && hasConfirmedSelection ? (
          <TouchableOpacity
            onPress={handleClear}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name="cancel"
              size={normalize(20)}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[dropdownStyles.wrap, expandList && dropdownStyles.wrapExpand]}>
      {!hideLabel ? (
        <Text
          style={[
            styles.inputLabel,
            {
              marginTop:
                labelMarginTop != null ? normalize(labelMarginTop) : normalize(16),
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
      {helperBelowLabel}
      {isUnderline ? (
        renderUnderlineRow()
      ) : (
        <View style={[styles.inputWrapper, { marginBottom: 0 }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { marginBottom: 0 }]}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              if (selectedSchool && t !== selectedSchool.name) onSelect?.(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setTimeout(() => setFocused(false), 180);
            }}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            editable={!disabled}
            returnKeyType="search"
          />
        </View>
      )}

      <ListSlot
        style={expandList ? dropdownStyles.listSlot : null}
        {...(expandList ? { onPress: Keyboard.dismiss } : {})}
      >
        {showDropdown ? (
          <View
            style={[
              dropdownStyles.dropdown,
              expandList && dropdownStyles.dropdownExpand,
            ]}
          >
            {loading && schools.length === 0 ? (
              <View style={dropdownStyles.emptyWrap}>
                <ActivityIndicator color={colors.primary} />
                <Text style={dropdownStyles.emptyText}>검색 중…</Text>
              </View>
            ) : schools.length === 0 ? (
              <Text style={dropdownStyles.emptyText}>
                검색 결과가 없습니다. 학교 이름을 다시 확인해 주세요.
              </Text>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled
                style={
                  expandList
                    ? dropdownStyles.dropdownScrollExpand
                    : dropdownStyles.dropdownScroll
                }
              >
                {schools.map((school, index) => {
                  const addressLine = formatSchoolAddress(school);
                  const isLast = index === schools.length - 1;
                  const isActive = selectedSchool?.id === school.id;
                  return (
                    <TouchableOpacity
                      key={school.id}
                      style={[
                        dropdownStyles.row,
                        !isLast && dropdownStyles.rowBorder,
                        isActive && dropdownStyles.rowActive,
                      ]}
                      onPress={() => selectSchool(school)}
                      activeOpacity={0.65}
                      disabled={disabled}
                    >
                      <Text style={dropdownStyles.rowTitle} numberOfLines={1}>
                        {school.name}
                      </Text>
                      <Text style={dropdownStyles.rowSubtitle} numberOfLines={2}>
                        {addressLine || '주소 정보 없음'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : null}

        {selectedSchool && !showDropdown && !(isUnderline && showClearButton) ? (
          <View style={dropdownStyles.selectedBox}>
            <View style={dropdownStyles.selectedTextCol}>
              <Text style={dropdownStyles.selectedName} numberOfLines={1}>
                {selectedSchool.name}
              </Text>
              {selectedAddress ? (
                <Text style={dropdownStyles.selectedAddress} numberOfLines={2}>
                  {selectedAddress}
                </Text>
              ) : null}
            </View>
            <Ionicons
              name="checkmark-circle"
              size={normalize(22)}
              color={colors.primary}
            />
          </View>
        ) : null}
      </ListSlot>
    </View>
  );
};

/** 재학 학교 검색 트리거·밑줄 입력 공통 스타일 */
export function createSchoolSearchRowStyles(
  normalize,
  { marginHorizontal = null } = {},
) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: marginHorizontal ?? normalize(20),
      paddingBottom: normalize(8),
      borderBottomWidth: normalize(1),
      borderBottomColor: colors.textLight20,
      gap: normalize(8),
    },
    input: {
      flex: 1,
      paddingVertical: 0,
      paddingHorizontal: 0,
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xxl),
      minHeight: normalize(Math.round(fontSizes.xxl)),
      color: colors.textPrimary,
      ...Platform.select({
        android: { includeFontPadding: false, textAlignVertical: 'center' },
        ios: {},
      }),
    },
    inputPlaceholder: {
      color: colors.textSecondary,
    },
    fieldText: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xxl),
      color: colors.textSecondary,
    },
    fieldTextFilled: {
      color: colors.textPrimary,
    },
    rowSelected: {
      borderBottomColor: colors.textPrimary,
    },
    rowMainTap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
      minWidth: 0,
    },
  });
}

const makeDropdownStyles = (normalize, expandList = false) =>
  StyleSheet.create({
    wrap: {
      zIndex: 20,
      elevation: 20,
    },
    wrapExpand: {
      flex: 1,
      minHeight: 0,
    },
    listSlot: {
      flex: 1,
      minHeight: 0,
      marginTop: normalize(6),
    },
    dropdown: {
      marginTop: expandList ? 0 : normalize(6),
      width: '100%',
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: colors.border || colors.textLight20,
      borderRadius: normalize(16),
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    dropdownExpand: {
      flex: 1,
      minHeight: 0,
      width: '100%',
    },
    dropdownScroll: {
      maxHeight: normalize(200),
    },
    dropdownScrollExpand: {
      flex: 1,
    },
    emptyWrap: {
      paddingVertical: normalize(14),
      alignItems: 'center',
      gap: normalize(8),
    },
    emptyText: {
      paddingVertical: normalize(14),
      paddingHorizontal: normalize(14),
      fontFamily: fonts.regular,
      fontSize: normalize(13),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(18),
    },
    row: {
      paddingVertical: normalize(11),
      paddingHorizontal: normalize(14),
    },
    rowActive: {
      backgroundColor: colors.primaryLight20,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border || colors.textLight20,
    },
    rowTitle: {
      fontFamily: fonts.bold,
      fontSize: normalize(15),
      color: colors.textPrimary,
    },
    rowSubtitle: {
      marginTop: normalize(3),
      fontFamily: fonts.regular,
      fontSize: normalize(11),
      lineHeight: normalize(15),
      color: colors.textSecondary,
    },
    selectedBox: {
      marginTop: expandList ? 0 : normalize(8),
      marginHorizontal: normalize(8),
      paddingVertical: normalize(10),
      paddingHorizontal: normalize(12),
      borderRadius: normalize(12),
      backgroundColor: colors.primaryLight20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(10),
    },
    selectedTextCol: {
      flex: 1,
      minWidth: 0,
    },
    selectedName: {
      fontFamily: fonts.bold,
      fontSize: normalize(14),
      color: colors.primaryDark || colors.primary,
    },
    selectedAddress: {
      marginTop: normalize(3),
      fontFamily: fonts.regular,
      fontSize: normalize(11),
      lineHeight: normalize(15),
      color: colors.textSecondary,
    },
  });

export default SchoolSearchField;
