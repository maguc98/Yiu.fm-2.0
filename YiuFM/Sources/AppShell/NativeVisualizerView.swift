import SwiftUI

enum NativeVisualEngine: String, CaseIterable, Identifiable {
    case sonnet
    case tempera
    case lumiere
    case partita
    case fume

    var id: String { rawValue }
    var title: String {
        switch self {
        case .sonnet: return "商籁"
        case .tempera: return "凝彩"
        case .lumiere: return "绘光"
        case .partita: return "云阶"
        case .fume: return "浮墨"
        }
    }
    var subtitle: String {
        switch self {
        case .sonnet: return "文字 · 节奏 · 留白"
        case .tempera: return "景深 · 层次 · 柔焦"
        case .lumiere: return "光线 · 粒子 · 呼吸"
        case .partita: return "几何 · 编排 · 动态"
        case .fume: return "水墨 · 流体 · 扩散"
        }
    }
    var symbol: String {
        switch self {
        case .sonnet: return "text.aligncenter"
        case .tempera: return "circle.hexagongrid"
        case .lumiere: return "sparkles"
        case .partita: return "square.grid.3x3"
        case .fume: return "drop.fill"
        }
    }
}

struct NativeVisualizerView: View {
    @ObservedObject var player: YiuAudioPlayer
    @ObservedObject var appearance: NativeAppearanceStore
    @AppStorage("yiufm.native.visual.engine") private var engineID = NativeVisualEngine.sonnet.rawValue
    @AppStorage("yiufm.native.visual.lyricScale") private var lyricScale = 1.0
    @AppStorage("yiufm.native.visual.intensity") private var intensity = 0.85
    @AppStorage("yiufm.native.visual.audioReactive") private var audioReactive = true
    @AppStorage("yiufm.native.typography.family") private var fontFamilyID = NativeFontFamily.serif.rawValue
    @AppStorage("yiufm.native.typography.scale") private var typographyScale = 1.0
    @AppStorage("yiufm.native.typography.weight") private var fontWeightValue = 0.78
    @AppStorage("yiufm.native.typography.color") private var textColorHex = "#FFFFFF"
    @AppStorage("yiufm.native.system.targetFPS") private var targetFPS = 30
    @AppStorage("yiufm.native.system.animationSpeed") private var animationSpeed = 1.0
    @AppStorage("yiufm.native.system.reduceMotion") private var reduceMotion = false
    @AppStorage("yiufm.native.system.haptics") private var hapticsEnabled = true
    @State private var showingSettings = false

    private var engine: NativeVisualEngine { NativeVisualEngine(rawValue: engineID) ?? .sonnet }
    private var lyricFontFamily: NativeFontFamily { NativeFontFamily(rawValue: fontFamilyID) ?? .serif }
    private var lyricColor: Color { Color(nativeHex: textColorHex) }
    private var lyricFontWeight: Font.Weight {
        switch fontWeightValue {
        case ..<0.48: return .medium
        case ..<0.62: return .semibold
        case ..<0.78: return .bold
        case ..<0.91: return .heavy
        default: return .black
        }
    }

    var body: some View {
        ZStack {
            NativeAppBackground(appearance: appearance)
            NativeVisualBackdrop(engine: engine, audioLevel: player.audioLevel, isPlaying: player.isPlaying, intensity: intensity, audioReactive: audioReactive, targetFPS: targetFPS, animationSpeed: animationSpeed, reduceMotion: reduceMotion)
                .opacity(appearance.backgroundImage != nil || appearance.backgroundMode == .gradient ? 0.84 : 1)
                .ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 22) {
                    engineHeader
                    enginePicker
                    lyricComposition
                    playbackFooter
                }
                .padding(.horizontal, 20)
                .padding(.top, 18)
                .padding(.bottom, 34)
                .frame(maxWidth: 620)
                .frame(maxWidth: .infinity)
            }
        }
        .navigationTitle("视觉引擎")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showingSettings = true } label: {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white)
                }
                .accessibilityLabel("视觉设置")
            }
        }
        .sheet(isPresented: $showingSettings) {
            NativeVisualizerSettingsSheet(
                lyricScale: $lyricScale,
                intensity: $intensity,
                audioReactive: $audioReactive
            )
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
    }

    private var engineHeader: some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: engine.symbol)
                .font(.system(size: 19, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 46, height: 46)
                .background(.white.opacity(0.16), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(.white.opacity(0.34), lineWidth: 1)
                }

            VStack(alignment: .leading, spacing: 3) {
                Text(engine.title)
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                Text(engine.subtitle)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.66))
            }
            Spacer()
            Text("NATIVE")
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .tracking(1.4)
                .foregroundStyle(.white.opacity(0.72))
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(.white.opacity(0.12), in: Capsule())
        }
    }

    private var enginePicker: some View {
        HStack(spacing: 8) {
            ForEach(NativeVisualEngine.allCases) { item in
                Button {
                    NativeHaptics.selection(enabled: hapticsEnabled)
                    withAnimation(.spring(response: 0.42, dampingFraction: 0.82)) {
                        engineID = item.rawValue
                    }
                } label: {
                    VStack(spacing: 7) {
                        Image(systemName: item.symbol)
                            .font(.system(size: 15, weight: .semibold))
                        Text(item.title)
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundStyle(engine == item ? Color(red: 0.16, green: 0.21, blue: 0.31) : .white.opacity(0.78))
                    .frame(maxWidth: .infinity)
                    .frame(height: 66)
                    .background {
                        RoundedRectangle(cornerRadius: 17, style: .continuous)
                            .fill(engine == item ? .white.opacity(0.94) : .white.opacity(0.10))
                    }
                    .overlay {
                        RoundedRectangle(cornerRadius: 17, style: .continuous)
                            .strokeBorder(.white.opacity(engine == item ? 0.92 : 0.22), lineWidth: 1)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(engine == item ? .isSelected : [])
            }
        }
    }

    private var lyricComposition: some View {
        VStack(spacing: 18) {
            HStack(spacing: 6) {
                Circle()
                    .fill(player.isPlaying ? Color(red: 0.62, green: 0.91, blue: 0.78) : .white.opacity(0.55))
                    .frame(width: 6, height: 6)
                Text(player.isPlaying ? "正在随音乐律动" : "等待播放")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.7))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(.white.opacity(0.10), in: Capsule())

            if player.lyrics.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "text.quote")
                        .font(.system(size: 35, weight: .light))
                        .foregroundStyle(.white.opacity(0.7))
                    Text(player.currentTrack?.title ?? "让文字进入光与节奏")
                        .font(.system(size: 19, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                    Text("导入同名 LRC 歌词后，原生视觉舞台会跟随歌词时间轴变化。")
                        .font(.system(size: 12))
                        .foregroundStyle(.white.opacity(0.66))
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, minHeight: 250)
            } else {
                VStack(spacing: 22) {
                    if player.currentLyricIndex > 0 {
                        Text(player.lyrics[player.currentLyricIndex - 1].text)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.white.opacity(0.32))
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                    }

                    activeLyric
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .id(player.currentLyricIndex)
                        .transition(.opacity.combined(with: .scale(scale: 0.97)))

                    if player.currentLyricIndex + 1 < player.lyrics.count {
                        Text(player.lyrics[player.currentLyricIndex + 1].text)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.white.opacity(0.42))
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 250)
                .animation(.easeInOut(duration: 0.32), value: player.currentLyricIndex)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 26)
        .background(.white.opacity(0.075), in: RoundedRectangle(cornerRadius: 28, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .strokeBorder(.white.opacity(0.20), lineWidth: 1)
        }
        .shadow(color: .black.opacity(engine == .tempera ? 0.28 : 0.12), radius: engine == .tempera ? 28 : 16, x: 0, y: 12)
    }

    @ViewBuilder
    private var activeLyric: some View {
        if let lyric = player.currentLyric {
            let isWordTimed = lyric.wordTimes?.count == lyric.text.count
            if isWordTimed, let times = lyric.wordTimes {
                let elapsed = player.currentTime - player.currentLyricsOffset
                HStack(spacing: 0) {
                    ForEach(Array(lyric.text.enumerated()), id: \.offset) { index, character in
                        Text(String(character))
                            .font(.system(size: activeFontSize, weight: lyricFontWeight, design: lyricFontFamily.design))
                            .foregroundStyle(times[index] <= elapsed ? lyricColor : lyricColor.opacity(0.38))
                    }
                }
                .multilineTextAlignment(.center)
                .shadow(color: engine == .lumiere ? activeColor.opacity(0.65) : .clear, radius: 15)
            } else {
                Text(lyric.text)
                    .font(.system(size: activeFontSize, weight: .bold, design: engine == .sonnet ? .serif : .rounded))
                    .foregroundStyle(lyricColor)
                    .multilineTextAlignment(.center)
                    .lineSpacing(engine == .partita ? 12 : 5)
                    .shadow(color: engine == .lumiere ? activeColor.opacity(0.7) : .black.opacity(engine == .tempera ? 0.35 : 0.10), radius: engine == .lumiere ? 18 : 6, x: 0, y: 3)
            }
        } else {
            Text(" ")
                .font(.system(size: activeFontSize, weight: .bold))
        }
    }

    private var playbackFooter: some View {
        VStack(spacing: 12) {
            HStack {
                Text(player.currentTrack?.title ?? "未选择歌曲")
                    .lineLimit(1)
                Spacer()
                Text("\(player.formattedTime(player.currentTime)) / \(player.formattedTime(player.duration))")
                    .monospacedDigit()
            }
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(.white.opacity(0.76))

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule().fill(.white.opacity(0.18))
                    Capsule()
                        .fill(.white.opacity(0.88))
                        .frame(width: geometry.size.width * CGFloat(progress))
                }
            }
            .frame(height: 4)

            HStack {
                Text("五种原生视觉风格")
                Spacer()
                Text("音频驱动 · 歌词同步")
            }
            .font(.system(size: 9, weight: .semibold))
            .foregroundStyle(.white.opacity(0.48))
        }
        .padding(.horizontal, 2)
    }

    private var progress: Double {
        guard player.duration > 0 else { return 0 }
        return min(1, max(0, player.currentTime / player.duration))
    }

    private var activeFontSize: CGFloat {
        switch engine {
        case .sonnet: return CGFloat(29 * lyricScale * typographyScale)
        case .tempera: return CGFloat(27 * lyricScale * typographyScale)
        case .lumiere: return CGFloat(28 * lyricScale * typographyScale)
        case .partita: return CGFloat(26 * lyricScale * typographyScale)
        case .fume: return 28 * lyricScale * typographyScale
        }
    }

    private var activeColor: Color {
        switch engine {
        case .sonnet: return Color(red: 0.94, green: 0.91, blue: 0.82)
        case .tempera: return Color(red: 0.83, green: 0.88, blue: 1.0)
        case .lumiere: return Color(red: 1.0, green: 0.83, blue: 0.58)
        case .partita: return Color(red: 0.69, green: 0.94, blue: 0.82)
        case .fume: return Color(red: 0.89, green: 0.81, blue: 0.67)
        }
    }
}

private struct NativeVisualBackdrop: View {
    let engine: NativeVisualEngine
    let audioLevel: Double
    let isPlaying: Bool
    let intensity: Double
    let audioReactive: Bool
    let targetFPS: Int
    let animationSpeed: Double
    let reduceMotion: Bool

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / Double(max(15, min(60, targetFPS))), paused: !isPlaying || reduceMotion)) { timeline in
            Canvas { context, size in
                let time = timeline.date.timeIntervalSinceReferenceDate * animationSpeed
                let pulse = audioReactive ? min(1, max(0, audioLevel * intensity)) : 0
                drawBase(in: &context, size: size)
                switch engine {
                case .sonnet:
                    drawSonnet(in: &context, size: size, time: time, pulse: pulse)
                case .tempera:
                    drawTempera(in: &context, size: size, time: time, pulse: pulse)
                case .lumiere:
                    drawLumiere(in: &context, size: size, time: time, pulse: pulse)
                case .partita:
                    drawPartita(in: &context, size: size, time: time, pulse: pulse)
                case .fume:
                    drawFume(in: &context, size: size, time: time, pulse: pulse)
                }
            }
        }
    }

    private func drawBase(in context: inout GraphicsContext, size: CGSize) {
        let rect = CGRect(origin: .zero, size: size)
        let colors: [Color]
        switch engine {
        case .sonnet:
            colors = [Color(red: 0.09, green: 0.13, blue: 0.20), Color(red: 0.06, green: 0.08, blue: 0.13)]
        case .tempera:
            colors = [Color(red: 0.16, green: 0.19, blue: 0.31), Color(red: 0.06, green: 0.08, blue: 0.15)]
        case .lumiere:
            colors = [Color(red: 0.19, green: 0.14, blue: 0.28), Color(red: 0.06, green: 0.08, blue: 0.17)]
        case .partita:
            colors = [Color(red: 0.08, green: 0.19, blue: 0.22), Color(red: 0.05, green: 0.08, blue: 0.15)]
        case .fume:
            colors = [Color(red: 0.19, green: 0.17, blue: 0.15), Color(red: 0.06, green: 0.07, blue: 0.09)]
        }
        context.fill(
            Path(rect),
            with: .linearGradient(
                Gradient(colors: colors),
                startPoint: .zero,
                endPoint: CGPoint(x: size.width, y: size.height)
            )
        )
    }

    private func drawSonnet(in context: inout GraphicsContext, size: CGSize, time: TimeInterval, pulse: Double) {
        let width = Double(size.width)
        let height = Double(size.height)
        let inset = width * 0.11
        for index in 0..<9 {
            let y = height * (0.18 + Double(index) * 0.082)
            let phase = sin(time * 0.35 + Double(index) * 0.7)
            let barWidth = width * (0.25 + 0.19 * abs(phase)) * (index.isMultiple(of: 3) ? 1.0 : 0.62)
            let x = inset + (width - inset * 2 - barWidth) * (0.5 + 0.28 * phase)
            var path = Path()
            path.move(to: CGPoint(x: CGFloat(x), y: CGFloat(y)))
            path.addLine(to: CGPoint(x: CGFloat(x + barWidth), y: CGFloat(y)))
            context.stroke(path, with: .color(.white.opacity(0.055 + pulse * 0.05)), lineWidth: 1)
        }
        for index in 0..<24 {
            let x = width * (Double(index) + 0.5) / 24
            let y = height * (0.10 + 0.8 * (0.5 + 0.5 * sin(time * 0.22 + Double(index) * 1.7)))
            let radius = 1.1 + pulse * 2.2
            let dot = CGRect(x: CGFloat(x), y: CGFloat(y), width: CGFloat(radius), height: CGFloat(radius))
            context.fill(Path(ellipseIn: dot), with: .color(.white.opacity(0.16)))
        }
    }

    private func drawTempera(in context: inout GraphicsContext, size: CGSize, time: TimeInterval, pulse: Double) {
        let width = Double(size.width)
        let height = Double(size.height)
        let centers: [(Double, Double, Double, Color)] = [
            (0.22, 0.25, 0.42, Color(red: 0.42, green: 0.53, blue: 0.86)),
            (0.78, 0.36, 0.38, Color(red: 0.70, green: 0.43, blue: 0.70)),
            (0.44, 0.82, 0.48, Color(red: 0.30, green: 0.67, blue: 0.68))
        ]
        for (index, item) in centers.enumerated() {
            let sway = sin(time * 0.22 + Double(index) * 2.0)
            let centerX = width * (item.0 + sway * 0.045)
            let centerY = height * (item.1 + cos(time * 0.18 + Double(index)) * 0.035)
            let radius = width * (item.2 + pulse * 0.10)
            let colors = [item.3.opacity(0.42 + pulse * 0.18), item.3.opacity(0.12), .clear]
            let point = CGPoint(x: CGFloat(centerX), y: CGFloat(centerY))
            let rect = CGRect(
                x: CGFloat(centerX - radius),
                y: CGFloat(centerY - radius),
                width: CGFloat(radius * 2),
                height: CGFloat(radius * 2)
            )
            context.fill(
                Path(ellipseIn: rect),
                with: .radialGradient(
                    Gradient(colors: colors),
                    center: point,
                    startRadius: 0,
                    endRadius: CGFloat(radius)
                )
            )
        }
    }

    private func drawLumiere(in context: inout GraphicsContext, size: CGSize, time: TimeInterval, pulse: Double) {
        let width = Double(size.width)
        let height = Double(size.height)
        let centerX = width * 0.5
        let centerY = height * 0.42
        for index in 0..<7 {
            let phase = time * (0.12 + Double(index) * 0.012) + Double(index) * 0.85
            let rx = width * (0.16 + Double(index) * 0.055 + pulse * 0.04)
            let ry = rx * (0.42 + 0.18 * sin(phase))
            let rect = CGRect(
                x: CGFloat(centerX - rx),
                y: CGFloat(centerY - ry),
                width: CGFloat(rx * 2),
                height: CGFloat(ry * 2)
            )
            var ring = Path()
            ring.addEllipse(in: rect)
            context.stroke(
                ring,
                with: .color(Color(red: 0.96, green: 0.77, blue: 0.55).opacity(0.08 + Double(index) * 0.026 + pulse * 0.06)),
                lineWidth: CGFloat(1 + pulse * 1.4)
            )
        }
        for index in 0..<38 {
            let phase = time * (0.18 + Double(index % 5) * 0.03) + Double(index) * 2.399
            let radius = width * (0.12 + Double(index % 11) * 0.026)
            let x = centerX + cos(phase) * radius
            let y = centerY + sin(phase * 1.19) * radius * 0.66
            let dotSize = 1.2 + pulse * Double(index % 3 + 1)
            let dot = CGRect(x: CGFloat(x), y: CGFloat(y), width: CGFloat(dotSize), height: CGFloat(dotSize))
            context.fill(
                Path(ellipseIn: dot),
                with: .color(Color(red: 1.0, green: 0.82, blue: 0.61).opacity(0.20 + pulse * 0.35))
            )
        }
    }

    private func drawPartita(in context: inout GraphicsContext, size: CGSize, time: TimeInterval, pulse: Double) {
        let width = Double(size.width)
        let height = Double(size.height)
        let columns = 7
        let rows = 12
        let gap = width * 0.018
        let cellWidth = (width * 0.78 - gap * Double(columns - 1)) / Double(columns)
        let cellHeight = height * 0.034
        let originX = width * 0.11
        let originY = height * 0.16
        for row in 0..<rows {
            for column in 0..<columns {
                let phase = sin(time * 0.35 + Double(row) * 0.65 + Double(column) * 0.48)
                let widthScale = 0.48 + 0.48 * (0.5 + 0.5 * phase)
                let x = originX + Double(column) * (cellWidth + gap)
                let y = originY + Double(row) * (cellHeight + gap * 1.8)
                let rect = CGRect(
                    x: CGFloat(x),
                    y: CGFloat(y),
                    width: CGFloat(cellWidth * widthScale),
                    height: CGFloat(cellHeight)
                )
                let alpha = 0.035 + 0.10 * widthScale + pulse * 0.08
                context.fill(
                    Path(roundedRect: rect, cornerRadius: CGFloat(cellHeight * 0.5)),
                    with: .color(Color(red: 0.60, green: 0.88, blue: 0.77).opacity(alpha))
                )
            }
        }
    }

    private func drawFume(in context: inout GraphicsContext, size: CGSize, time: TimeInterval, pulse: Double) {
        let origin = CGPoint(x: size.width * 0.5, y: size.height * 0.46)
        let ink = Color(red: 0.80, green: 0.72, blue: 0.58)
        for index in 0..<5 {
            let phase = time * 0.20 + Double(index) * 1.27
            let offsetX = CGFloat(sin(phase)) * size.width * 0.12
            let offsetY = CGFloat(cos(phase * 0.73)) * size.height * 0.08
            let radius = size.width * (0.12 + CGFloat(index) * 0.065 + CGFloat(pulse) * 0.045)
            let center = CGPoint(x: origin.x + offsetX, y: origin.y + offsetY)
            let rect = CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
            let gradient = Gradient(colors: [
                ink.opacity(0.17 + Double(pulse) * 0.12),
                Color(red: 0.43, green: 0.56, blue: 0.52).opacity(0.07),
                .clear
            ])
            context.fill(Path(ellipseIn: rect), with: .radialGradient(
                gradient,
                center: center,
                startRadius: 0,
                endRadius: radius
            ))
        }
        for index in 0..<18 {
            let phase = time * 0.12 + Double(index) * 2.4
            let radius = size.width * (0.12 + Double(index % 6) * 0.045)
            let x = origin.x + CGFloat(cos(phase)) * radius
            let y = origin.y + CGFloat(sin(phase * 0.82)) * radius * 0.58
            let dotSize = CGFloat(1.5 + pulse * Double(index % 4 + 1))
            let dot = CGRect(x: x, y: y, width: dotSize, height: dotSize)
            context.fill(Path(ellipseIn: dot), with: .color(ink.opacity(0.20 + pulse * 0.25)))
        }
    }
}


private struct NativeVisualizerSettingsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var lyricScale: Double
    @Binding var intensity: Double
    @Binding var audioReactive: Bool

    var body: some View {
        NavigationStack {
            Form {
                Section("文字") {
                    HStack {
                        Text("歌词字号")
                        Spacer()
                        Text(String(format: "%.0f%%", lyricScale * 100))
                            .foregroundStyle(.secondary)
                            .monospacedDigit()
                    }
                    Slider(value: $lyricScale, in: 0.75...1.45, step: 0.05)
                        .tint(Color(red: 0.46, green: 0.56, blue: 0.78))
                }

                Section("动态效果") {
                    HStack {
                        Text("音频响应强度")
                        Spacer()
                        Text(String(format: "%.0f%%", intensity * 100))
                            .foregroundStyle(.secondary)
                            .monospacedDigit()
                    }
                    Slider(value: $intensity, in: 0.15...1.5, step: 0.05)
                        .tint(Color(red: 0.46, green: 0.56, blue: 0.78))
                    Toggle("跟随音乐律动", isOn: $audioReactive)
                        .tint(Color(red: 0.42, green: 0.60, blue: 0.72))
                }

                Section {
                    Button("恢复默认设置", role: .destructive) {
                        lyricScale = 1
                        intensity = 0.85
                        audioReactive = true
                    }
                }
            }
            .navigationTitle("视觉设置")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
        }
    }


}
