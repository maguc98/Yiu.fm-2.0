import SwiftUI
import UIKit

struct NativeDeveloperToolsView: View {
    @ObservedObject var player: YiuAudioPlayer
    @AppStorage("yiufm.native.visual.engine") private var engineID = NativeVisualEngine.sonnet.rawValue
    @AppStorage("yiufm.native.system.targetFPS") private var targetFPS = 30
    @AppStorage("yiufm.native.system.animationSpeed") private var animationSpeed = 1.0
    @AppStorage("yiufm.native.system.reduceMotion") private var reduceMotion = false
    @State private var copied = false

    private var report: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown"
        let bundleID = Bundle.main.bundleIdentifier ?? "unknown"
        let engine = NativeVisualEngine(rawValue: engineID)?.title ?? "unknown"
        return """
        Yiu.fm Native Diagnostics
        App: \(version) (\(build))
        Bundle: \(bundleID)
        iOS: \(UIDevice.current.systemVersion)
        Device: \(UIDevice.current.model)
        UI: SwiftUI
        Visual rendering: SwiftUI Canvas
        Audio: AVFoundation / AVAudioPlayer
        WebKit view: not included in native app target
        Tracks: \(player.tracks.count)
        Lyrics: \(player.lyrics.count) lines loaded
        Playback: \(player.isPlaying ? "playing" : "paused")
        Engine: \(engine)
        Audio meter: \(String(format: "%.3f", player.audioLevel))
        Visual frame cap: \(targetFPS) FPS
        Animation speed: \(String(format: "%.2f", animationSpeed))x
        Reduce motion: \(reduceMotion ? "on" : "off")
        Low Power Mode: \(ProcessInfo.processInfo.isLowPowerModeEnabled ? "on" : "off")
        """
    }

    var body: some View {
        Form {
            Section("运行环境") {
                LabeledContent("应用版本", value: appVersion)
                LabeledContent("系统", value: "iOS \(UIDevice.current.systemVersion)")
                LabeledContent("设备", value: UIDevice.current.model)
                LabeledContent("界面", value: "SwiftUI")
                LabeledContent("视觉渲染", value: "Canvas")
                LabeledContent("音频", value: "AVFoundation")
                LabeledContent("WebKit", value: "未链接到原生目标")
            }

            Section("运行状态") {
                LabeledContent("曲库", value: "\(player.tracks.count) 首")
                LabeledContent("已载入歌词", value: "\(player.lyrics.count) 行")
                LabeledContent("播放状态", value: player.isPlaying ? "正在播放" : "已暂停")
                LabeledContent("当前引擎", value: NativeVisualEngine(rawValue: engineID)?.title ?? "商籁")
                LabeledContent("音频电平", value: String(format: "%.3f", player.audioLevel))
                LabeledContent("视觉帧率上限", value: "\(targetFPS) FPS")
                LabeledContent("低电量模式", value: ProcessInfo.processInfo.isLowPowerModeEnabled ? "开启" : "关闭")
            }

            Section("诊断") {
                Button {
                    UIPasteboard.general.string = report
                    NativeHaptics.impact(enabled: true, style: .light)
                    copied = true
                } label: {
                    Label(copied ? "已复制诊断报告" : "复制诊断报告", systemImage: copied ? "checkmark" : "doc.on.doc")
                }

                Text("报告只包含应用版本、系统环境、运行状态和视觉设置，不包含音频文件内容。")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            Section {
                Button("重置视觉引擎偏好", role: .destructive) {
                    engineID = NativeVisualEngine.sonnet.rawValue
                    targetFPS = 30
                    animationSpeed = 1
                    reduceMotion = false
                    copied = false
                }
            } footer: {
                Text("只重置视觉引擎和性能偏好，不会删除歌曲、歌词、背景图片或自定义封面。")
            }
        }
        .navigationTitle("开发者工具")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "2.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "—"
        return "\(version) (\(build))"
    }
}
