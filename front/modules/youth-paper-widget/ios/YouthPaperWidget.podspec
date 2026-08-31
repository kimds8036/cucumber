require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'YouthPaperWidget'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = 'ucost'
  s.homepage       = 'https://github.com/kimds8036/cucumber'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/kimds8036/cucumber.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Widget Extension 타겟 소스는 targets/ 에 두고, 앱에 링크되는 브리지만 ios/ 에 둔다.
  s.source_files = '**/*.{h,m,mm,swift}'
  s.exclude_files = '**/YouthPaperWidgets/**'

  s.frameworks = 'WidgetKit', 'BackgroundTasks'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
