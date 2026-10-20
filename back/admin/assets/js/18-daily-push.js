function dailyPushSnippet(text, max = 80) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function dailyPushBoard(boardType) {
  return boardType === 'school' ? 'school' : 'national';
}

function dailyPushTitle(data, phraseKind, topicLabel, boardType) {
  const board = dailyPushBoard(boardType);
  if (phraseKind === 'topic') {
    const pattern = data.customPattern?.[board] || "전체 게시판에 올라온 '{label}' 게시글이에요";
    const label = String(topicLabel || '').trim() || '게시글';
    return pattern.replace('{label}', label);
  }
  const phrase = (data.phrases || []).find((item) => item.id === phraseKind);
  return phrase?.titles?.[board] || '오늘의 인기 게시글이에요';
}

function dailyPushSelectedPost(data) {
  const selected = document.querySelector('input[name="daily-push-post"]:checked');
  const typedId = document.getElementById('daily-push-post-id')?.value?.trim();
  const posts = window.__dailyPushPosts || [];
  if (typedId) return posts.find((post) => String(post.id) === typedId) || { id: Number(typedId), boardType: 'national', content: '' };
  if (!selected) return null;
  return posts.find((post) => String(post.id) === selected.value) || null;
}

function refreshDailyPushPreview() {
  const data = window.__dailyPushDraft;
  const titleEl = document.getElementById('daily-push-preview-title');
  const bodyEl = document.getElementById('daily-push-preview-body');
  const countEl = document.getElementById('daily-push-preview-count');
  const noteEl = document.getElementById('daily-push-preview-note');
  if (!data || !titleEl || !bodyEl) return;
  const mode = document.querySelector('input[name="daily-push-mode"]:checked')?.value || 'post';
  const phraseKind = document.getElementById('daily-push-phrase')?.value || 'popular';
  const topicLabel = document.getElementById('daily-push-topic')?.value?.trim() || '';
  let title = '오늘의 인기 게시글이에요';
  let body = '게시글을 확인해 보세요';
  let note = '';
  if (mode === 'announcement') {
    const select = document.getElementById('daily-push-announcement');
    const label = select?.selectedOptions?.[0]?.textContent || '';
    title = '공지사항';
    body = dailyPushSnippet(label && label !== '선택' ? label : '') || '새 공지가 올라왔어요';
  } else if (mode === 'study_room') {
    title = '스터디룸이 활발해요';
    body = '지금 타이머 스터디룸에 참여해 보세요';
  } else {
    const post = dailyPushSelectedPost(data);
    const board = post?.boardType || 'national';
    title = dailyPushTitle(data, phraseKind, topicLabel, board);
    body = dailyPushSnippet(post?.content) || '게시글을 확인해 보세요';
    if (board === 'school') note = '학생 글입니다. 인증이 안 된 사람은 인증 화면으로 이동합니다.';
    if (Number(post?.reportCount) > 0) note = `${note} 처리 안 된 신고 ${post.reportCount}건.`.trim();
  }
  titleEl.textContent = title;
  bodyEl.textContent = body;
  if (countEl) countEl.textContent = `제목 ${title.length}자 · 본문 ${body.length}자. 길면 잠금화면에서 잘립니다.`;
  if (noteEl) noteEl.textContent = note;
}

async function loadDailyPushPanel() {
  const host = document.getElementById('daily-push-host');
  if (!host) return;
  host.innerHTML = '<p class="txt-muted">불러오는 중…</p>';
  try {
    const { data } = await api('/daily-push/today');
    renderDailyPushPanel(data);
  } catch (error) {
    host.innerHTML = `<p class="txt-danger">${esc(error.message || '불러오지 못했습니다.')}</p>`;
  }
}

function renderDailyPushPanel(data) {
  const host = document.getElementById('daily-push-host');
  if (!host) return;
  window.__dailyPushDraft = data;
  const remain = data.remainLabel ? `마감까지 ${esc(data.remainLabel)}` : '';
  const status = `<p class="daily-push-status is-${esc(data.status || 'pending')}"><strong>${esc(data.statusLabel || '대기 중')}</strong>${remain ? ` · ${remain}` : ''}</p>`;
  const history = (data.recent || []).map((row) => `
    <li>${esc(row.dayKey)} · ${esc(row.title || row.kind || '')} · ${Number(row.recipientCount || 0)}명${row.adminName ? ` · ${esc(row.adminName)}` : ''}</li>`).join('');
  const historyBlock = history
    ? `<div class="detail-panel open" style="margin-top:16px"><div class="section-title">최근 7일</div><ul class="daily-push-history">${history}</ul></div>`
    : '';

  if (data.sent) {
    host.innerHTML = `
      ${status}
      <div class="detail-panel open">
        <div class="section-title">오늘 알림을 이미 보냈습니다</div>
        <div class="daily-push-lock">
          <strong>${esc(data.sent.title)}</strong>
          <p>${esc(data.sent.body)}</p>
        </div>
        <p class="txt-muted">도달 ${Number(data.sent.recipientCount || 0)}명 · ${esc(String(data.sent.sentAt || ''))}${data.sent.adminName ? ` · ${esc(data.sent.adminName)}` : ''}</p>
      </div>
      ${historyBlock}`;
    return;
  }

  const posts = [
    ...(data.posts?.national || []).map((post) => ({ ...post, boardType: post.boardType || 'national' })),
    ...(data.posts?.school || []).map((post) => ({ ...post, boardType: post.boardType || 'school' })),
  ];
  window.__dailyPushPosts = posts;
  const postOptions = posts.map((post) => {
    const school = post.boardType === 'school';
    const sentDay = data.recentPostDays?.[String(post.id)];
    const when = post.createdAt ? String(post.createdAt).replace('T', ' ').slice(0, 16) : '';
    return `
    <label class="flag-row">
      <input type="radio" name="daily-push-post" value="${post.id}" data-board="${esc(post.boardType)}" data-tag="${esc(post.tags?.[0] || '')}" />
      <span>
        <em class="daily-badge ${school ? 'is-school' : 'is-national'}">${school ? '학생' : '전체'}</em>
        ${esc(dailyPushSnippet(post.content, 80))}
        · 좋아요 ${post.likeCount} 댓글 ${post.commentCount}
        ${when ? ` · ${esc(when)}` : ''}
        ${post.tags?.[0] ? ` · #${esc(post.tags[0])}` : ''}
        ${Number(post.reportCount) > 0 ? ` · 신고 ${post.reportCount}` : ''}
        ${sentDay ? ` · ${esc(sentDay)} 발송` : ''}
        ${school ? '<br><span class="txt-muted">인증이 안 된 사람은 인증 화면으로 이동합니다.</span>' : ''}
      </span>
    </label>`;
  }).join('');
  const notices = (data.announcements || []).map((item) => `
    <option value="${item.id}">${esc(item.title)}</option>`).join('');
  const phrases = (data.phrases || []).map((item) => `
    <label class="flag-row"><input type="radio" name="daily-push-phrase" value="${esc(item.id)}" ${item.id === 'popular' ? 'checked' : ''} /> ${esc(item.label)}</label>`).join('');
  const study = data.studyRoom?.offered
    ? `<label class="flag-row"><input type="radio" name="daily-push-mode" value="study_room" /> 스터디룸이 활발해요 (${data.studyRoom.memberCount}명)</label>`
    : `<p class="txt-muted">오늘 글 ${data.studyRoom?.todayPostCount ?? 0}개, 참여 ${data.studyRoom?.memberCount ?? 0}명입니다. 스터디룸 알림은 글 5개 미만이고 참여 8명 이상일 때만 열립니다.</p>`;

  host.innerHTML = `
    ${status}
    <p class="section-hint">${esc(data.dayKey)} · Discord ${data.discordHour}시. 보낼 수 있는 역할: ${(data.canSendRoles || []).map(esc).join(', ')}. 그 전에 보내면 Discord는 오지 않습니다.</p>
    <div class="detail-panel open">
      <label class="flag-row"><input type="radio" name="daily-push-mode" value="post" checked /> 게시글</label>
      <label class="flag-row"><input type="radio" name="daily-push-mode" value="announcement" /> 공지</label>
      ${study}
      <div id="daily-push-posts" style="margin-top:12px">${postOptions || '<p class="txt-muted">최근 인기글이 없습니다. 글 번호를 직접 넣을 수 있습니다.</p>'}</div>
      <label style="display:block;margin-top:8px">글 번호 직접 입력
        <input id="daily-push-post-id" class="note-input" inputmode="numeric" />
      </label>
      <div style="margin-top:8px">분류</div>
      <div id="daily-push-phrases">${phrases}</div>
      <label style="display:block;margin-top:8px">직접 입력 (보조)
        <input id="daily-push-topic" class="note-input" maxlength="30" placeholder="다른 분류 이름" />
      </label>
      <label style="display:block;margin-top:8px">공지
        <select id="daily-push-announcement" class="note-input">
          <option value="">선택</option>
          ${notices}
        </select>
      </label>
      <div class="daily-push-lock" style="margin-top:14px">
        <strong id="daily-push-preview-title"></strong>
        <p id="daily-push-preview-body"></p>
      </div>
      <p id="daily-push-preview-count" class="txt-muted"></p>
      <p id="daily-push-preview-note" class="txt-muted"></p>
      <div style="margin-top:12px">
        <button type="button" class="btn btn-primary" onclick="submitDailyPush()">이 내용으로 보내기</button>
      </div>
    </div>
    ${historyBlock}`;

  const hiddenPhrase = document.createElement('input');
  hiddenPhrase.type = 'hidden';
  hiddenPhrase.id = 'daily-push-phrase';
  hiddenPhrase.value = 'popular';
  host.querySelector('.detail-panel')?.appendChild(hiddenPhrase);

  const syncPhrase = (value, topic) => {
    hiddenPhrase.value = value;
    const topicInput = document.getElementById('daily-push-topic');
    if (topicInput && topic && !topicInput.value) topicInput.value = topic;
    refreshDailyPushPreview();
  };
  host.querySelectorAll('input[name="daily-push-phrase"]').forEach((input) => {
    input.addEventListener('change', () => syncPhrase(input.value, ''));
  });
  host.querySelectorAll('input[name="daily-push-post"]').forEach((input) => {
    input.addEventListener('change', () => {
      const tag = input.getAttribute('data-tag') || '';
      if (tag && !['고민', '질문', '꿀팁', '후기'].includes(tag)) syncPhrase('topic', tag);
      else refreshDailyPushPreview();
    });
  });
  ['daily-push-post-id', 'daily-push-topic', 'daily-push-announcement'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', refreshDailyPushPreview);
    document.getElementById(id)?.addEventListener('change', refreshDailyPushPreview);
  });
  host.querySelectorAll('input[name="daily-push-mode"]').forEach((input) => {
    input.addEventListener('change', refreshDailyPushPreview);
  });
  document.getElementById('daily-push-topic')?.addEventListener('input', () => {
    if (document.getElementById('daily-push-topic')?.value.trim()) hiddenPhrase.value = 'topic';
    refreshDailyPushPreview();
  });
  refreshDailyPushPreview();
}

async function submitDailyPush() {
  const data = window.__dailyPushDraft || {};
  const mode = document.querySelector('input[name="daily-push-mode"]:checked')?.value || 'post';
  const selected = document.querySelector('input[name="daily-push-post"]:checked');
  const typedId = document.getElementById('daily-push-post-id')?.value?.trim();
  const phraseKind = document.getElementById('daily-push-phrase')?.value || 'popular';
  const topicLabel = document.getElementById('daily-push-topic')?.value?.trim() || '';
  const announcementId = document.getElementById('daily-push-announcement')?.value || '';
  const post = dailyPushSelectedPost(data);
  const title = document.getElementById('daily-push-preview-title')?.textContent || '';
  const bodyText = document.getElementById('daily-push-preview-body')?.textContent || '';
  const body = { kind: mode, phraseKind, topicLabel };
  if (mode === 'post') {
    body.postId = Number(typedId || selected?.value || 0);
    if (!body.postId) {
      alert('게시글을 골라 주세요.');
      return;
    }
    if (phraseKind === 'topic' && !topicLabel) {
      alert('분류 이름을 입력해 주세요.');
      return;
    }
    if (Number(post?.reportCount) > 0) body.confirmReported = true;
  }
  if (mode === 'announcement') {
    body.announcementId = Number(announcementId || 0);
    if (!body.announcementId) {
      alert('공지를 골라 주세요.');
      return;
    }
  }
  const warning = Number(post?.reportCount) > 0 && mode === 'post'
    ? `\n\n처리 안 된 신고 ${post.reportCount}건이 있습니다.`
    : '';
  if (!confirm(`${title}\n\n${bodyText}${warning}\n\n이 내용으로 보냅니다. 오늘은 다시 보낼 수 없습니다.`)) return;
  try {
    await api('/daily-push/send', { method: 'POST', body: JSON.stringify(body) });
    alert('보냈습니다.');
    await loadDailyPushPanel();
  } catch (error) {
    alert(error.message || '보내지 못했습니다.');
  }
}

window.loadDailyPush = loadDailyPushPanel;
window.submitDailyPush = submitDailyPush;
