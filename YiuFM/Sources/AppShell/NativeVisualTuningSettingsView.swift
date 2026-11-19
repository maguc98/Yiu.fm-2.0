import SwiftUI

/// 原版视觉引擎的参数面板。所有控件都写入共享 AppStorage，首页与引擎预览即时读取。
struct NativeVisualTuningSettingsView: View {
    @AppStorage("yiufm.native.visual.engine") private var engineID = NativeVisualEngine.sonnet.rawValue

    // Sonnet
    @AppStorage("yiufm.native.sonnet.dynamicPerformance") private var sonnetDynamicPerformance = true
    @AppStorage("yiufm.native.sonnet.resolution") private var sonnetResolution = 1.0

    // Tempera
    @AppStorage("yiufm.native.tempera.glyphMotion") private var temperaGlyphMotion = 1.0
    @AppStorage("yiufm.native.tempera.settleStretch") private var temperaSettleStretch = 0.5
    @AppStorage("yiufm.native.tempera.depthOfField") private var temperaDepthOfField = 0.0
    @AppStorage("yiufm.native.tempera.depthPan") private var temperaDepthPan = 0.0
    @AppStorage("yiufm.native.tempera.glyphDepth") private var temperaGlyphDepth = 0.0
    @AppStorage("yiufm.native.tempera.grain") private var temperaGrain = 0.0
    @AppStorage("yiufm.native.tempera.contrast") private var temperaContrast = 1.0
    @AppStorage("yiufm.native.tempera.rgbShift") private var temperaRGBShift = 0.0
    @AppStorage("yiufm.native.tempera.vignette") private var temperaVignette = 0.0
    @AppStorage("yiufm.native.tempera.lensDistortion") private var temperaLensDistortion = 0.0
    @AppStorage("yiufm.native.tempera.textureResolution") private var temperaTextureResolution = 1.0
    @AppStorage("yiufm.native.tempera.colorMode") private var temperaColorMode = "duo"
    @AppStorage("yiufm.native.tempera.wholeLine") private var temperaWholeLine = false
    @AppStorage("yiufm.native.tempera.showBlocks") private var temperaShowBlocks = true
    @AppStorage("yiufm.native.tempera.showDecor") private var temperaShowDecor = true
    @AppStorage("yiufm.native.tempera.showCornerMarks") private var temperaShowCornerMarks = true
    @AppStorage("yiufm.native.tempera.textInversion") private var temperaTextInversion = false
    @AppStorage("yiufm.native.tempera.customColors") private var temperaCustomColors = false

    // Lumiere
    @AppStorage("yiufm.native.lumiere.lightIntensity") private var lumiereLightIntensity = 1.0
    @AppStorage("yiufm.native.lumiere.audioResponse") private var lumiereAudioResponse = 1.0
    @AppStorage("yiufm.native.lumiere.fogDensity") private var lumiereFogDensity = 1.0
    @AppStorage("yiufm.native.lumiere.fogOctaves") private var lumiereFogOctaves = 5
    @AppStorage("yiufm.native.lumiere.darkField") private var lumiereDarkField = 0.75
    @AppStorage("yiufm.native.lumiere.unlitOpacity") private var lumiereUnlitOpacity = 0.22
    @AppStorage("yiufm.native.lumiere.bloom") private var lumiereBloom = 1.0
    @AppStorage("yiufm.native.lumiere.textBloom") private var lumiereTextBloom = 1.0
    @AppStorage("yiufm.native.lumiere.moteAmount") private var lumiereMoteAmount = 1.0
    @AppStorage("yiufm.native.lumiere.windowNeighbors") private var lumiereWindowNeighbors = 2
    @AppStorage("yiufm.native.lumiere.decay") private var lumiereDecay = 1.0
    @AppStorage("yiufm.native.lumiere.echo") private var lumiereEcho = 1.0
    @AppStorage("yiufm.native.lumiere.themeColorMix") private var lumiereThemeColorMix = 0.3
    @AppStorage("yiufm.native.lumiere.quality") private var lumiereQuality = "balanced"
    @AppStorage("yiufm.native.lumiere.resolution") private var lumiereResolution = "0"
    @AppStorage("yiufm.native.lumiere.lineArt") private var lumiereLineArt = true
    @AppStorage("yiufm.native.lumiere.frontBokeh") private var lumiereFrontBokeh = true
    @AppStorage("yiufm.native.lumiere.trails") private var lumiereTrails = true
    @AppStorage("yiufm.native.lumiere.hideTrails") private var lumiereHideTrails = false
    @AppStorage("yiufm.native.lumiere.overlayFrame") private var lumiereOverlayFrame = true
    @AppStorage("yiufm.native.lumiere.textOnly") private var lumiereTextOnly = false
    @AppStorage("yiufm.native.lumiere.keywordColors") private var lumiereKeywordColors = true
    @AppStorage("yiufm.native.lumiere.themeIcons") private var lumiereThemeIcons = true
    @AppStorage("yiufm.native.lumiere.seamlessTransitions") private var lumiereSeamlessTransitions = false

    // Partita
    @AppStorage("yiufm.native.partita.staggerMin") private var partitaStaggerMin = 20.0
    @AppStorage("yiufm.native.partita.staggerMax") private var partitaStaggerMax = 100.0
    @AppStorage("yiufm.native.partita.animation") private var partitaAnimation = "normal"
    @AppStorage("yiufm.native.partita.font") private var partitaFont = "serif"
    @AppStorage("yiufm.native.partita.showText") private var partitaShowText = true
    @AppStorage("yiufm.native.partita.semanticLayout") private var partitaSemanticLayout = true
    @AppStorage("yiufm.native.partita.guideLines") private var partitaGuideLines = true

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

    private var engine: NativeVisualEngine {
        NativeVisualEngine(rawValue: engineID) ?? .sonnet
    }

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

            engineSpecificSettings

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

    @ViewBuilder
    private var engineSpecificSettings: some View {
        switch engine {
        case .sonnet:
            Section("商籁 · 动效") {
                Toggle("动态性能调节", isOn: $sonnetDynamicPerformance)
                valueRow("渲染分辨率", value: $sonnetResolution, range: 0.5...2, suffix: "×")
            }

        case .tempera:
            Section("凝彩 · 动效") {
                valueRow("字动强度", value: $temperaGlyphMotion, range: 0...2, suffix: "%", multiplier: 100)
                valueRow("落定拉伸", value: $temperaSettleStretch, range: 0...1, suffix: "%", multiplier: 100)
                valueRow("景深模糊", value: $temperaDepthOfField, range: 0...1, suffix: "%", multiplier: 100)
                valueRow("景深平移", value: $temperaDepthPan, range: 0...1, suffix: "%", multiplier: 100)
                valueRow("字形深度", value: $temperaGlyphDepth, range: 0...1, suffix: "%", multiplier: 100)
                valueRow("颗粒", value: $temperaGrain, range: 0...1, suffix: "%", multiplier: 100)
                valueRow("对比度", value: $temperaContrast, range: 0.5...1.5, suffix: "%", multiplier: 100)
                valueRow("RGB 偏移", value: $temperaRGBShift, range: 0...1, suffix: "%", multiplier: 100)
                valueRow("暗角", value: $temperaVignette, range: 0...1, suffix: "%", multiplier: 100)
                valueRow("镜头畸变", value: $temperaLensDistortion, range: 0...1, suffix: "%", multiplier: 100)
                valueRow("渲染分辨率", value: $temperaTextureResolution, range: 0.5...4, suffix: "×")
                Picker("配色模式", selection: $temperaColorMode) {
                    Text("双色").tag("duo")
                    Text("单色").tag("mono")
                    Text("渐变").tag("gradient")
                }
                Toggle("整句歌词", isOn: $temperaWholeLine)
                Toggle("背景色块", isOn: $temperaShowBlocks)
                Toggle("装饰", isOn: $temperaShowDecor)
                Toggle("角标", isOn: $temperaShowCornerMarks)
                Toggle("文字反相", isOn: $temperaTextInversion)
                Toggle("自定义颜色", isOn: $temperaCustomColors)
            }

        case .lumiere:
            Section("绘光 · 动效") {
                valueRow("光照强度", value: $lumiereLightIntensity, range: 0...2, suffix: "%", multiplier: 100)
                valueRow("声音响应", value: $lumiereAudioResponse, range: 0...2, suffix: "%", multiplier: 100)
                valueRow("雾密度", value: $lumiereFogDensity, range: 0...2, suffix: "%", multiplier: 100)
                Stepper("雾层数：\(lumiereFogOctaves)", value: $lumiereFogOctaves, in: 1...6)
                valueRow("暗场", value: $lumiereDarkField, range: 0...1, suffix: "%", multiplier: 100)
                valueRow("未点亮透明度", value: $lumiereUnlitOpacity, range: 0...1, suffix: "%", multiplier: 100)
                valueRow("辉光", value: $lumiereBloom, range: 0...2, suffix: "%", multiplier: 100)
                valueRow("文字辉光", value: $lumiereTextBloom, range: 0...2, suffix: "%", multiplier: 100)
                valueRow("光斑数量", value: $lumiereMoteAmount, range: 0...3, suffix: "%", multiplier: 100)
                Stepper("邻句窗口：\(lumiereWindowNeighbors)", value: $lumiereWindowNeighbors, in: 0...4)
                valueRow("衰减", value: $lumiereDecay, range: 0...3, suffix: "%", multiplier: 100)
                valueRow("回声", value: $lumiereEcho, range: 0...3, suffix: "%", multiplier: 100)
                valueRow("主题色混合", value: $lumiereThemeColorMix, range: 0...1, suffix: "%", multiplier: 100)
                Picker("画质", selection: $lumiereQuality) {
                    Text("完整").tag("full")
                    Text("平衡").tag("balanced")
                    Text("低").tag("low")
                }
                Picker("分辨率", selection: $lumiereResolution) {
                    Text("自动").tag("0")
                    Text("1×").tag("1")
                    Text("1.5×").tag("1.5")
                    Text("2×").tag("2")
                }
                Toggle("线条艺术", isOn: $lumiereLineArt)
                Toggle("前景虚化", isOn: $lumiereFrontBokeh)
                Toggle("拖尾", isOn: $lumiereTrails)
                Toggle("隐藏拖尾", isOn: $lumiereHideTrails)
                Toggle("边框", isOn: $lumiereOverlayFrame)
                Toggle("仅显示文字", isOn: $lumiereTextOnly)
                Toggle("关键词着色", isOn: $lumiereKeywordColors)
                Toggle("主题图标", isOn: $lumiereThemeIcons)
                Toggle("无缝过渡", isOn: $lumiereSeamlessTransitions)
            }

        case .partita:
            Section("云阶 · 动效") {
                valueRow("错位·最小", value: $partitaStaggerMin, range: 0...180, suffix: " px")
                valueRow("错位·最大", value: $partitaStaggerMax, range: 0...180, suffix: " px")
                Picker("动画强度", selection: $partitaAnimation) {
                    Text("平静").tag("calm")
                    Text("标准").tag("normal")
                    Text("混乱").tag("chaotic")
                }
                Picker("字体", selection: $partitaFont) {
                    Text("黑体").tag("sans")
                    Text("衬线").tag("serif")
                    Text("等宽").tag("mono")
                }
                Toggle("显示文字", isOn: $partitaShowText)
                Toggle("语义分词排版", isOn: $partitaSemanticLayout)
                Toggle("显示参考线", isOn: $partitaGuideLines)
            }

        case .fume:
            Section("浮墨 · 动效") {
                Text("浮墨使用通用动效强度、镜头强度、密度与配色参数。")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
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
