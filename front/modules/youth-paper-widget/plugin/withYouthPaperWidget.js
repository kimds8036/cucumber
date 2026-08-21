const fs = require('fs');
const path = require('path');
const {
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
  withDangerousMod,
  withAndroidManifest,
  IOSConfig,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const APP_GROUP = 'group.com.ucost.YouthPaper';
const WIDGET_TARGET_NAME = 'YouthPaperWidgets';
const MEAL_BG_ID = 'com.ucost.YouthPaper.widget.meal.refresh';
const TIMETABLE_BG_ID = 'com.ucost.YouthPaper.widget.timetable.refresh';

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileSync(src, dest) {
  ensureDirSync(path.dirname(dest));
  fs.cpSync(src, dest, { recursive: true });
}

function withAppGroupEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    const entitlements = cfg.modResults;
    const key = 'com.apple.security.application-groups';
    const existing = entitlements[key] || [];
    if (!existing.includes(APP_GROUP)) {
      entitlements[key] = [...existing, APP_GROUP];
    }
    return cfg;
  });
}

function withBgTaskIds(config) {
  return withInfoPlist(config, (cfg) => {
    const ids = cfg.modResults.BGTaskSchedulerPermittedIdentifiers || [];
    for (const id of [MEAL_BG_ID, TIMETABLE_BG_ID]) {
      if (!ids.includes(id)) ids.push(id);
    }
    cfg.modResults.BGTaskSchedulerPermittedIdentifiers = ids;
    return cfg;
  });
}

/**
 * Widget Extension 소스를 ios/YouthPaperWidgets 로 복사하고
 * Xcode 타겟이 없으면 기본 그룹/파일 참조를 추가한다.
 * (완전 자동 타겟 생성은 Xcode 버전별로 깨지기 쉬워, 소스 복사 + App Group 은 보장)
 */
function withWidgetExtensionSources(config) {
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const { projectRoot, platformProjectRoot } = cfg.modRequest;
      const srcRoot = path.join(
        projectRoot,
        'modules/youth-paper-widget/targets/YouthPaperWidgets',
      );
      const sharedRoot = path.join(
        projectRoot,
        'modules/youth-paper-widget/ios/WidgetShared',
      );
      const destRoot = path.join(platformProjectRoot, WIDGET_TARGET_NAME);
      ensureDirSync(destRoot);

      if (fs.existsSync(srcRoot)) {
        for (const name of fs.readdirSync(srcRoot)) {
          copyFileSync(path.join(srcRoot, name), path.join(destRoot, name));
        }
      }
      // Widget Extension에서도 BG refresh 로직/스토어를 쓸 수 있게 공유 소스 복사
      if (fs.existsSync(sharedRoot)) {
        for (const name of fs.readdirSync(sharedRoot)) {
          if (!name.endsWith('.swift')) continue;
          // Widget Extension 번들에는 store 모델만 필요 — Background는 앱 타겟 모듈에 있음
          if (name === 'WidgetBackground.swift') continue;
          copyFileSync(path.join(sharedRoot, name), path.join(destRoot, name));
        }
      }

      // AppDelegate 훅용 스니펫 안내 파일 (수동 등록 보완)
      const notePath = path.join(destRoot, 'README_SETUP.md');
      fs.writeFileSync(
        notePath,
        [
          '# YouthPaperWidgets setup',
          '',
          'Prebuild가 소스를 `ios/YouthPaperWidgets`에 복사합니다.',
          'Xcode에서 Widget Extension 타겟이 없으면:',
          '1. File → New → Target → Widget Extension (`YouthPaperWidgets`)',
          '2. App Groups: `group.com.ucost.YouthPaper` (앱·익스텐션 모두)',
          '3. 이 폴더의 Swift 파일을 익스텐션 타겟에 포함',
          '4. 메인 앱 Deployment 와 버전 맞추기',
          '',
          `BGTask IDs: ${MEAL_BG_ID}, ${TIMETABLE_BG_ID}`,
          '',
        ].join('\n'),
        'utf8',
      );
      return cfg;
    },
  ]);

  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    try {
      // App Group entitlement path is handled separately; ensure PBX group exists for sources
      const groupName = WIDGET_TARGET_NAME;
      if (!project.pbxGroupByName(groupName)) {
        const groupId = project.pbxCreateGroup(groupName, groupName);
        const mainGroupId = project.getFirstProject().firstProject.mainGroup;
        project.addToPbxGroup(groupId, mainGroupId);
      }
    } catch (e) {
      // non-fatal
    }
    return cfg;
  });

  return config;
}

/** 메인 앱에서 BG 스케줄러 register 호출을 AppDelegate에 주입 */
function withAppDelegateBgRegister(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const appDelegate =
        IOSConfig.Paths.getAppDelegateFilePath(cfg.modRequest.projectRoot) ||
        path.join(iosRoot, 'YouthPaper', 'AppDelegate.swift');
      // Expo prebuild 후 실제 경로 탐색
      const candidates = [
        appDelegate,
        path.join(iosRoot, 'YouthPaper', 'AppDelegate.swift'),
        path.join(iosRoot, 'YouthPaper', 'AppDelegate.mm'),
      ].filter(Boolean);

      let target = candidates.find((p) => fs.existsSync(p));
      if (!target) {
        // glob-ish
        const walk = (dir) => {
          if (!fs.existsSync(dir)) return null;
          for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory() && ent.name !== 'Pods') {
              const found = walk(full);
              if (found) return found;
            } else if (
              ent.isFile() &&
              (ent.name === 'AppDelegate.swift' || ent.name === 'AppDelegate.mm')
            ) {
              return full;
            }
          }
          return null;
        };
        target = walk(iosRoot);
      }
      if (!target || !target.endsWith('.swift')) return cfg;

      let src = fs.readFileSync(target, 'utf8');
      let ensureImport = (s) => {
        if (s.includes('import YouthPaperWidget')) return s;
        // Expo AppDelegate 상단 import 블록 뒤에 모듈 import 추가
        if (/^import\s+/m.test(s)) {
          return s.replace(/^(?:import\s+.+\n)+/, (block) => `${block}import YouthPaperWidget\n`);
        }
        return `import YouthPaperWidget\n${s}`;
      };

      if (src.includes('WidgetBackgroundScheduler.register')) {
        const next = ensureImport(src);
        if (next !== src) fs.writeFileSync(target, next);
        return cfg;
      }

      if (!src.includes('application(') || !src.includes('didFinishLaunchingWithOptions')) {
        return cfg;
      }

      // didFinishLaunching 본문 시작 직후에 register 삽입
      let next = src.replace(
        /(didFinishLaunchingWithOptions[^{]*\{\s*)/,
        `$1\n    WidgetBackgroundScheduler.register()\n    WidgetBackgroundScheduler.scheduleAll()\n`,
      );
      next = ensureImport(next);
      fs.writeFileSync(target, next);
      return cfg;
    },
  ]);
}

function withAndroidAppWidget(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const javaDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/java/com/ucost/YouthPaper/widget',
      );
      ensureDirSync(javaDir);
      fs.writeFileSync(
        path.join(javaDir, 'MealWidgetReceiver.java'),
        [
          'package com.ucost.YouthPaper.widget;',
          '',
          'public class MealWidgetReceiver extends expo.modules.youthpaperwidget.MealWidgetReceiver {}',
          '',
        ].join('\n'),
      );
      fs.writeFileSync(
        path.join(javaDir, 'TimetableWidgetReceiver.java'),
        [
          'package com.ucost.YouthPaper.widget;',
          '',
          'public class TimetableWidgetReceiver extends expo.modules.youthpaperwidget.TimetableWidgetReceiver {}',
          '',
        ].join('\n'),
      );
      fs.writeFileSync(
        path.join(javaDir, 'TimetableWeekWidgetReceiver.java'),
        [
          'package com.ucost.YouthPaper.widget;',
          '',
          'public class TimetableWeekWidgetReceiver extends expo.modules.youthpaperwidget.TimetableWeekWidgetReceiver {}',
          '',
        ].join('\n'),
      );
      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    const permName = 'android.permission.SCHEDULE_EXACT_ALARM';
    const hasPerm = manifest['uses-permission'].some(
      (p) => p.$?.['android:name'] === permName,
    );
    if (!hasPerm) {
      manifest['uses-permission'].push({ $: { 'android:name': permName } });
    }

    const app = manifest.application?.[0];
    if (!app) return cfg;
    app.receiver = app.receiver || [];
    const refreshName = 'expo.modules.youthpaperwidget.WidgetRefreshReceiver';
    const refreshNode = {
      $: {
        'android:name': refreshName,
        'android:exported': 'false',
        'android:enabled': 'true',
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name': 'expo.modules.youthpaperwidget.ACTION_REFRESH',
              },
            },
          ],
        },
      ],
    };
    const refreshIdx = app.receiver.findIndex(
      (r) => r.$?.['android:name'] === refreshName,
    );
    if (refreshIdx >= 0) app.receiver[refreshIdx] = refreshNode;
    else app.receiver.push(refreshNode);
    const receivers = [
      {
        name: 'com.ucost.YouthPaper.widget.MealWidgetReceiver',
        label: '급식',
        xml: '@xml/youth_paper_meal_widget_info',
      },
      {
        name: 'com.ucost.YouthPaper.widget.TimetableWidgetReceiver',
        label: '시간표 (오늘)',
        xml: '@xml/youth_paper_timetable_widget_info',
      },
      {
        name: 'com.ucost.YouthPaper.widget.TimetableWeekWidgetReceiver',
        label: '시간표 (주간)',
        xml: '@xml/youth_paper_timetable_week_widget_info',
      },
    ];
    for (const spec of receivers) {
      const node = {
        $: {
          'android:name': spec.name,
          'android:exported': 'true',
          'android:enabled': 'true',
          'android:label': spec.label,
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': spec.xml,
            },
          },
        ],
      };
      const idx = app.receiver.findIndex(
        (r) => r.$?.['android:name'] === spec.name,
      );
      if (idx >= 0) app.receiver[idx] = node;
      else app.receiver.push(node);
    }
    return cfg;
  });

  return config;
}

function withYouthPaperWidget(config) {
  config = withAppGroupEntitlement(config);
  config = withBgTaskIds(config);
  config = withWidgetExtensionSources(config);
  config = withAppDelegateBgRegister(config);
  config = withAndroidAppWidget(config);
  return config;
}

module.exports = createRunOncePlugin(
  withYouthPaperWidget,
  'withYouthPaperWidget',
  '1.3.1',
);
