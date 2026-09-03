/**
 * develop API 최신본을 기준으로 법적 문서 보강 → 로컬 md/폴백 → develop·production DB 반영
 * 사용: node scripts/sync-legal-documents.mjs [--dry-run] [--skip-db]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createDbConnection,
  loadBackEnv,
} from '../src/config/dbEnv.js';
import { stripLegalDocumentPreamble } from '../src/utils/legalDocumentContent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACK_ROOT = path.resolve(__dirname, '..');
const FRONT_ROOT = path.resolve(BACK_ROOT, '../front');
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_DB = process.argv.includes('--skip-db');
const DB_ONLY = process.argv.includes('--db-only');
const targetArg = process.argv.find((a) => a.startsWith('--target='));
const TARGETS = targetArg
  ? [targetArg.split('=')[1] === 'production' ? 'production' : 'develop']
  : ['develop', 'production'];

const DEV_API = 'https://cucumber-develop.up.railway.app/api/legal';

const DOCS = [
  {
    slug: 'terms_of_service',
    title: '서비스 이용약관',
    version: 'v1.3.1',
    file: 'service-terms.md',
    fallback: '_terms_md.json',
  },
  {
    slug: 'privacy_policy',
    title: '개인정보 처리방침',
    version: 'v1.5.2',
    file: 'privacy-policy.md',
    fallback: '_privacy_md.json',
  },
  {
    slug: 'community_guide',
    title: '커뮤니티 가이드',
    version: 'v1.1.1',
    file: 'community-guide.md',
    fallback: '_community_md.json',
  },
  {
    slug: 'youth_protection_policy',
    title: '청소년 보호정책',
    version: 'v1.1.1',
    file: 'youth-protect-policy.md',
    fallback: '_youth_md.json',
  },
  {
    slug: 'open_source_licenses',
    title: '오픈소스 라이선스',
    version: 'v1.1.1',
    file: 'open-source-licenses.md',
    fallback: '_opensource_md.json',
  },
];

function norm(s) {
  return String(s || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u201c|\u201d/g, '"')
    .trim();
}

async function fetchDev(slug) {
  const res = await fetch(`${DEV_API}/${slug}`);
  if (!res.ok) throw new Error(`fetch ${slug}: ${res.status}`);
  const json = await res.json();
  return norm(json.data?.contentMd);
}

function patchTerms(md) {
  let out = md;

  if (!out.includes('**고객지원·문의**')) {
    out = out.replace(
      '17. **이용 통계**: 서비스 개선을 위한 화면 이용 등 내부 통계(가능한 경우 해시·비식별 형태).\n18. 기타 회사가 정하는 부가 서비스 및 제휴 서비스.',
      `17. **이용 통계**: 서비스 개선을 위한 화면 이용 등 내부 통계(가능한 경우 해시·비식별 형태).
18. **고객지원·문의**: 앱 내 고객지원의 공지사항·문의사항을 통해 서비스 관련 문의·답변을 주고받을 수 있습니다.
19. **회초리(개발팀 제보)**: 버그·기능 제안·불편 사항 등 서비스 개선 의견을 제출하고, 개발팀 답변(반영 완료·도입 예정·도입 불가 등)을 확인할 수 있습니다. 제보 시 입력한 표시 이름(제보 이름)은 공개 목록에 마스킹되어 표시될 수 있습니다.
20. 기타 회사가 정하는 부가 서비스 및 제휴 서비스.`,
    );
  }

  // 고지일(본문) — UI 메타(updated_at)와 별도로 본문 표기 정리
  out = out.replace(
    /## 부칙[\s\S]*$/,
    `## 부칙

1. 개정 약관은 개정 공지에 명시된 시행일부터 효력이 발생합니다.
2. 본 약관의 개정 공고일·시행일은 앱 내 문서 화면의 제정일·시행일 표시를 따릅니다.`,
  );

  out = out.replace(
    /\. OCR 자동 추출은[^.\n]*\./g,
    '.',
  );
  out = out.replace(
    /, OCR 자동 추출은[^.\n]*/g,
    '',
  );
  out = out.replace(
    / OCR 등 자동 추출은 향후 도입될 수 있습니다\./g,
    '.',
  );
  out = out.replace(
    /·전화번호 확인,/g,
    '',
  );
  out = out.replace(
    /발송 시점으로부터 \*\*1일\*\*이/g,
    '발송 시점으로부터 **3시간**이',
  );
  out = out.replace(
    /발송 후 \*\*1일\*\*이/g,
    '발송 후 **3시간**이',
  );
  out = out.replace(
    /\(예: 광고 시청 등, 도입 시 앱 내 안내\)을 통해 최대 100자까지 작성할 수 있습니다\. 해당 확장 기능이 제공되기 전에는 기본 글자 수가 적용됩니다\./,
    '(예: 광고 시청 등)을 통해 최대 100자까지 작성할 수 있습니다.',
  );
  out = out.replace(
    /영구 이용 정지 및 단말기 차단 조치/g,
    '영구 이용 정지 조치',
  );
  out = out.replace(
    / 일정 기간 보관할 수 있습니다\. 기기 식별 정보 보관이 도입되는 경우 별도 고지합니다\./,
    ' 일정 기간 보관할 수 있습니다.',
  );
  out = out.replace(
    /회원의 게시물을 인공지능 모델 학습에 활용하는 경우 사전에 별도 고지하고 동의를 받습니다\./,
    '현재 회원의 게시물을 인공지능 모델 학습에 활용하지 않습니다. 향후 활용 시 사전에 별도 고지하고 동의를 받습니다.',
  );
  out = out.replace(
    /※ 위 정보는 사업자 등록 완료 후 기입되며, 변경 시/g,
    '※ 위 정보가 변경되는 경우',
  );

  return out;
}

function patchPrivacy(md) {
  let out = md;

  if (!out.includes('| 고객 문의 |')) {
    out = out.replace(
      '| 시간표 | 공공 OPEN API(나이스 등)로 조회한 시간표는 주로 일시 캐시되며, 이용자가 수정한 값은 서버 메모리에 일시 저장될 수 있어 서버 재시작 등으로 소멸될 수 있습니다. |',
      `| 시간표 | 공공 OPEN API(나이스 등)로 조회한 시간표는 주로 일시 캐시되며, 이용자가 수정한 값은 서버 메모리에 일시 저장될 수 있어 서버 재시작 등으로 소멸될 수 있습니다. |
| 고객 문의 | 고객지원 문의사항 본문, 선택 입력한 연락용 이메일·아이디, 앱 버전·기기 정보, 첨부 이미지(URL), 관리자 답변 및 처리 상태 |
| 회초리(개발팀 제보) | 제보 카테고리·내용, 제보 이름(표시용), 앱 버전·기기 정보, 개발팀 답변·처리 상태. 공개 목록에는 마스킹된 표시 이름과 제보 내용·답변이 노출될 수 있습니다 |`,
    );
  }

  if (!out.includes('11. 고객지원·회초리:')) {
    out = out.replace(
      /10\. 학생 인증: 재학 여부 확인, 학교 단위 서비스 접근 권한 부여\. \(제출된 학생증·재학증명서 이미지를 운영팀이 검수[^)]*\)/,
      `10. 학생 인증: 재학 여부 확인, 학교 단위 서비스 접근 권한 부여. (제출된 학생증·재학증명서 이미지를 운영팀이 검수합니다.)
11. 고객지원·회초리: 문의·제보 접수·답변, 서비스 개선 및 부정 이용·장애 대응`,
    );
  }

  out = out.replace(
    / OCR 자동 추출은[^|]*/g,
    '',
  );
  out = out.replace(
    /, OCR 도입 시 별도 고지합니다\./g,
    '.',
  );
  out = out.replace(
    /발송 후 \*\*1일\*\*이/g,
    '발송 후 **3시간**이',
  );

  out = out.replace(
    /## 제10조 고지의 의무[\s\S]*$/,
    `## 제10조 고지의 의무

본 처리방침의 제정일·시행일·버전은 앱 내 문서 화면 표시(서버 반영 시각 기준)를 따릅니다. 중요한 변경 시 앱 내 공지사항 및 카카오톡 채널을 통해 안내합니다.`,
  );

  return out;
}

function patchCommunity(md) {
  let out = md;
  out = out.replace(
    '제재에 이의가 있을 경우, 마이페이지 내 문의사항을 통해 이의 신청을 할 수 있습니다.',
    '제재에 이의가 있을 경우, 앱 내 고객지원 > 문의사항을 통해 이의 신청을 할 수 있습니다.',
  );
  if (!out.includes('회초리')) {
    out = out.replace(
      '※ 본 규정은 서비스 운영 방침에 따라 변경될 수 있으며',
      `기능·버그·불편 제보는 앱 내 **회초리** 메뉴를 이용해 주세요. 커뮤니티 규정 위반 신고와는 별개입니다.

※ 본 규정은 서비스 운영 방침에 따라 변경될 수 있으며`,
    );
  }
  return out;
}

function patchYouth(md) {
  return md.replace(
    '위 행위를 발견한 경우 앱 내 신고 기능 또는 고객센터 이메일을 통해 즉시 제보해 주시기 바랍니다.',
    '위 행위를 발견한 경우 앱 내 신고 기능, 고객지원 문의사항 또는 고객센터 이메일을 통해 즉시 알려 주시기 바랍니다.',
  );
}

function patchOpensource(md) {
  let out = md;
  const mitAdds = [
    '- @react-native-firebase/auth: Invertase',
    '- @react-native-community/netinfo: React Native Community',
    '- @react-native-menu/menu: React Native Community',
    '- expo-clipboard: 650 Industries, Inc.',
    '- expo-dev-client: 650 Industries, Inc.',
    '- expo-haptics: 650 Industries, Inc.',
    '- expo-linking: 650 Industries, Inc.',
    '- expo-local-authentication: 650 Industries, Inc.',
    '- expo-media-library: 650 Industries, Inc.',
    '- react-native-gesture-handler: Software Mansion',
    '- react-native-worklets: Software Mansion',
  ];
  for (const line of mitAdds) {
    if (!out.includes(line.split(':')[0])) {
      out = out.replace(
        '- @react-native-firebase/messaging: Invertase',
        `- @react-native-firebase/messaging: Invertase\n${line}`,
      );
    }
  }
  out = out.replace(
    '- react-native-vector-icons: Joel Arvidsson',
    '- @expo/vector-icons: 650 Industries, Inc.',
  );
  return out;
}

function writeOutputs(doc, content) {
  const clean = stripLegalDocumentPreamble(norm(content));
  const backPath = path.join(BACK_ROOT, 'src/db/legal', doc.file);
  const frontDocPath = path.join(FRONT_ROOT, 'docs/legal', doc.file);
  const fallbackPath = path.join(
    FRONT_ROOT,
    'src/screens/Terms-of-Service',
    doc.fallback,
  );

  if (DRY_RUN) {
    console.log(`[dry] would write ${doc.slug} (${clean.length} chars) → ${doc.version}`);
    return clean;
  }

  fs.writeFileSync(backPath, `${clean}\n`, 'utf8');
  fs.writeFileSync(frontDocPath, `${clean}\n`, 'utf8');
  fs.writeFileSync(fallbackPath, `${JSON.stringify(clean)}\n`, 'utf8');
  console.log(`wrote ${doc.slug} → md + fallback (${clean.length} chars, ${doc.version})`);
  return clean;
}

async function upsertDb(target, doc, content) {
  const conn = await createDbConnection(target);
  try {
    const [rows] = await conn.execute(
      `SELECT slug, title, version, content_md AS contentMd
       FROM legal_documents WHERE slug = ? LIMIT 1`,
      [doc.slug],
    );
    const current = rows[0];
    if (!current) {
      throw new Error(`${target}: missing ${doc.slug}`);
    }

    const nextContent = stripLegalDocumentPreamble(content);
    const changed =
      current.title !== doc.title ||
      current.version !== doc.version ||
      norm(current.contentMd) !== norm(nextContent);

    if (!changed) {
      console.log(`[${target}] ${doc.slug} unchanged`);
      return;
    }

    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO legal_document_revisions
         (document_slug, title, version, content_md, archived_by_admin_id)
       VALUES (?, ?, ?, ?, NULL)`,
      [current.slug, current.title, current.version, current.contentMd],
    );
    await conn.execute(
      `UPDATE legal_documents
       SET title = ?, version = ?, content_md = ?, updated_by_admin_id = NULL
       WHERE slug = ?`,
      [doc.title, doc.version, nextContent, doc.slug],
    );
    await conn.commit();
    console.log(`[${target}] ${doc.slug} → ${doc.version}`);
  } catch (e) {
    try {
      await conn.rollback();
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    await conn.end();
  }
}

async function main() {
  loadBackEnv();

  // railway run 로컬 실행 시 private DNS 대신 공개 프록시 URL 사용
  const { isRailwayRuntime, getActiveTarget } = await import('../src/config/dbEnv.js');
  if (isRailwayRuntime()) {
    // MySQL 플러그인 서비스 변수 → DB_* 매핑
    if (!process.env.DB_USER && process.env.MYSQLUSER) {
      process.env.DB_USER = process.env.MYSQLUSER;
    }
    if (!process.env.DB_PASSWORD && (process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD)) {
      process.env.DB_PASSWORD = process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD;
    }
    if (!process.env.DB_NAME && (process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE)) {
      process.env.DB_NAME = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE;
    }

    const publicUrl =
      process.env.MYSQL_PUBLIC_URL ||
      process.env.MYSQL_URL ||
      process.env.DATABASE_URL;
    if (publicUrl) {
      try {
        const u = new URL(publicUrl);
        if (!u.hostname.includes('.railway.internal')) {
          process.env.DB_HOST = u.hostname;
          if (u.port) process.env.DB_PORT = u.port;
          if (u.username) process.env.DB_USER = decodeURIComponent(u.username);
          if (u.password) process.env.DB_PASSWORD = decodeURIComponent(u.password);
          if (u.pathname && u.pathname.length > 1) {
            process.env.DB_NAME = u.pathname.replace(/^\//, '');
          }
          delete process.env.DB_PRIVATE_HOST;
          delete process.env.DB_PRIVATE_PORT;
          delete process.env.DB_TUNNEL_HOST;
          delete process.env.DB_TUNNEL_PORT;
          console.log(`using public MySQL host for DB (${u.hostname})`);
        }
      } catch {
        /* keep defaults */
      }
    }
  }

  const builders = {
    terms_of_service: patchTerms,
    privacy_policy: patchPrivacy,
    community_guide: patchCommunity,
    youth_protection_policy: patchYouth,
    open_source_licenses: patchOpensource,
  };

  const prepared = [];
  for (const doc of DOCS) {
    let clean;
    if (DB_ONLY) {
      const backPath = path.join(BACK_ROOT, 'src/db/legal', doc.file);
      clean = stripLegalDocumentPreamble(norm(fs.readFileSync(backPath, 'utf8')));
      console.log(`read ${doc.slug} from disk (${clean.length} chars)`);
    } else {
      const base = await fetchDev(doc.slug);
      const patched = builders[doc.slug](base);
      clean = writeOutputs(doc, patched);
    }
    prepared.push({ doc, content: clean });
  }

  if (!DB_ONLY) {
    const seedPath = path.join(BACK_ROOT, 'src/db/seedLegalDocuments.js');
    let seed = fs.readFileSync(seedPath, 'utf8');
    for (const { doc } of prepared) {
      const re = new RegExp(
        `(slug: '${doc.slug}',[\\s\\S]*?version: ')([^']+)(')`,
        'm',
      );
      seed = seed.replace(re, `$1${doc.version}$3`);
    }
    if (!DRY_RUN) {
      fs.writeFileSync(seedPath, seed, 'utf8');
      console.log('updated seedLegalDocuments.js versions');
    }
  }

  if (SKIP_DB || DRY_RUN) {
    console.log(DRY_RUN ? 'dry-run complete' : 'skip-db complete');
    return;
  }

  // Railway 런타임(railway run)에서는 현재 env의 DB_* 만 사용 → 타깃 1개만 갱신
  const targets = isRailwayRuntime()
    ? [getActiveTarget()]
    : TARGETS;

  for (const target of targets) {
    for (const { doc, content } of prepared) {
      await upsertDb(target, doc, content);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
