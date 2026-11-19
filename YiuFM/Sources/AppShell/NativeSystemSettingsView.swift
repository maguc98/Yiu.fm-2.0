import SwiftUI
import UIKit

struct NativeSystemSettingsView: View {
    @AppStorage("yiufm.native.system.animationSpeed") private var animationSpeed = 1.0
    @AppStorage("yiufm.native.system.targetFPS") private var targetFPS = 30
    @AppStorage("yiufm.native.system.reduceMotion") private var reduceMotion = false
    @AppStorage("yiufm.native.system.haptics") private var hapticsEnabled = true
    @AppStorage("yiufm.native.system.keepAwake") private var keepScreenAwake = false
    @AppStorage("yiufm.native.ui.autoHideDelay") private var autoHideDelay = 10

    var body: some View {
        Form {
            Section("动画") {
                HStack {
                    Text("动画速度")
                    Spacer()
                    Text(String(format: "%.2f×", animationSpeed))
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
                Slider(value: $animationSpeed, in: 0.25...2.5, step: 0.05)
                    .tint(Color(red: 0.42, green: 0.57, blue: 0.78))
                Toggle("减少动态效果", isOn: $reduceMotion)
                    .tint(Color(red: 0.42, green: 0.60, blue: 0.72))
            }

            Section("渲染") {
                Picker("视觉帧率上限", selection: $targetFPS) {
                    Text("15 FPS · 省电").tag(15)
                    Text("30 FPS · 平衡").tag(30)
                    Text("60 FPS · 流畅").tag(60)
                }
                .pickerStyle(.inline)

                HStack(spacing: 10) {
                    Image(systemName: "battery.100percent")
                        .foregroundStyle(Color(red: 0.35, green: 0.62, blue: 0.52))
                    Text("系统低电量模式开启时，视觉引擎仍会遵守这里设置的上限。")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }

            Section("界面") {
                HStack {
                    Text("自动隐藏 UI")
                    Spacer()
                    Text(autoHideDelay == 0 ? "关闭" : "\(autoHideDelay) 秒")
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
                Slider(value: Binding(
                    get: { Double(autoHideDelay) },
                    set: { autoHideDelay = Int($0.rounded()) }
                ), in: 0...10, step: 1)
                Text("播放时无操作会自动收起底部迷你条与悬浮控制中心；触碰屏幕即可恢复。设置为 0 秒则关闭。")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            Section("交互") {
                Toggle("触感反馈", isOn: $hapticsEnabled)
                    .tint(Color(red: 0.42, green: 0.60, blue: 0.72))
                Toggle("屏幕常亮", isOn: $keepScreenAwake)
                    .tint(Color(red: 0.42, green: 0.60, blue: 0.72))
                Text("开启后，应用处于前台时不会自动锁屏；切到后台或退出应用后会恢复系统默认行为。")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            Section("应用信息") {
                LabeledContent("应用版本", value: version)
                LabeledContent("系统版本", value: UIDevice.current.systemVersion)
                LabeledContent("界面架构", value: "SwiftUI 原生")
                LabeledContent("视觉绘制", value: "Core Graphics / Canvas")
                LabeledContent("音频播放", value: "AVFoundation")
            }

            Section {
                Button("恢复默认设置", role: .destructive) {
                    animationSpeed = 1
                    targetFPS = 30
                    reduceMotion = false
                    hapticsEnabled = true
                    keepScreenAwake = false
                }
            }
        }
        .navigationTitle("系统与性能")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var version: String {
        let marketing = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "2.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "—"
        return "\(marketing) (\(build))"
    }
}

enum NativeHaptics {
    static func selection(enabled: Bool) {
        guard enabled else { return }
        let generator = UISelectionFeedbackGenerator()
        generator.prepare()
        generator.selectionChanged()
    }

    static func impact(enabled: Bool, style: UIImpactFeedbackGenerator.FeedbackStyle = .light) {
        guard enabled else { return }
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.prepare()
        generator.impactOccurred()
    }
}
