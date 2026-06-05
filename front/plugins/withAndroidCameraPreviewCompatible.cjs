const { withDangerousMod, createRunOncePlugin } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'ImplementationMode.COMPATIBLE';
const OLD_BLOCK = `private var previewView = PreviewView(context).apply {
    elevation = 0f
  }`;
const NEW_BLOCK = `private var previewView = PreviewView(context).apply {
    elevation = 0f
    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
  }`;

function patchExpoCameraViewKt(projectRoot) {
  const ktPath = path.join(
    projectRoot,
    'node_modules/expo-camera/android/src/main/java/expo/modules/camera/ExpoCameraView.kt',
  );
  if (!fs.existsSync(ktPath)) {
    console.warn(
      '[withAndroidCameraPreviewCompatible] expo-camera not found — npm install 후 prebuild 하세요.',
    );
    return;
  }
  let src = fs.readFileSync(ktPath, 'utf8');
  if (src.includes(MARKER)) {
    return;
  }
  if (!src.includes(OLD_BLOCK)) {
    console.warn(
      '[withAndroidCameraPreviewCompatible] ExpoCameraView.kt 형식이 달라 패치를 건너뜁니다.',
    );
    return;
  }
  fs.writeFileSync(ktPath, src.replace(OLD_BLOCK, NEW_BLOCK));
}

function withAndroidCameraPreviewCompatible(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      patchExpoCameraViewKt(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);
}

module.exports = (config) => {
  patchExpoCameraViewKt(path.join(__dirname, '..'));
  return createRunOncePlugin(
    withAndroidCameraPreviewCompatible,
    'withAndroidCameraPreviewCompatible',
  )(config);
};
