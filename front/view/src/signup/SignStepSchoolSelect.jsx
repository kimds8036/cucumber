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

/** Step 3: 학교 검색·선택 (NEIS DB) */
const SignStepSchoolSelect = ({ styles, normalize, selectedSchool, onSelect }) => {
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
    } catch (e) {
      console.warn('[SignStepSchoolSelect] search failed', e?.message || e);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchSchools(query), 300);
    return () => clearTimeout(t);
  }, [query, searchSchools]);

  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.inputLabel, { marginBottom: normalize(8) }]}>
        재학 중인 학교를 검색해 주세요
      </Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="학교명 입력"
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: normalize(16) }}
          color={colors.primary}
        />
      ) : null}

      <ScrollView
        style={{ marginTop: normalize(12) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {schools.map((s) => {
          const active = selectedSchool?.id === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.ageGateCard,
                { marginBottom: normalize(8) },
                active && styles.ageGateCardSelected,
              ]}
              onPress={() => onSelect?.(s)}
              activeOpacity={0.85}
            >
              <Text style={styles.ageGateCardTitle}>{s.name}</Text>
              {s.region ? (
                <Text
                  style={[
                    styles.ageGateCardDescription,
                    { color: colors.textLight20 },
                  ]}
                >
                  {s.region}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedSchool ? (
        <Text
          style={{
            marginTop: normalize(12),
            fontFamily: 'Baloo2-Regular',
            fontSize: normalize(13),
            color: colors.primary,
          }}
        >
          선택: {selectedSchool.name}
        </Text>
      ) : null}
    </View>
  );
};

export default SignStepSchoolSelect;
