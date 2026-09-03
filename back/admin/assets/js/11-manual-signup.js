let manualSignupSchool = null;
let manualSignupSchoolSearchResults = [];

function resetManualSignupForm() {
  manualSignupSchool = null;
  const ids = [
    'manual-signup-username',
    'manual-signup-password',
    'manual-signup-password2',
    'manual-signup-name',
    'manual-signup-phone',
    'manual-signup-birth',
    'manual-signup-school-q',
    'manual-signup-grade',
    'manual-signup-class',
    'manual-signup-note',
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const colorEl = document.getElementById('manual-signup-color');
  if (colorEl) colorEl.value = String(Math.floor(Math.random() * 4) + 1);
  const studentVerified = document.getElementById('manual-signup-student-verified');
  if (studentVerified) studentVerified.checked = true;
  const schoolPick = document.getElementById('manual-signup-school-pick');
  if (schoolPick) schoolPick.innerHTML = '<span class="txt-muted">학교를 검색해 선택하세요.</span>';
  const result = document.getElementById('manual-signup-result');
  if (result) result.innerHTML = '';
}

async function searchManualSignupSchools() {
  const q = document.getElementById('manual-signup-school-q')?.value?.trim() || '';
  const host = document.getElementById('manual-signup-school-results');
  if (!host) return;
  if (q.length < 2) {
    host.innerHTML = '<p class="txt-muted">2글자 이상 입력하세요.</p>';
    return;
  }
  host.innerHTML = '<p class="txt-muted">검색 중…</p>';
  try {
    const res = await fetch(
      `${getAdminHost()}/api/schools/search?query=${encodeURIComponent(q)}&limit=8`,
    );
    const data = await res.json();
    const schools = data?.data?.schools || [];
    if (!schools.length) {
      host.innerHTML = '<p class="txt-muted">검색 결과가 없습니다.</p>';
      return;
    }
    manualSignupSchoolSearchResults = schools;
    host.innerHTML = schools
      .map(
        (s, idx) => `
      <button type="button" class="btn btn-sm" style="margin:4px 4px 0 0"
        onclick="pickManualSignupSchoolByIndex(${idx})">
        ${esc(s.name)} (${esc(s.region || s.id)})
      </button>`,
      )
      .join('');
  } catch (error) {
    host.innerHTML = `<p class="txt-muted">검색 실패: ${esc(error.message)}</p>`;
  }
}

function pickManualSignupSchoolByIndex(idx) {
  const school = manualSignupSchoolSearchResults[idx];
  if (!school) return;
  pickManualSignupSchool(school);
}

function pickManualSignupSchool(school) {
  manualSignupSchool = school;
  const host = document.getElementById('manual-signup-school-pick');
  if (host) {
    host.innerHTML = `<strong>${esc(school.name)}</strong>
      <span class="txt-muted"> — ${esc(school.id)}</span>
      <button type="button" class="btn btn-sm" style="margin-left:8px" onclick="clearManualSignupSchool()">변경</button>`;
  }
}

function clearManualSignupSchool() {
  manualSignupSchool = null;
  const host = document.getElementById('manual-signup-school-pick');
  if (host) host.innerHTML = '<span class="txt-muted">학교를 검색해 선택하세요.</span>';
}

async function submitManualSignup() {
  const username = document.getElementById('manual-signup-username')?.value?.trim();
  const password = document.getElementById('manual-signup-password')?.value || '';
  const password2 = document.getElementById('manual-signup-password2')?.value || '';
  const name = document.getElementById('manual-signup-name')?.value?.trim();
  const phone = document.getElementById('manual-signup-phone')?.value?.trim();
  const birthDate = document.getElementById('manual-signup-birth')?.value?.trim();
  const grade = document.getElementById('manual-signup-grade')?.value;
  const classNumber = document.getElementById('manual-signup-class')?.value;
  const colorId = document.getElementById('manual-signup-color')?.value;
  const studentVerified = document.getElementById('manual-signup-student-verified')?.checked;
  const adminNote = document.getElementById('manual-signup-note')?.value?.trim();
  const resultHost = document.getElementById('manual-signup-result');

  if (password !== password2) {
    alert('비밀번호 확인이 일치하지 않습니다.');
    return;
  }
  if (!manualSignupSchool?.id) {
    alert('학교를 검색해 선택해 주세요.');
    return;
  }

  try {
    const { data } = await api('/users/manual', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        name,
        phone,
        birthDate,
        schoolId: manualSignupSchool.id,
        grade: Number(grade),
        classNumber: Number(classNumber),
        colorId: Number(colorId),
        studentVerified,
        adminNote,
      }),
    });

    if (resultHost) {
      resultHost.innerHTML = `
        <div class="detail-panel open" style="margin-top:12px">
          <div class="section-title">계정 생성 완료</div>
          <p>UID: <strong>#${data.userId}</strong></p>
          <p>아이디: <strong>${esc(data.username)}</strong></p>
          <p>학생 인증: ${data.studentVerified ? '완료' : '미완료(검수 대기)'}</p>
          <p class="section-hint">비밀번호는 이 화면에 다시 표시되지 않습니다. 학생에게 안전하게 전달하세요.</p>
        </div>`;
    }
  } catch (error) {
    alert(`생성 실패: ${error.message}`);
  }
}

function renderManualSignupPanel() {
  const host = document.getElementById('manual-signup-host');
  if (!host) return;

  host.innerHTML = `
    <div class="detail-panel open">
      <div class="section-title">학생 계정 수동 생성</div>
      <p class="section-hint">앱 회원가입과 동일한 users 테이블·bcrypt 해시·PII 암호화를 사용합니다. 전화 인증은 완료 처리됩니다.</p>
      <div class="form-grid" style="margin-top:12px">
        <label>로그인 아이디 (3~20자, 영문·숫자·_)
          <input id="manual-signup-username" class="note-input" autocomplete="off" />
        </label>
        <label>비밀번호 (8자+, 영문+숫자)
          <input id="manual-signup-password" type="password" class="note-input" autocomplete="new-password" />
        </label>
        <label>비밀번호 확인
          <input id="manual-signup-password2" type="password" class="note-input" autocomplete="new-password" />
        </label>
        <label>이름
          <input id="manual-signup-name" class="note-input" />
        </label>
        <label>휴대폰 (010-0000-0000)
          <input id="manual-signup-phone" class="note-input" placeholder="010-1234-5678" />
        </label>
        <label>생년월일
          <input id="manual-signup-birth" class="note-input" placeholder="YYYY-MM-DD" />
        </label>
        <label>학년
          <select id="manual-signup-grade" class="note-input">
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
          </select>
        </label>
        <label>반
          <input id="manual-signup-class" type="number" min="1" max="50" class="note-input" value="1" />
        </label>
        <label>프로필 색
          <select id="manual-signup-color" class="note-input">
            <option value="1">1</option><option value="2">2</option>
            <option value="3">3</option><option value="4">4</option>
          </select>
        </label>
      </div>
      <label style="display:block;margin-top:12px">
        <input type="checkbox" id="manual-signup-student-verified" checked />
        학생 인증 완료 처리 (student_verified)
      </label>
      <div style="margin-top:16px">
        <div class="section-title" style="font-size:13px">학교</div>
        <div class="filter-row">
          <input id="manual-signup-school-q" class="note-input" placeholder="학교명 검색" style="min-width:220px" />
          <button type="button" class="btn btn-sm" onclick="searchManualSignupSchools()">검색</button>
        </div>
        <div id="manual-signup-school-results" style="margin-top:8px"></div>
        <div id="manual-signup-school-pick" class="txt-muted" style="margin-top:8px">학교를 검색해 선택하세요.</div>
      </div>
      <label style="display:block;margin-top:16px">생성 사유 (감사 로그)
        <textarea id="manual-signup-note" class="note-input" style="min-height:72px" placeholder="예: 오프라인 서류 확인 후 수동 가입"></textarea>
      </label>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button type="button" class="btn btn-primary" onclick="submitManualSignup()">계정 생성</button>
        <button type="button" class="btn" onclick="resetManualSignupForm()">초기화</button>
      </div>
      <div id="manual-signup-result"></div>
    </div>
  `;

  resetManualSignupForm();
}

async function loadManualSignupPanel() {
  renderManualSignupPanel();
}

window.searchManualSignupSchools = searchManualSignupSchools;
window.pickManualSignupSchoolByIndex = pickManualSignupSchoolByIndex;
window.pickManualSignupSchool = pickManualSignupSchool;
window.clearManualSignupSchool = clearManualSignupSchool;
window.submitManualSignup = submitManualSignup;
window.resetManualSignupForm = resetManualSignupForm;
window.loadManualSignup = loadManualSignupPanel;
