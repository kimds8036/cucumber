import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../../styles/colors';
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
}) => {
  const dropdownStyles = useMemo(
    () => makeDropdownStyles(normalize),
    [normalize],
  );
  const [query, setQuery] = useState(selectedSchool?.name || '');
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [focused, setFocused] = useState(false);

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
    const t = setTimeout(() => searchSchools(query), 250);
    return () => clearTimeout(t);
  }, [query, searchSchools]);

  useEffect(() => {
    if (selectedSchool?.name) setQuery(selectedSchool.name);
  }, [selectedSchool?.id, selectedSchool?.name]);

  const trimmedQuery = query.trim();
  const pendingSelection =
    !selectedSchool ||
    trimmedQuery !== String(selectedSchool.name || '').trim();

  const showDropdown =
    !disabled &&
    (focused || pendingSelection) &&
    trimmedQuery.length >= 1 &&
    (loading || searched);

  const selectedAddress = formatSchoolAddress(selectedSchool);

  const selectSchool = (school) => {
    onSelect?.(school);
    setQuery(school.name);
    setSchools([]);
    setSearched(false);
    setFocused(false);
  };

  return (
    <View style={dropdownStyles.wrap}>
      <Text style={[styles.inputLabel, { marginTop: normalize(16) }]}>
        {label}
      </Text>
      <View style={[styles.inputWrapper, { marginBottom: 0 }]}>
        <TextInput
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
          placeholder="학교 이름 검색"
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          editable={!disabled}
          returnKeyType="search"
        />
      </View>

      {showDropdown ? (
        <View style={dropdownStyles.dropdown}>
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
              style={dropdownStyles.dropdownScroll}
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

      {selectedSchool && !showDropdown ? (
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
    </View>
  );
};

const makeDropdownStyles = (normalize) =>
  StyleSheet.create({
    wrap: {
      zIndex: 20,
      elevation: 20,
    },
    dropdown: {
      marginTop: normalize(6),
      width: '98%',
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: colors.border || colors.textLight20,
      borderRadius: normalize(16),
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    dropdownScroll: {
      maxHeight: normalize(200),
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
      marginTop: normalize(8),
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
