function dailyPushSnippet(text) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > 80 ? `${value.slice(0, 79)}…` : value;
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
  if (data.sent) {
    host.innerHTML = `
      <div class="detail-panel open">
        <div class="section-title">오늘 알림을 이미 보냈습니다</div>
        <p><strong>${esc(data.sent.title)}</strong></p>
        <p>${esc(data.sent.body)}</p>
        <p class="txt-muted">도달 ${Number(data.sent.recipientCount || 0)}명 · ${esc(String(data.sent.sentAt || ''))}</p>
      </div>`;
    return;
  }

  const posts = [
    ...(data.posts?.national || []).map((post) => ({ ...post, boardLabel: '전체' })),
    ...(data.posts?.school || []).map((post) => ({ ...post, boardLabel: '학생' })),
  ];
  const postOptions = posts.map((post) => `
    <label class="flag-row">
      <input type="radio" name="daily-push-post" value="${post.id}" data-board="${esc(post.boardType)}" data-tag="${esc(post.tags?.[0] || '')}" />
      <span>[${esc(post.boardLabel)}] ${esc(dailyPushSnippet(post.content))} · 좋아요 ${post.likeCount} 댓글 ${post.commentCount}</span>
    </label>`).join('');
  const notices = (data.announcements || []).map((item) => `
    <option value="${item.id}">${esc(item.title)}</option>`).join('');
  const study = data.studyRoom?.offered
    ? `<label class="flag-row"><input type="radio" name="daily-push-mode" value="study_room" /> 스터디룸이 활발해요 (${data.studyRoom.memberCount}명, 오늘 글 ${data.studyRoom.todayPostCount}개)</label>`
    : `<p class="txt-muted">스터디룸 알림은 오늘 글이 ${data.studyRoom?.todayPostCount ?? 0}개이고 참여 ${data.studyRoom?.memberCount ?? 0}명일 때 열립니다. 기준은 글 5개 미만, 참여 8명 이상입니다.</p>`;

  host.innerHTML = `
    <p class="section-hint">${esc(data.dayKey)} · 디스코드 리마인드는 ${data.discordHour}시. 그 전에 보내면 디스코드는 오지 않습니다.</p>
    <div class="detail-panel open">
      <label class="flag-row"><input type="radio" name="daily-push-mode" value="post" checked /> 게시글</label>
      <label class="flag-row"><input type="radio" name="daily-push-mode" value="announcement" /> 공지</label>
      ${study}
      <div id="daily-push-posts" style="margin-top:12px">${postOptions || '<p class="txt-muted">최근 인기글이 없습니다. 글 번호를 직접 넣을 수 있습니다.</p>'}</div>
      <label style="display:block;margin-top:8px">글 번호 직접 입력
        <input id="daily-push-post-id" class="note-input" inputmode="numeric" />
      </label>
      <label style="display:block;margin-top:8px">문장
        <select id="daily-push-phrase" class="note-input">
          <option value="popular">오늘의 인기 게시글이에요</option>
          <option value="topic">게시판에 올라온 ‘분류’ 게시글이에요</option>
        </select>
      </label>
      <label style="display:block;margin-top:8px">분류 이름 (고민 등)
        <input id="daily-push-topic" class="note-input" maxlength="30" placeholder="고민" />
      </label>
      <label style="display:block;margin-top:8px">공지
        <select id="daily-push-announcement" class="note-input">
          <option value="">선택</option>
          ${notices}
        </select>
      </label>
      <div style="margin-top:12px">
        <button type="button" class="btn btn-primary" onclick="submitDailyPush()">이 내용으로 보내기</button>
      </div>
    </div>`;

  host.querySelectorAll('input[name="daily-push-post"]').forEach((input) => {
    input.addEventListener('change', () => {
      const tag = input.getAttribute('data-tag') || '';
      const topic = document.getElementById('daily-push-topic');
      if (topic && tag && !topic.value) topic.value = tag;
    });
  });
}

async function submitDailyPush() {
  const mode = document.querySelector('input[name="daily-push-mode"]:checked')?.value || 'post';
  const selected = document.querySelector('input[name="daily-push-post"]:checked');
  const typedId = document.getElementById('daily-push-post-id')?.value?.trim();
  const phraseKind = document.getElementById('daily-push-phrase')?.value || 'popular';
  const topicLabel = document.getElementById('daily-push-topic')?.value?.trim() || '';
  const announcementId = document.getElementById('daily-push-announcement')?.value || '';
  const body = { kind: mode, phraseKind, topicLabel };
  if (mode === 'post') {
    body.postId = Number(typedId || selected?.value || 0);
    if (!body.postId) {
      alert('게시글을 골라 주세요.');
      return;
    }
  }
  if (mode === 'announcement') {
    body.announcementId = Number(announcementId || 0);
    if (!body.announcementId) {
      alert('공지를 골라 주세요.');
      return;
    }
  }
  if (!confirm('오늘 알림을 이 내용으로 보낼까요? 오늘 다시 보낼 수 없습니다.')) return;
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
