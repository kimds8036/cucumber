import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../../styles/colors';

/** 게시글 상세 투표. 서버 연동 전이라 선택·투표는 이 컴포넌트 안에서만 반영된다. */
export default function BoardPollCard({ poll, styles, normalize }) {
  const multi = Boolean(poll?.multi);
  const [selected, setSelected] = useState([]);
  const [myVotes, setMyVotes] = useState(
    Array.isArray(poll?.myVotes) ? poll.myVotes : [],
  );
  const voted = myVotes.length > 0;

  const options = useMemo(() => {
    const base = Array.isArray(poll?.options) ? poll.options : [];
    const initialMine = Array.isArray(poll?.myVotes) ? poll.myVotes : [];
    return base.map((opt) => {
      const wasMine = initialMine.includes(opt.id);
      const isMine = myVotes.includes(opt.id);
      const votes = (Number(opt.votes) || 0) - (wasMine ? 1 : 0) + (isMine ? 1 : 0);
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

  const handleVote = () => {
    if (selected.length === 0) return;
    setMyVotes(selected);
    setSelected([]);
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
          color={colors.primary}
        />
        <Text style={styles.detailPollTitle}>투표</Text>
        {multi ? <Text style={styles.detailPollHint}>복수 선택 가능</Text> : null}
      </View>

      {options.map((opt) => {
        const isSelected = selected.includes(opt.id);
        const percent =
          totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
        return (
          <TouchableOpacity
            key={opt.id}
            activeOpacity={voted ? 1 : 0.7}
            disabled={voted}
            onPress={() => toggleOption(opt.id)}
            style={[
              styles.detailPollOption,
              !voted && isSelected && styles.detailPollOptionSelected,
            ]}
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
                  isSelected && styles.detailPollMarkOn,
                ]}
              >
                {isSelected ? (
                  <Ionicons name="checkmark" size={normalize(12)} color={colors.white} />
                ) : null}
              </View>
            )}
            <Text
              style={[
                styles.detailPollOptionText,
                voted && opt.isMine && styles.detailPollOptionTextMine,
              ]}
              numberOfLines={2}
            >
              {opt.text}
            </Text>
            {voted ? (
              <>
                {opt.isMine ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={normalize(16)}
                    color={colors.primary}
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
            disabled={selected.length === 0}
            activeOpacity={0.7}
            style={[
              styles.detailPollVoteButton,
              selected.length === 0 && styles.detailPollVoteButtonDisabled,
            ]}
          >
            <Text style={styles.detailPollVoteButtonText}>투표하기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}