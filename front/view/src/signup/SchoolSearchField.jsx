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
import { colors, fonts } from '../../../styles/colors';
import { api } from '../../../utils/api';

/** 학교 검색·선택 — 입력은 회원가입 공통 스타일, 드롭다운만 심플 */
const SchoolSearchField = ({
  styles,
  normalize = (n) => n,
  selectedSchool,
  onSelect,
  label = '재학 중인 학교',
  disabled = false,
}) => {
  const dropdownStyles = useMemo(() => makeDropdownStyles(normalize), [normalize]);
  const [query, setQuery] = useState(selectedSchool?.name || '');
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchSchools = useCallback(async (q) => {
    const term = String(q || '').trim();
    if (term.length < 2) {
      setSchools([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/api/schools/search', {
        params: { query: term, limit: 8 },
      });
      setSchools(res.data?.data?.schools || []);
    } catch {
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchSchools(query), 300);
    return () => clearTimeout(t);
  }, [query, searchSchools]);

  useEffect(() => {
    if (selectedSchool?.name) setQuery(selectedSchool.name);
  }, [selectedSchool?.id]);

  const formatSubtitle = (school) => {
    const parts = [school.region, school.address].filter(Boolean);
    return parts.join(' · ');
  };

  const trimmedQuery = query.trim();
  const pendingSelection =
    !selectedSchool || trimmedQuery !== String(selectedSchool.name || '').trim();
  const showDropdown =
    !disabled &&
    pendingSelection &&
    trimmedQuery.length >= 2 &&
    (loading || schools.length > 0);

  return (
    <View>
      <Text style={[styles.inputLabel, { marginTop: normalize(16) }]}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            if (selectedSchool && t !== selectedSchool.name) onSelect?.(null);
          }}
          placeholder="학교명 입력 (2자 이상)"
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          editable={!disabled}
        />
      </View>

      {loading && !showDropdown ? (
        <ActivityIndicator
          style={{ marginTop: normalize(12) }}
          color={colors.primary}
        />
      ) : null}

      {showDropdown ? (
        <View style={dropdownStyles.dropdown}>
          {loading && schools.length === 0 ? (
            <Text style={dropdownStyles.emptyText}>검색 중…</Text>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={dropdownStyles.dropdownScroll}
            >
              {schools.map((school, index) => {
                const subtitle = formatSubtitle(school);
                const isLast = index === schools.length - 1;
                return (
                  <TouchableOpacity
                    key={school.id}
                    style={[dropdownStyles.row, !isLast && dropdownStyles.rowBorder]}
                    onPress={() => {
                      onSelect?.(school);
                      setQuery(school.name);
                      setSchools([]);
                    }}
                    activeOpacity={0.6}
                    disabled={disabled}
                  >
                    <Text style={dropdownStyles.rowTitle} numberOfLines={1}>
                      {school.name}
                    </Text>
                    {subtitle ? (
                      <Text style={dropdownStyles.rowSubtitle} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : null}

      {selectedSchool ? (
        <Text
          style={[
            styles.fieldHelperText,
            styles.fieldHelperTextSuccess,
            { marginTop: normalize(6) },
          ]}
        >
          선택: {selectedSchool.name}
          {formatSubtitle(selectedSchool)
            ? ` (${formatSubtitle(selectedSchool)})`
            : ''}
        </Text>
      ) : null}
    </View>
  );
};

const makeDropdownStyles = (normalize) =>
  StyleSheet.create({
    dropdown: {
      marginTop: normalize(6),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: normalize(8),
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    dropdownScroll: {
      maxHeight: normalize(180),
    },
    emptyText: {
      paddingVertical: normalize(12),
      paddingHorizontal: normalize(12),
      fontFamily: fonts.regular,
      fontSize: normalize(13),
      color: colors.textSecondary,
      textAlign: 'center',
    },
    row: {
      paddingVertical: normalize(10),
      paddingHorizontal: normalize(12),
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowTitle: {
      fontFamily: fonts.regular,
      fontSize: normalize(14),
      color: colors.textPrimary,
    },
    rowSubtitle: {
      marginTop: normalize(2),
      fontFamily: fonts.regular,
      fontSize: normalize(12),
      color: colors.textSecondary,
    },
  });

export default SchoolSearchField;
