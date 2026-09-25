require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'YouthPaperTabBar'
  s.version        = package['version']
  s.summary        = 'Youth Paper iOS native main tab bar'
  s.description    = 'Youth Paper iOS native main tab bar'
  s.license        = 'UNLICENSED'
  s.author         = 'ucost'
  s.homepage       = 'https://github.com/kimds8036/cucumber'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/kimds8036/cucumber.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift}'
  # @expo/vector-icons 폰트 사본. 탭 아이콘 글리프를 네이티브에서 그린다.
  s.resource_bundles = { 'YouthPaperTabBarFonts' => ['Fonts/*.ttf'] }

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
