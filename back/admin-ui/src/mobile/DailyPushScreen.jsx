import { useEffect, useMemo, useState } from 'react';
import BottomSheet from './BottomSheet.jsx';

function snippet(text, max = 80) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function previewTitle(draft, phraseKind, topicLabel, boardType) {
  const board = boardType === 'school' ? 'school' : 'national';
  if (phraseKind === 'topic') {
    const pattern = draft.customPattern?.[board] || "전체 게시판에 올라온 '{label}' 게시글이에요";
    return pattern.replace('{label}', String(topicLabel || '').trim() || '게시글');
  }
  const phrase = (draft.phrases || []).find((item) => item.id === phraseKind);
  return phrase?.titles?.[board] || '오늘의 인기 게시글이에요';
}

export default function DailyPushScreen() {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [postId, setPostId] = useState('');
  const [phraseKind, setPhraseKind] = useState('popular');
  const [topicLabel, setTopicLabel] = useState('');
  const [selected, setSelected] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setError('');
    window.api?.('/daily-push/today')
      .then((res) => setDraft(res.data))
      .catch((err) => setError(err?.message || '불러오지 못했습니다.'));
  };

  useEffect(() => {
    load();
  }, []);

  const posts = useMemo(() => ([
    ...(draft?.posts?.national || []),
    ...(draft?.posts?.school || []),
  ]), [draft]);

  const activePost = selected || posts.find((post) => String(post.id) === String(postId)) || null;
  const boardType = activePost?.boardType || 'national';
  const title = draft ? previewTitle(draft, phraseKind, topicLabel, boardType) : '';
  const body = snippet(activePost?.content) || '게시글을 확인해 보세요';

  const openConfirm = (next) => {
    setPending(next);
    setSheetOpen(true);
  };

  const send = async () => {
    if (saving || !pending) return;
    setSaving(true);
    try {
      await window.api?.('/daily-push/send', { method: 'POST', body: JSON.stringify(pending) });
      setSheetOpen(false);
      setPending(null);
      load();
    } catch (err) {
      window.appAlert?.(err?.message || '보내지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="m-empty">
        <p>{error}</p>
        <button type="button" className="m-more-btn" onClick={load}>재시도</button>
      </div>
    );
  }
  if (!draft) return <p className="m-empty">불러오는 중…</p>;
  if (draft.sent) {
    return (
      <div className="m-reports">
        <p className="daily-push-status is-sent">{draft.statusLabel}</p>
        <article className="m-card">
          <strong>{draft.sent.title}</strong>
          <p>{draft.sent.body}</p>
          <p className="m-card-meta">
            {draft.sent.recipientCount}명
            {draft.sent.adminName ? ` · ${draft.sent.adminName}` : ''}
            {draft.sent.sentAt ? ` · ${draft.sent.sentAt}` : ''}
          </p>
        </article>
        <RecentHistory rows={draft.recent} />
      </div>
    );
  }

  return (
    <div className="m-reports">
      <p className={`daily-push-status is-${draft.status || 'pending'}`}>
        {draft.statusLabel}
        {draft.remainLabel ? ` · 마감까지 ${draft.remainLabel}` : ''}
      </p>
      <p className="m-card-meta">
        {draft.dayKey} · Discord {draft.discordHour}시 · {(draft.canSendRoles || []).join(', ')}만 보낼 수 있습니다.
      </p>
      <div className="daily-push-lock">
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
      <p className="m-card-meta">제목 {title.length}자 · 본문 {body.length}자. 길면 잠금화면에서 잘립니다.</p>
      <div className="m-chips">
        {(draft.phrases || []).map((item) => (
          <button
            key={item.id}
            type="button"
            className={phraseKind === item.id ? 'm-more-btn' : 'm-more-btn'}
            onClick={() => setPhraseKind(item.id)}
          >
            {phraseKind === item.id ? `선택 · ${item.label}` : item.label}
          </button>
        ))}
      </div>
      <label className="m-field">
        <span>직접 입력</span>
        <input
          value={topicLabel}
          maxLength={30}
          placeholder="다른 분류"
          onChange={(event) => {
            setTopicLabel(event.target.value);
            if (event.target.value.trim()) setPhraseKind('topic');
          }}
        />
      </label>
      <div className="m-cards">
        {posts.map((post) => {
          const school = post.boardType === 'school';
          const sentDay = draft.recentPostDays?.[String(post.id)];
          return (
            <article key={post.id} className="m-card">
              <div className="m-card-top">
                <span className={`daily-badge ${school ? 'is-school' : 'is-national'}`}>{school ? '학생' : '전체'}</span>
                <span>#{post.id}</span>
              </div>
              <p>{post.content}</p>
              <p className="m-card-meta">
                좋아요 {post.likeCount} 댓글 {post.commentCount}
                {post.tags?.[0] ? ` · #${post.tags[0]}` : ''}
                {Number(post.reportCount) > 0 ? ` · 신고 ${post.reportCount}` : ''}
                {sentDay ? ` · ${sentDay} 발송` : ''}
              </p>
              {school ? <p className="m-card-meta">인증이 안 된 사람은 인증 화면으로 이동합니다.</p> : null}
              <button
                type="button"
                className="m-more-btn"
                onClick={() => {
                  setSelected(post);
                  openConfirm({
                    kind: 'post',
                    postId: post.id,
                    phraseKind,
                    topicLabel,
                    confirmReported: Number(post.reportCount) > 0,
                  });
                }}
              >
                이 글 미리보기
              </button>
            </article>
          );
        })}
      </div>
      <label className="m-field">
        <span>글 번호</span>
        <input value={postId} inputMode="numeric" onChange={(event) => { setPostId(event.target.value); setSelected(null); }} />
      </label>
      <button
        type="button"
        className="m-sheet-submit"
        disabled={!postId}
        onClick={() => openConfirm({
          kind: 'post',
          postId: Number(postId),
          phraseKind,
          topicLabel,
          confirmReported: Number(activePost?.reportCount) > 0,
        })}
      >
        번호로 미리보기
      </button>
      {(draft.announcements || []).map((item) => (
        <button
          key={item.id}
          type="button"
          className="m-more-btn"
          onClick={() => openConfirm({ kind: 'announcement', announcementId: item.id })}
        >
          공지: {item.title}
        </button>
      ))}
      {draft.studyRoom?.offered ? (
        <button type="button" className="m-more-btn" onClick={() => openConfirm({ kind: 'study_room' })}>
          스터디룸이 활발해요 ({draft.studyRoom.memberCount}명)
        </button>
      ) : (
        <p className="m-card-meta">
          오늘 글 {draft.studyRoom?.todayPostCount ?? 0}개, 참여 {draft.studyRoom?.memberCount ?? 0}명입니다. 스터디룸 알림은 글 5개 미만이고 참여 8명 이상일 때만 열립니다.
        </p>
      )}
      <RecentHistory rows={draft.recent} />
      <BottomSheet
        open={sheetOpen}
        title="이 내용으로 보낼까요?"
        onClose={() => setSheetOpen(false)}
        footer={(
          <button type="button" className="m-sheet-submit" disabled={saving} onClick={send}>
            {saving ? '보내는 중…' : '보내기'}
          </button>
        )}
      >
        <div className="daily-push-lock">
          <strong>{pending?.kind === 'announcement' ? '공지사항' : pending?.kind === 'study_room' ? '스터디룸이 활발해요' : title}</strong>
          <p>
            {pending?.kind === 'announcement'
              ? (draft.announcements || []).find((item) => item.id === pending.announcementId)?.title
              : pending?.kind === 'study_room'
                ? '지금 타이머 스터디룸에 참여해 보세요'
                : body}
          </p>
        </div>
        <p className="m-card-meta">오늘은 다시 보낼 수 없습니다.</p>
        {Number(activePost?.reportCount) > 0 && pending?.kind === 'post'
          ? <p className="m-card-meta">처리 안 된 신고 {activePost.reportCount}건이 있습니다.</p>
          : null}
      </BottomSheet>
    </div>
  );
}

function RecentHistory({ rows }) {
  if (!rows?.length) return null;
  return (
    <div>
      <p className="m-section-title">최근 7일</p>
      {rows.map((row) => (
        <p key={row.dayKey} className="m-card-meta">
          {row.dayKey} · {row.title} · {row.recipientCount}명{row.adminName ? ` · ${row.adminName}` : ''}
        </p>
      ))}
    </div>
  );
}
