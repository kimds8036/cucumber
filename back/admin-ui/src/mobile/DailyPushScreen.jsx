import { useEffect, useState } from 'react';

export default function DailyPushScreen() {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [postId, setPostId] = useState('');
  const [phraseKind, setPhraseKind] = useState('popular');
  const [topicLabel, setTopicLabel] = useState('');
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

  const send = async (body) => {
    if (saving) return;
    setSaving(true);
    try {
      await window.api?.('/daily-push/send', { method: 'POST', body: JSON.stringify(body) });
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
      <article className="m-card">
        <strong>{draft.sent.title}</strong>
        <p>{draft.sent.body}</p>
        <p className="m-card-meta">오늘 이미 보냈습니다 · {draft.sent.recipientCount}명</p>
      </article>
    );
  }

  const posts = [
    ...(draft.posts?.national || []),
    ...(draft.posts?.school || []),
  ];

  return (
    <div className="m-reports">
      <p className="m-card-meta">{draft.dayKey} · 디코 {draft.discordHour}시 전에 보내면 디코는 오지 않습니다.</p>
      <label className="m-field">
        <span>문장</span>
        <select value={phraseKind} onChange={(event) => setPhraseKind(event.target.value)}>
          <option value="popular">오늘의 인기 게시글이에요</option>
          <option value="topic">분류 게시글이에요</option>
        </select>
      </label>
      <label className="m-field">
        <span>분류</span>
        <input value={topicLabel} maxLength={30} placeholder="고민" onChange={(event) => setTopicLabel(event.target.value)} />
      </label>
      <div className="m-cards">
        {posts.map((post) => (
          <article key={post.id} className="m-card">
            <div className="m-card-top"><span>{post.boardType === 'school' ? '학생' : '전체'}</span><span>#{post.id}</span></div>
            <p>{post.content}</p>
            <button type="button" className="m-more-btn" disabled={saving} onClick={() => send({ kind: 'post', postId: post.id, phraseKind, topicLabel })}>이 글로 보내기</button>
          </article>
        ))}
      </div>
      <label className="m-field"><span>글 번호</span><input value={postId} inputMode="numeric" onChange={(event) => setPostId(event.target.value)} /></label>
      <button type="button" className="m-sheet-submit" disabled={saving || !postId} onClick={() => send({ kind: 'post', postId: Number(postId), phraseKind, topicLabel })}>번호로 보내기</button>
      {(draft.announcements || []).map((item) => (
        <button key={item.id} type="button" className="m-more-btn" disabled={saving} onClick={() => send({ kind: 'announcement', announcementId: item.id })}>공지: {item.title}</button>
      ))}
      {draft.studyRoom?.offered ? (
        <button type="button" className="m-more-btn" disabled={saving} onClick={() => send({ kind: 'study_room' })}>스터디룸이 활발해요 ({draft.studyRoom.memberCount}명)</button>
      ) : null}
    </div>
  );
}
