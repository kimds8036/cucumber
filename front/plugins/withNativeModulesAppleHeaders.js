const { withPodfile } = require('@expo/config-plugins');

const MARKER = 'static frameworks: Public headers often nest';

const FIX = `
    # static frameworks: Public headers often nest as A/B/A/B/file.h while sources
    # import <A/B/file.h>. Add the intermediate dirs so Release/Archive resolves them.
    public_root = File.join(installer.sandbox.root, 'Headers', 'Public')
    extra_paths = []
    if File.directory?(public_root)
      Dir.children(public_root).each do |pod|
        pod_path = File.join(public_root, pod)
        next unless File.directory?(pod_path)
        Dir.glob(File.join(pod_path, '**', '*')).each do |dirpath|
          next unless File.directory?(dirpath)
          rel = dirpath.sub(pod_path + File::SEPARATOR, '')
          parts = rel.split(File::SEPARATOR)
          (1..(parts.length / 2)).each do |k|
            if parts[0, k] == parts[k, k]
              extra_paths << %("#{File.join(pod_path, *parts[0, k])}")
              break
            end
          end
        end
      end
    end
    extra_paths.uniq!
    # platform/cxx|ios 및 iosswitch 등 플랫폼 변형 디렉터리
    Dir.glob(File.join(public_root, '**', 'platform', '{cxx,ios}')).each do |platform_dir|
      next unless File.directory?(platform_dir)
      extra_paths << %("#{platform_dir}")
    end
    Dir.glob(File.join(public_root, '**', 'ioswitch')).each do |platform_dir|
      next unless File.directory?(platform_dir)
      extra_paths << %("#{platform_dir}")
    end
    # 헤더 파일 기준으로 마지막 /react/renderer/ · /ReactCommon/ 앞을 include path에 추가
    Dir.glob(File.join(public_root, '**', '*.{h,hpp}')).each do |header|
      %w[/react/renderer/ /ReactCommon/].each do |marker|
        idx = header.rindex(marker)
        next unless idx && idx > 0
        extra_paths << %("#{header[0...idx]}")
      end
    end
    extra_paths.uniq!
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        paths = bc.build_settings['HEADER_SEARCH_PATHS'] || ['$(inherited)']
        paths = [paths] unless paths.is_a?(Array)
        extra_paths.each do |p|
          paths << p unless paths.include?(p)
        end
        bc.build_settings['HEADER_SEARCH_PATHS'] = paths
      end
    end
`;

/**
 * RN 0.86 + use_frameworks static 에서 Archive 시
 * RCTTurboModuleWithJSIBindings.h / ReactPrimitives.h 등 이중 중첩 헤더를 못 찾는 문제 보정.
 */
module.exports = function withNativeModulesAppleHeaders(config) {
  return withPodfile(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes(MARKER)) {
      return cfg;
    }

    // Remove older narrow fix if present
    contents = contents.replace(
      /\n\s*# static frameworks: headers land in ReactCommon[\s\S]*?bc\.build_settings\['HEADER_SEARCH_PATHS'\] = paths\n\s*end\n\s*end\n\s*end\n/,
      '\n',
    );

    const anchor =
      /(:ccache_enabled\s*=>\s*ccache_enabled\?\(podfile_properties\),\s*\n\s*\))\n/;
    if (!anchor.test(contents)) {
      console.warn(
        '[withNativeModulesAppleHeaders] post_install anchor not found — skip',
      );
      return cfg;
    }

    contents = contents.replace(anchor, `$1\n${FIX}\n`);
    cfg.modResults.contents = contents;
    return cfg;
  });
};
