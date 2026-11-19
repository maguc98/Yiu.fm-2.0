import SwiftUI

/// 原版视觉引擎的参数面板。所有控件都写入共享 AppStorage，首页与引擎预览即时读取。
struct NativeVisualTuningSettingsView: View {
    @AppStorage("yiufm.native.visual.motionStrength") private var motionStrength = 1.0
    @AppStorage("yiufm.native.visual.cameraIntensity") private var cameraIntensity = 1.0
    @AppStorage("yiufm.native.visual.graphicDensity") private var graphicDensity = 0.55
    @AppStorage("yiufm.native.visual.lyricsFontScale") private var lyricsFontScale = 1.0
    @AppStorage("yiufm.native.visual.edgeDispersion") private var edgeDispersion = 0.8
    @AppStorage("yiufm.native.visual.edgeBand") private var edgeBand = 0.7
    @AppStorage("yiufm.native.visual.rgbEdgeIntensity") private var rgbEdgeIntensity = 0.7
    @AppStorage("yiufm.native.visual.rgbEdgeWidth") private var rgbEdgeWidth = 14.0
    @AppStorage("yiufm.native.visual.rgbEdgeRate") private var rgbEdgeRate = 1.0

    @AppStorage("yiufm.native.visual.primaryColor") private var primaryColorHex = "#FFFFFF"
    @AppStorage("yiufm.native.visual.secondaryColor") private var secondaryColorHex = "#AFC5FF"
    @AppStorage("yiufm.native.visual.accentColor") private var accentColorHex = "#8FB0FF"
    @AppStorage("yiufm.native.visual.backgroundColor") private var backgroundColorHex = "#08080C"

    @AppStorage("yiufm.native.visual.showGuide") private var showGuide = false
    @AppStorage("yiufm.native.visual.postProcessEnabled") private var postProcessEnabled = true
    @AppStorage("yiufm.native.visual.showBackgroundMG") private var showBackgroundMG = true
    @AppStorage("yiufm.native.visual.showFixedGeometry") private var showFixedGeometry = true
    @AppStorage("yiufm.native.visual.showBackgroundDecor") private var showBackgroundDecor = true
    @AppStorage("yiufm.native.visual.showGiantText") private var showGiantText = false
    @AppStorage("yiufm.native.visual.showOnlyText") private var showOnlyText = false
    @AppStorage("yiufm.native.visual.enableTransitions") private var enableTransitions = true
    @AppStorage("yiufm.native.visual.interludeDots") private var interludeDots = true
    @AppStorage("yiufm.native.visual.rgbEdge") private var rgbEdge = false

    var body: some View {
        Form {
            Section {
                valueRow("动效强度", value: $motionStrength, range: 0...2, suffix: "%", multiplier: 100)
                valueRow("镜头强度", value: $cameraIntensity, range: 0...2, suffix: "%", multiplier: 100)
                valueRow("图形密度", value: $graphicDensity, range: 0.1...1.5, suffix: "%", multiplier: 100)
                valueRow("歌词字号", value: $lyricsFontScale, range: 0.5...2, suffix: "%", multiplier: 100)
            } header: {
                Text("动态性能与构图")
            } footer: {
                Text("这些参数会直接影响首页和视觉引擎预览中的原生 Canvas 渲染。")
            }

            Section("后处理光效") {
                valueRow("色散强度", value: $edgeDispersion, range: 0...2, suffix: "%", multiplier: 100)
                valueRow("色散范围", value: $edgeBand, range: 0.1...1, suffix: "%", multiplier: 100)
                valueRow("RGB 色闪强度", value: $rgbEdgeIntensity, range: 0...1, suffix: "%", multiplier: 100)
                valueRow("RGB 色闪范围", value: $rgbEdgeWidth, range: 4...40, suffix: " px")
                valueRow("RGB 色闪频率", value: $rgbEdgeRate, range: 0.2...3, suffix: "×")
                Toggle("启用后处理滤镜", isOn: $postProcessEnabled)
                Toggle("屏幕边缘 RGB 色闪", isOn: $rgbEdge)
            }

            Section("视觉颜色") {
                colorRow("文字主色", hex: $primaryColorHex)
                colorRow("次要色", hex: $secondaryColorHex)
                colorRow("强调 / 光效", hex: $accentColorHex)
                colorRow("背景辅助色", hex: $backgroundColorHex)
            }

            Section("画面元素") {
                Toggle("背景动态图形", isOn: $showBackgroundMG)
                Toggle("固定几何", isOn: $showFixedGeometry)
                Toggle("背景装饰", isOn: $showBackgroundDecor)
                Toggle("巨型装饰字", isOn: $showGiantText)
                Toggle("只显示文字", isOn: $showOnlyText)
                Toggle("转场动画", isOn: $enableTransitions)
                Toggle("间奏圆点", isOn: $interludeDots)
                Toggle("显示光效指引", isOn: $showGuide)
            }

            Section {
                Button("恢复默认设置", role: .destructive) {
                    motionStrength = 1
                    cameraIntensity = 1
                    graphicDensity = 0.55
                    lyricsFontScale = 1
                    edgeDispersion = 0.8
                    edgeBand = 0.7
                    rgbEdgeIntensity = 0.7
                    rgbEdgeWidth = 14
                    rgbEdgeRate = 1
                    primaryColorHex = "#FFFFFF"
                    secondaryColorHex = "#AFC5FF"
                    accentColorHex = "#8FB0FF"
                    backgroundColorHex = "#08080C"
                    showGuide = false
                    postProcessEnabled = true
                    showBackgroundMG = true
                    showFixedGeometry = true
                    showBackgroundDecor = true
                    showGiantText = false
                    showOnlyText = false
                    enableTransitions = true
                    interludeDots = true
                    rgbEdge = false
                }
            } footer: {
                Text("重置只恢复视觉参数，不会删除歌曲、歌词、背景图片或文字项目。")
            }
        }
        .navigationTitle("视觉调节")
        .navigationBarTitleDisplayMode(.inline)
        .tint(Color(red: 0.56, green: 0.68, blue: 0.93))
    }

    private func valueRow(
        _ title: String,
        value: Binding<Double>,
        range: ClosedRange<Double>,
        suffix: String,
        multiplier: Double = 1
    ) -> some View {
        VStack(spacing: 7) {
            HStack {
                Text(title)
                Spacer()
                Text(String(format: multiplier == 1 ? "%.1f%@" : "%.0f%@", value.wrappedValue * multiplier, suffix))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
            Slider(value: value, in: range)
        }
    }

    private func colorRow(_ title: String, hex: Binding<String>) -> some View {
        ColorPicker(
            title,
            selection: Binding(
                get: { Color(nativeHex: hex.wrappedValue) },
                set: { hex.wrappedValue = $0.nativeHex }
            ),
            supportsOpacity: false
        )
    }
}
