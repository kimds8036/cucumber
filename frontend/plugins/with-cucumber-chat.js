const fs = require("fs");
const path = require("path");
const {
  withDangerousMod,
  withXcodeProject,
  withPodfile,
  IOSConfig,
} = require("@expo/config-plugins");

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyDirRecursiveSync(srcDir, destDir) {
  ensureDirSync(destDir);
  let copiedCount = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copiedCount += copyDirRecursiveSync(srcPath, destPath);
    } else {
      ensureDirSync(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
      copiedCount += 1;
    }
  }
  return copiedCount;
}

function walkFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(fullPath));
    } else {
      out.push(fullPath);
    }
  }
  return out;
}

function ensureXcodeSourceLinked(project, relToIos, targetUuid, groupKey) {
  // 1) Try the standard helper first.
  try {
    project.addSourceFile(relToIos, { target: targetUuid }, groupKey);
    return "addedByAddSourceFile";
  } catch (error) {
    // fall through
    const reason = error && error.message ? error.message : String(error);
    return `addSourceFileError:${reason}`;
  }
}

function withCucumberChatCopy(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const { projectRoot, platformProjectRoot } = config.modRequest;
      const srcOutsideIos = path.join(projectRoot, "cucumber-chat-ios");
      const srcDir = srcOutsideIos;

      if (!fs.existsSync(srcDir)) {
        throw new Error(
          [
            "CucumberChat 소스 폴더를 찾지 못했습니다.",
            `아래 경로를 준비해 주세요:`,
            `- ${srcOutsideIos}`,
          ].join("\n")
        );
      }

      const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
      const appSourceRoot = path.join(platformProjectRoot, projectName);
      const destDir = path.join(appSourceRoot, "CucumberChat");
      const copiedCount = copyDirRecursiveSync(srcDir, destDir);
      console.log(
        `[with-cucumber-chat] copied ${copiedCount} files from ${srcDir} to ${destDir}`
      );

      return config;
    },
  ]);
}

function withCucumberChatXcode(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);
    const appSourceRoot = path.join(config.modRequest.platformProjectRoot, projectName);
    const chatRoot = path.join(appSourceRoot, "CucumberChat");

    if (!fs.existsSync(chatRoot)) {
      return config;
    }

    const target = IOSConfig.XcodeUtils.getApplicationNativeTarget({
      project,
      projectName,
    });
    const mainGroupKey = project.getFirstProject()?.firstProject?.mainGroup;
    const files = walkFiles(chatRoot).filter((f) => /\.(swift|m|mm|h)$/i.test(f));
    console.log(
      `[with-cucumber-chat] xcode source candidates: ${files.length} files (target=${target?.uuid ?? "none"}, group=${mainGroupKey ?? "none"})`
    );

    let addedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const failureSamples = [];

    for (const file of files) {
      const relToIos = path
        .relative(config.modRequest.platformProjectRoot, file)
        .split(path.sep)
        .join("/");
      const result = ensureXcodeSourceLinked(
        project,
        relToIos,
        target.uuid,
        mainGroupKey
      );
      if (result === "addedByAddSourceFile") {
        addedCount += 1;
      } else if (String(result).startsWith("addSourceFileError:already there")) {
        skippedCount += 1;
      } else {
        failedCount += 1;
        if (failureSamples.length < 3) {
          failureSamples.push(`${relToIos} -> ${result}`);
        }
      }
    }
    console.log(
      `[with-cucumber-chat] xcode link done: added=${addedCount}, skipped=${skippedCount}, failed=${failedCount}`
    );
    if (failureSamples.length > 0) {
      console.log(`[with-cucumber-chat] xcode failure samples: ${failureSamples.join(" | ")}`);
    }

    return config;
  });
}

function withCucumberChatPod(config) {
  return withPodfile(config, (config) => {
    const podline = `  pod 'Socket.IO-Client-Swift', '~> 16.1'`;
    if (!config.modResults.contents.includes("Socket.IO-Client-Swift")) {
      config.modResults.contents = config.modResults.contents.replace(
        /use_expo_modules!\n/g,
        `use_expo_modules!\n${podline}\n`
      );
      console.log("[with-cucumber-chat] Podfile updated with Socket.IO-Client-Swift");
    } else {
      console.log("[with-cucumber-chat] Podfile already contains Socket.IO-Client-Swift");
    }
    return config;
  });
}

const withCucumberChat = (config) => {
  config = withCucumberChatCopy(config);
  config = withCucumberChatXcode(config);
  config = withCucumberChatPod(config);
  return config;
};

module.exports = withCucumberChat;
