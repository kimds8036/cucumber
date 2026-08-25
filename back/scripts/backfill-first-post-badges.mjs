/**
 * 배지 출시 전 글 작성자에게 first_post 배지를 1회 부여.
 * 배포 migrate에 넣지 않음. 공개 시점에 develop / production 각각 실행.
 *
 *   cd back
 *   npm run badges:backfill-first-post -- --target=develop --dry-run
 *   npm run badges:backfill-first-post -- --target=develop
 *   npm run badges:backfill-first-post -- --target=production
 */
import { createDbConnection, parseMigrateCliArgs } from '../src/config/dbEnv.js';

const DRY_RUN = process.argv.includes('--dry-run');

async function backfill(connection) {
  const [[before]] = await connection.execute(
    `SELECT COUNT(DISTINCT p.user_id) AS missing
     FROM posts p
     INNER JOIN users u ON u.id = p.user_id AND u.is_deleted = FALSE
     LEFT JOIN user_badges ub
       ON ub.user_id = p.user_id AND ub.badge_key = 'first_post'
     WHERE p.is_deleted = FALSE
       AND ub.user_id IS NULL`,
  );

  if (DRY_RUN) {
    return { inserted: 0, missing: Number(before?.missing || 0), dryRun: true };
  }

  const [result] = await connection.execute(
    `INSERT IGNORE INTO user_badges (user_id, badge_key)
     SELECT DISTINCT p.user_id, 'first_post'
     FROM posts p
     INNER JOIN users u ON u.id = p.user_id AND u.is_deleted = FALSE
     WHERE p.is_deleted = FALSE`,
  );

  return {
    inserted: Number(result?.affectedRows || 0),
    missingBefore: Number(before?.missing || 0),
    dryRun: false,
  };
}

async function main() {
  const { targets } = parseMigrateCliArgs();
  for (const target of targets) {
    const connection = await createDbConnection(target);
    try {
      const result = await backfill(connection);
      console.log(`[badges:first_post] target=${target}`, result);
      if (result.dryRun) {
        console.log('dry-run — INSERT 하지 않음. 옵션을 빼고 다시 실행하세요.');
      }
    } finally {
      await connection.end();
    }
  }
}

main().catch((err) => {
  console.error('[badges:first_post] failed', err?.message || err);
  process.exit(1);
});
