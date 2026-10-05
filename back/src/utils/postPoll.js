const OPTION_MAX = 50;
const OPTION_MIN_COUNT = 2;
const OPTION_MAX_COUNT = 10;

export function parsePollInput(raw) {
  if (raw == null || raw === '') return null;
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { error: '투표 형식이 올바르지 않습니다.' };
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { error: '투표 형식이 올바르지 않습니다.' };
  }
  const multi = parsed.multi === true || parsed.multi === 'true';
  const options = (Array.isArray(parsed.options) ? parsed.options : [])
    .map((item) => String(item ?? '').trim().slice(0, OPTION_MAX))
    .filter(Boolean);
  if (options.length < OPTION_MIN_COUNT || options.length > OPTION_MAX_COUNT) {
    return { error: `투표 항목은 ${OPTION_MIN_COUNT}개에서 ${OPTION_MAX_COUNT}개까지입니다.` };
  }
  return { multi, options };
}

export async function loadPostPoll(db, postId, userId) {
  const [polls] = await db.execute(
    'SELECT allow_multiple FROM post_polls WHERE post_id = ? LIMIT 1',
    [postId],
  );
  if (polls.length === 0) return null;

  const [options] = await db.execute(
    `SELECT o.id, o.label,
            (SELECT COUNT(*) FROM post_poll_votes v WHERE v.option_id = o.id) AS votes
     FROM post_poll_options o
     WHERE o.post_id = ?
     ORDER BY o.display_order ASC, o.id ASC`,
    [postId],
  );
  const [participants] = await db.execute(
    `SELECT COUNT(DISTINCT v.user_id) AS c
     FROM post_poll_votes v
     INNER JOIN post_poll_options o ON o.id = v.option_id
     WHERE o.post_id = ?`,
    [postId],
  );

  let myVotes = [];
  if (userId) {
    const [mine] = await db.execute(
      `SELECT v.option_id
       FROM post_poll_votes v
       INNER JOIN post_poll_options o ON o.id = v.option_id
       WHERE o.post_id = ? AND v.user_id = ?`,
      [postId, userId],
    );
    myVotes = mine.map((row) => Number(row.option_id));
  }

  return {
    multi: Boolean(polls[0].allow_multiple),
    totalVotes: Number(participants[0]?.c ?? 0),
    myVotes,
    options: options.map((row) => ({
      id: Number(row.id),
      text: row.label,
      votes: Number(row.votes) || 0,
    })),
  };
}

export async function replacePostPollVotes(db, postId, userId, optionIds) {
  const poll = await loadPostPoll(db, postId, null);
  if (!poll) {
    return { error: '투표가 없는 게시글입니다.', status: 404 };
  }
  const allowed = new Set(poll.options.map((opt) => opt.id));
  const unique = [...new Set(optionIds.map((id) => Number(id)).filter((id) => allowed.has(id)))];
  if (unique.length === 0) {
    return { error: '투표 항목을 선택해주세요.', status: 400 };
  }
  if (!poll.multi && unique.length !== 1) {
    return { error: '하나만 선택할 수 있습니다.', status: 400 };
  }

  await db.execute(
    `DELETE v FROM post_poll_votes v
     INNER JOIN post_poll_options o ON o.id = v.option_id
     WHERE o.post_id = ? AND v.user_id = ?`,
    [postId, userId],
  );
  for (const optionId of unique) {
    await db.execute(
      'INSERT INTO post_poll_votes (option_id, user_id) VALUES (?, ?)',
      [optionId, userId],
    );
  }
  return { poll: await loadPostPoll(db, postId, userId) };
}
