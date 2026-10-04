import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../../styles/colors';
import { api } from '../../../utils/api';

/** 게시글 상세 투표. 선택 결과는 서버에 저장된다. */
export default function BoardPollCard({ poll, postId, onChange, styles, normalize }) {
  const multi = Boolean(poll?.multi);
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [myVotes, setMyVotes] = useState(
    Array.isArray(poll?.myVotes) ? poll.myVotes.map(Number) : [],
  );
  const voted = myVotes.length > 0;
  const serverVoteKey = (poll?.myVotes || []).map(Number).join(',');

  useEffect(() => {
    setMyVotes(serverVoteKey ? serverVoteKey.split(',').map(Number) : []);
    setSelected([]);
  }, [postId, serverVoteKey]);

  const options = useMemo(() => {
    const base = Array.isArray(poll?.options) ? poll.options : [];
    const initialMine = Array.isArray(poll?.myVotes) ? poll.myVotes : [];
    return base.map((opt) => {
      const wasMine = initialMine.includes(opt.id);
      const isMine = myVotes.includes(opt.id);
      const votes =
        (Number(opt.votes) || 0) - (wasMine ? 1 : 0) + (isMine ? 1 : 0);
      return { ...opt, votes: Math.max(0, votes), isMine };
    });
  }, [poll, myVotes]);

  const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0);
  const participants = useMemo(() => {
    const initialMine = Array.isArray(poll?.myVotes) ? poll.myVotes : [];
    const base = Number(poll?.totalVotes) || 0;
    return base - (initialMine.length > 0 ? 1 : 0) + (voted ? 1 : 0);
  }, [poll, voted]);

  const toggleOption = (id) => {
    if (voted) return;
    setSelected((prev) => {
      if (multi) {
        return prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id];
      }
      return prev.includes(id) ? [] : [id];
    });
  };

  const handleVote = async () => {
    if (selected.length === 0 || submitting || postId == null) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/api/posts/${postId}/poll/vote`, {
        optionIds: selected,
      });
      const next = res.data?.data?.poll;
      if (next) {
        onChange?.(next);
        setMyVotes((next.myVotes || []).map(Number));
      } else {
        setMyVotes(selected);
      }
      setSelected([]);
    } catch (error) {
      Alert.alert(
        '오류',
        error.response?.data?.message || '투표 중 오류가 발생했습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevote = () => {
    setSelected(myVotes);
    setMyVotes([]);
  };

  if (options.length === 0) return null;

  return (
    <View style={styles.detailPollBox}>
      <View style={styles.detailPollHeader}>
        <MaterialCommunityIcons
          name="vote"
          size={normalize(16)}
          color={colors.textLight5}
        />
        <Text style={styles.detailPollTitle}>투표</Text>
        {multi ? (
          <Text style={styles.detailPollHint}>복수 선택 가능</Text>
        ) : null}
      </View>

      {options.map((opt) => {
        const percent =
          totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
        return (
          <TouchableOpacity
            key={opt.id}
            activeOpacity={voted ? 1 : 0.7}
            disabled={voted}
            onPress={() => toggleOption(opt.id)}
            style={styles.detailPollOption}
          >
            {voted ? (
              <View
                style={[
                  styles.detailPollFill,
                  opt.isMine && styles.detailPollFillMine,
                  { width: `${percent}%` },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.detailPollRadio,
                  multi && styles.detailPollCheckbox,
                ]}
              />
            )}
            <View style={styles.detailPollOptionTextWrap}>
              <Text
                style={[
                  styles.detailPollOptionText,
                  voted && opt.isMine && styles.detailPollOptionTextMine,
                ]}
                numberOfLines={2}
              >
                {opt.text}
              </Text>
            </View>
            {voted ? (
              <>
                {opt.isMine ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={normalize(16)}
                    color={colors.textLight5}
                  />
                ) : null}
                <Text style={styles.detailPollPercent}>{percent}%</Text>
              </>
            ) : null}
          </TouchableOpacity>
        );
      })}

      <View style={styles.detailPollFooter}>
        <Text style={styles.detailPollHint}>{participants}명 참여</Text>
        {voted ? (
          <TouchableOpacity onPress={handleRevote} hitSlop={8}>
            <Text style={styles.detailPollRevote}>다시 투표하기</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleVote}
            disabled={selected.length === 0 || submitting}
            activeOpacity={0.7}
            style={[
              styles.detailPollVoteButton,
              selected.length === 0 && styles.detailPollVoteButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.detailPollVoteButtonText,
                (selected.length === 0 || submitting) &&
                  styles.detailPollVoteButtonTextDisabled,
              ]}
            >
              투표하기
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
