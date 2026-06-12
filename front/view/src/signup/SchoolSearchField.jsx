import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../../styles/colors';
import { api } from '../../../utils/api';

/** 학교 검색·선택 (이름 + 지역/주소 표시) */
const SchoolSearchField = ({
  styles,
  normalize = (n) => n,
  selectedSchool,
  onSelect,
  label = '재학 중인 학교',
  disabled = false,
}) => {
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

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: normalize(12) }}
          color={colors.primary}
        />
      ) : null}

      {schools.length > 0 ? (
        <ScrollView
          style={{ maxHeight: normalize(180), marginTop: normalize(8) }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {schools.map((s) => {
            const active = selectedSchool?.id === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.ageGateCard,
                  { marginBottom: normalize(6) },
                  active && styles.ageGateCardSelected,
                ]}
                onPress={() => {
                  onSelect?.(s);
                  setQuery(s.name);
                  setSchools([]);
                }}
                activeOpacity={0.85}
                disabled={disabled}
              >
                <Text style={styles.ageGateCardTitle}>{s.name}</Text>
                {formatSubtitle(s) ? (
                  <Text
                    style={[
                      styles.ageGateCardDescription,
                      { color: colors.textLight20 },
                    ]}
                  >
                    {formatSubtitle(s)}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {selectedSchool ? (
        <Text
          style={{
            marginTop: normalize(10),
            fontFamily: 'Baloo2-Regular',
            fontSize: normalize(13),
            color: colors.primary,
          }}
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

export default SchoolSearchField;
