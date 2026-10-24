let timerBotState = { bots: [], requests: [], pokes: [], chats: [], messages: [] };
let timerBotSelectedId = null;
let timerBotRoomId = null;

function timerBotPhaseLabel(phase) {
  if (phase === 'study') return '공부 중';
  if (phase === 'rest') return '휴식';
  return '꺼짐';
}

async function loadTimerBots() {
  const host = document.getElementById('timer-bots-host');
  if (!host) return;
  host.innerHTML = '<p class="txt-muted">불러오는 중…</p>';
  try {
    const { data } = await api('/timer-bots');
    timerBotState = {
      bots: data.bots || [],
      requests: data.requests || [],
      pokes: data.pokes || [],
      chats: timerBotState.chats || [],
      messages: timerBotState.messages || [],
    };
    if (
      timerBotSelectedId &&
      !timerBotState.bots.some((bot) => bot.userId === timerBotSelectedId)
    ) {
      timerBotSelectedId = null;
      timerBotRoomId = null;
    }
    if (timerBotSelectedId) {
      await loadTimerBotChats(timerBotSelectedId, false);
      return;
    }
    renderTimerBots();
  } catch (error) {
    host.innerHTML = `<p class="txt-danger">${esc(error.message || '불러오지 못했습니다.')}</p>`;
  }
}

async function loadTimerBotChats(botUserId, keepRoom) {
  timerBotSelectedId = Number(botUserId);
  const { data } = await api(`/timer-bots/chats?botUserId=${timerBotSelectedId}`);
  timerBotState.chats = data.chats || [];
  if (!keepRoom || !timerBotState.chats.some((chat) => chat.roomId === timerBotRoomId)) {
    timerBotRoomId = null;
    timerBotState.messages = [];
  } else if (timerBotRoomId) {
    const messageData = await api(
      `/timer-bots/chats/${timerBotRoomId}?botUserId=${timerBotSelectedId}`,
    );
    timerBotState.messages = messageData.data.messages || [];
  }
  renderTimerBots();
}

function renderTimerBots() {
  const host = document.getElementById('timer-bots-host');
  if (!host) return;
  const bots = timerBotState.bots
    .map(
      (bot) => `
        <tr>
          <td>@${esc(bot.username)}</td>
          <td>${esc(bot.name)}</td>
          <td>${esc(bot.schoolLine)}</td>
          <td>${esc(timerBotPhaseLabel(bot.phase))}</td>
          <td>${bot.pendingRequests}</td>
          <td>${bot.unreadChats}</td>
          <td><button type="button" class="btn btn-sm" data-bot-open="${bot.userId}">채팅</button></td>
        </tr>`,
    )
    .join('');
  const requests = timerBotState.requests
    .map(
      (row) => `
        <tr>
          <td><input type="checkbox" class="timer-bot-request" value="${row.requestId}"></td>
          <td>@${esc(row.requesterUsername)}</td>
          <td>@${esc(row.botUsername)}</td>
          <td>${esc(row.createdAt || '')}</td>
        </tr>`,
    )
    .join('');
  const chats = timerBotState.chats
    .map(
      (chat) => `
        <button type="button" class="btn btn-sm" data-bot-room="${chat.roomId}" style="margin:0 8px 8px 0">
          @${esc(chat.otherUsername)} ${chat.unread ? `(${chat.unread})` : ''}
        </button>`,
    )
    .join('');
  const messages = timerBotState.messages
    .map(
      (message) => `
        <div style="margin-bottom:8px">
          <strong>${message.fromBot ? '봇' : '사용자'}</strong>
          <span class="txt-muted">${esc(message.createdAt || '')}</span>
          <div>${esc(message.content)}</div>
        </div>`,
    )
    .join('');
  const pokes = timerBotState.pokes
    .map(
      (poke) => `<li>@${esc(poke.botUsername)} · ${esc(poke.body || poke.type)} · ${esc(poke.createdAt || '')}</li>`,
    )
    .join('');
  host.innerHTML = `
    <h3 style="margin:0 0 8px">봇 10명</h3>
    <div class="table-wrap" style="margin-bottom:20px">
      <table>
        <thead><tr><th>아이디</th><th>이름</th><th>학교</th><th>상태</th><th>요청</th><th>안 읽은 채팅</th><th></th></tr></thead>
        <tbody>${bots || '<tr><td colspan="7">봇이 없습니다.</td></tr>'}</tbody>
      </table>
    </div>
    <h3 style="margin:0 0 8px">친구 요청</h3>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <button type="button" class="btn btn-primary btn-sm" id="timer-bot-accept">선택 수락</button>
      <button type="button" class="btn btn-sm" id="timer-bot-reject">선택 거절</button>
      <button type="button" class="btn btn-sm" id="timer-bot-accept-all">전체 수락</button>
      <button type="button" class="btn btn-sm" id="timer-bot-reject-all">전체 거절</button>
    </div>
    <div class="table-wrap" style="margin-bottom:20px">
      <table>
        <thead><tr><th></th><th>요청한 사람</th><th>봇</th><th>시각</th></tr></thead>
        <tbody>${requests || '<tr><td colspan="4">대기 중인 요청이 없습니다.</td></tr>'}</tbody>
      </table>
    </div>
    <h3 style="margin:0 0 8px">채팅</h3>
    <div>${chats || '<p class="txt-muted">봇을 고르면 대화가 나옵니다.</p>'}</div>
    <div id="timer-bot-thread" style="margin:12px 0">${messages}</div>
    ${
      timerBotRoomId
        ? `<form id="timer-bot-reply" style="display:flex;gap:8px;margin-bottom:20px">
            <input id="timer-bot-reply-text" type="text" maxlength="2000" placeholder="봇 이름으로 답장" style="flex:1">
            <button type="submit" class="btn btn-primary">답장</button>
            <button type="button" class="btn" id="timer-bot-read">읽음</button>
          </form>`
        : ''
    }
    <h3 style="margin:0 0 8px">찌르기</h3>
    <ul>${pokes || '<li class="txt-muted">쌓인 찌르기가 없습니다.</li>'}</ul>
  `;
  host.querySelectorAll('[data-bot-open]').forEach((button) => {
    button.addEventListener('click', () => {
      loadTimerBotChats(button.getAttribute('data-bot-open'), false).catch((error) => {
        alert(error.message || '채팅을 불러오지 못했습니다.');
      });
    });
  });
  host.querySelectorAll('[data-bot-room]').forEach((button) => {
    button.addEventListener('click', () => {
      openTimerBotRoom(Number(button.getAttribute('data-bot-room'))).catch((error) => {
        alert(error.message || '대화를 불러오지 못했습니다.');
      });
    });
  });
  document.getElementById('timer-bot-accept')?.addEventListener('click', () => {
    submitTimerBotRequests('accept', false);
  });
  document.getElementById('timer-bot-reject')?.addEventListener('click', () => {
    submitTimerBotRequests('reject', false);
  });
  document.getElementById('timer-bot-accept-all')?.addEventListener('click', () => {
    submitTimerBotRequests('accept', true);
  });
  document.getElementById('timer-bot-reject-all')?.addEventListener('click', () => {
    submitTimerBotRequests('reject', true);
  });
  document.getElementById('timer-bot-reply')?.addEventListener('submit', (event) => {
    event.preventDefault();
    replyTimerBot().catch((error) => alert(error.message || '답장을 보내지 못했습니다.'));
  });
  document.getElementById('timer-bot-read')?.addEventListener('click', () => {
    markTimerBotRead().catch((error) => alert(error.message || '읽음 처리하지 못했습니다.'));
  });
}

function selectedTimerBotRequestIds(all) {
  if (all) return timerBotState.requests.map((row) => row.requestId);
  return [...document.querySelectorAll('.timer-bot-request:checked')].map((input) =>
    Number(input.value),
  );
}

async function submitTimerBotRequests(action, all) {
  const ids = selectedTimerBotRequestIds(all);
  if (!ids.length) {
    alert('요청을 골라 주세요.');
    return;
  }
  await api(`/timer-bots/requests/${action}`, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
  await loadTimerBots();
}

async function openTimerBotRoom(roomId) {
  timerBotRoomId = roomId;
  const { data } = await api(
    `/timer-bots/chats/${roomId}?botUserId=${timerBotSelectedId}`,
  );
  timerBotState.messages = data.messages || [];
  renderTimerBots();
}

async function replyTimerBot() {
  const input = document.getElementById('timer-bot-reply-text');
  const content = input?.value || '';
  await api(`/timer-bots/chats/${timerBotRoomId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ botUserId: timerBotSelectedId, content }),
  });
  await openTimerBotRoom(timerBotRoomId);
}

async function markTimerBotRead() {
  await api(`/timer-bots/chats/${timerBotRoomId}/read`, {
    method: 'POST',
    body: JSON.stringify({ botUserId: timerBotSelectedId }),
  });
  await loadTimerBotChats(timerBotSelectedId, true);
}

window.loadTimerBots = loadTimerBots;
