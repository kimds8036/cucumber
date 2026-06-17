import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import LottieView from 'lottie-react-native';
import { createPersonalMailHubStyles } from '../../../styles/personalMailHub.style';

const MAILBOX_LINES = {
  intro: '안녕! 나는 개인 우편함이야. 무엇을 도와줄까?',
  received: (n) =>
    n > 0
      ? `받은 우편 ${n}통이 있어. 안 읽은 우편도 확인해 볼래?`
      : '아직 받은 우편이 없어. 우편을 써 볼까?',
  returned: (n) =>
    n > 0
      ? `반송된 우편이 ${n}통 있어. 다시 보낼 수 있어.`
      : '반송된 우편은 없어. 다행이네!',
  compose: '좋아! 새 우편을 쓰러 가자.',
  sent: (n) =>
    n > 0
      ? `보낸 우편 ${n}통이 있어. 목록을 열어줄게.`
      : '아직 보낸 우편이 없어.',
};

function Bubble({ styles, side, children, onPress, disabled }) {
  const isUser = side === 'user';
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowUser : styles.bubbleRowMailbox,
      ]}
    >
      <Wrapper
        style={[
          onPress ? styles.optionButton : styles.bubble,
          !onPress && (isUser ? styles.bubbleUser : styles.bubbleMailbox),
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={onPress ? 0.75 : 1}
      >
        <Text
          style={[
            styles.bubbleText,
            isUser && !onPress ? styles.bubbleTextUser : null,
            onPress ? styles.optionButtonText : null,
          ]}
        >
          {children}
        </Text>
      </Wrapper>
    </View>
  );
}

export default function PersonalMailMailboxHub({
  normalize,
  stats = {},
  onOpenReceived,
  onOpenReturned,
  onOpenSent,
  onCompose,
}) {
  const styles = useMemo(
    () => createPersonalMailHubStyles(normalize),
    [normalize],
  );
  const [lines, setLines] = useState([]);

  const {
    unreadCount = 0,
    receivedCount = 0,
    returnedCount = 0,
    sentCount = 0,
  } = stats;

  useEffect(() => {
    const intro = [MAILBOX_LINES.intro];
    if (unreadCount > 0) {
      intro.push(`읽지 않은 우편이 ${unreadCount}통 도착했어!`);
    }
    setLines(intro.map((text) => ({ side: 'mailbox', text })));
  }, [unreadCount]);

  const appendExchange = (userText, mailboxText, action) => {
    setLines((prev) => [
      ...prev,
      { side: 'user', text: userText },
      { side: 'mailbox', text: mailboxText },
    ]);
    setTimeout(() => action?.(), 450);
  };

  const options = [
    {
      key: 'received',
      label:
        unreadCount > 0
          ? `온 우편 확인 (${unreadCount}통 안 읽음)`
          : '온 우편 확인',
      onPress: () =>
        appendExchange(
          '온 우편 확인해줘',
          MAILBOX_LINES.received(receivedCount),
          onOpenReceived,
        ),
    },
    {
      key: 'returned',
      label:
        returnedCount > 0
          ? `반송된 우편 (${returnedCount}통)`
          : '반송된 우편',
      onPress: () =>
        appendExchange(
          '반송된 우편 있어?',
          MAILBOX_LINES.returned(returnedCount),
          onOpenReturned,
        ),
    },
    {
      key: 'compose',
      label: '우편 쓰기',
      onPress: () =>
        appendExchange('우편 쓰고 싶어', MAILBOX_LINES.compose, onCompose),
    },
    {
      key: 'sent',
      label: '보낸 우편 보기',
      onPress: () =>
        appendExchange(
          '보낸 우편 보여줘',
          MAILBOX_LINES.sent(sentCount),
          onOpenSent,
        ),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.lottieWrap}>
        <LottieView
          source={require('../../../assets/lottie/mailbox.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>

      <ScrollView
        style={styles.dialogueScroll}
        contentContainerStyle={styles.dialogueContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {lines.map((line, index) => (
          <Bubble key={`${line.side}-${index}`} styles={styles} side={line.side}>
            {line.text}
          </Bubble>
        ))}

        {lines.length > 0
          ? options.map((opt) => (
              <Bubble
                key={opt.key}
                styles={styles}
                side="user"
                onPress={opt.onPress}
              >
                {opt.label}
              </Bubble>
            ))
          : null}
      </ScrollView>
    </View>
  );
}
