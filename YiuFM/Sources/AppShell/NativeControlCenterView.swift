import SwiftUI

private enum NativeControlCenterSection: String {
    case adjust
    case style
    case background
    case text
}

struct NativeControlCenterView: View {
    @ObservedObject var player: YiuAudioPlayer
    @ObservedObject var appearance: NativeAppearanceStore
    @ObservedObject var textDeck: NativeTextDeckStore

    let onOpenMusic: () -> Void
    let onOpenVisualizer: () -> Void
    let onOpenBackground: () -> Void
    let onOpenTuning: () -> Void
    let onOpenText: () -> Void
    let onClose: () -> Void

    @AppStorage("yiufm.native.visual.engine") private var engineID = NativeVisualEngine.sonnet.rawValue
    @AppStorage("yiufm.native.system.haptics") private var hapticsEnabled = true
    @AppStorage("yiufm.native.visual.intensity") private var visualIntensity = 0.85
    @AppStorage("yiufm.native.visual.motionStrength") private var motionStrength = 1.0
    @AppStorage("yiufm.native.typography.family") private var fontFamilyID = NativeFontFamily.serif.rawValue
    @AppStorage("yiufm.native.typography.scale") private var fontScale = 1.0
    @AppStorage("yiufm.native.visual.performanceMode") private var performanceMode = true
    @AppStorage("yiufm.native.visual.showGuide") private var showGuide = false
    @AppStorage("yiufm.native.visual.audioReactive") private var audioReactive = true
    @AppStorage("yiufm.native.visual.showBottomCaption") private var showBottomCaption = false
    @AppStorage("yiufm.native.visual.interludeDots") private var interludeDots = true
    @AppStorage("yiufm.native.visual.showOnlyText") private var showOnlyText = false
    @AppStorage("yiufm.native.control.rememberLastSection") private var rememberLastSection = false
    @AppStorage("yiufm.native.control.lastSection") private var lastSectionID = NativeControlCenterSection.background.rawValue
    @State private var selectedSection: NativeControlCenterSection = .background

    private var engine: NativeVisualEngine {
        NativeVisualEngine(rawValue: engineID) ?? .sonnet
    }

    var body: some View {
        VStack(spacing: 12) {
            header
            engineCard
            sectionNavigation
            sectionContent
            trackInformation
            playbackTimeline
            transportDock
        }
        .padding(15)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background {
            RoundedRectangle(cornerRadius: 32, style: .continuous)
                .fill(.ultraThinMaterial)
                .environment(\.colorScheme, .dark)
                .overlay {
                    RoundedRectangle(cornerRadius: 32, style: .continuous)
                        .fill(Color(red: 34 / 255, green: 34 / 255, blue: 40 / 255).opacity(0.58))
                }
        }
        .overlay {
            RoundedRectangle(cornerRadius: 32, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [.white.opacity(0.28), .white.opacity(0.07), .white.opacity(0.16)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        }
        .shadow(color: .black.opacity(0.34), radius: 28, x: 0, y: 14)
        .environment(\.colorScheme, .dark)
        .animation(.spring(response: 0.34, dampingFraction: 0.88), value: engineID)
        .onAppear {
            selectedSection = rememberLastSection
                ? (NativeControlCenterSection(rawValue: lastSectionID) ?? .background)
                : .background
        }
        .onChange(of: selectedSection) { _, newValue in
            lastSectionID = newValue.rawValue
        }
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 3) {
                Text("控制中心")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                Text("YIU.FM")
                    .font(.system(size: 8, weight: .bold, design: .rounded))
                    .tracking(2.1)
                    .foregroundStyle(.white.opacity(0.48))
            }

            Spacer()

            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.78))
                    .frame(width: 28, height: 28)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("关闭控制中心")
        }
    }

    private var engineCard: some View {
        Button(action: onOpenVisualizer) {
            VStack(alignment: .leading, spacing: 7) {
                HStack {
                    Text("当前视觉引擎")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.white.opacity(0.56))
                    Spacer()
                    HStack(spacing: 5) {
                        Circle()
                            .fill(Color(red: 0.36, green: 0.86, blue: 0.64))
                            .frame(width: 6, height: 6)
                        Text(player.isPlaying ? "运行中" : "已就绪")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(Color(red: 0.54, green: 0.91, blue: 0.72))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(Color(red: 0.12, green: 0.28, blue: 0.22).opacity(0.88), in: Capsule())
                }

                HStack(alignment: .lastTextBaseline, spacing: 9) {
                    Text(engine.rawValue.uppercased())
                        .font(.system(size: 25, weight: .bold, design: .rounded))
                        .tracking(1.1)
                        .foregroundStyle(.white)
                    Text(engine.title)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.60))
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.42))
                }
            }
            .padding(.horizontal, 13)
            .padding(.vertical, 11)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.white.opacity(0.075), in: RoundedRectangle(cornerRadius: 19, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 19, style: .continuous)
                    .strokeBorder(.white.opacity(0.13), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }

    private var sectionNavigation: some View {
        HStack(spacing: 0) {
            sectionButton("调节", symbol: "slider.horizontal.3", section: .adjust)
            sectionButton("风格", symbol: "sparkles", section: .style)
            sectionButton("背景", symbol: "photo", section: .background)
            sectionButton("文字", symbol: "textformat", section: .text)
        }
        .padding(5)
        .background(.white.opacity(0.055), in: Capsule())
        .overlay {
            Capsule().strokeBorder(.white.opacity(0.10), lineWidth: 1)
        }
    }

    private func sectionButton(_ title: String, symbol: String, section: NativeControlCenterSection) -> some View {
        let isSelected = selectedSection == section
        return Button {
            NativeHaptics.selection(enabled: hapticsEnabled)
            withAnimation(.spring(response: 0.28, dampingFraction: 0.88)) {
                selectedSection = section
            }
        } label: {
            VStack(spacing: 5) {
                Image(systemName: symbol)
                    .font(.system(size: 15, weight: .semibold))
                Text(title)
                    .font(.system(size: 9, weight: .semibold))
            }
            .foregroundStyle(isSelected ? .white : .white.opacity(0.58))
            .frame(maxWidth: .infinity)
            .frame(height: 43)
            .background {
                if isSelected {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(.white.opacity(0.13))
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    @ViewBuilder
    private var sectionContent: some View {
        Group {
            switch selectedSection {
            case .adjust:
                tuningQuickControls
            case .style:
                engineQuickPicker
            case .background:
                backgroundQuickControls
            case .text:
                typographyQuickControls
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, minHeight: 86, maxHeight: 110)
        .background(.white.opacity(0.045), in: RoundedRectangle(cornerRadius: 17, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 17, style: .continuous)
                .strokeBorder(.white.opacity(0.09), lineWidth: 1)
        }
        .animation(.easeInOut(duration: 0.20), value: selectedSection)
    }

    private var tuningQuickControls: some View {
        VStack(spacing: 5) {
            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 3),
                spacing: 4
            ) {
                quickToggle("性能优化", symbol: "speedometer", isOn: $performanceMode)
                quickToggle("参考线", symbol: "grid", isOn: $showGuide)
                quickToggle("音频律动", symbol: "waveform", isOn: $audioReactive)
                quickToggle("底部文案", symbol: "text.aligncenter", isOn: $showBottomCaption)
                quickToggle("间奏圆点", symbol: "circle.grid.3x3", isOn: $interludeDots)
                quickToggle("只显示文字", symbol: "textformat", isOn: $showOnlyText)
            }
            HStack {
                Text("快捷开关会即时影响首页画面")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(.white.opacity(0.48))
                Spacer()
                Button("更多调节") { onOpenTuning() }
                    .font(.system(size: 10, weight: .semibold))
                    .buttonStyle(.bordered)
                    .tint(.white.opacity(0.7))
            }
        }
    }

    private func quickToggle(
        _ title: String,
        symbol: String,
        isOn: Binding<Bool>
    ) -> some View {
        let active = isOn.wrappedValue
        return Button {
            NativeHaptics.selection(enabled: hapticsEnabled)
            isOn.wrappedValue.toggle()
        } label: {
            HStack(spacing: 4) {
                Image(systemName: symbol)
                    .font(.system(size: 10, weight: .semibold))
                Text(title)
                    .font(.system(size: 9, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundStyle(active ? .white : .white.opacity(0.58))
            .frame(maxWidth: .infinity)
            .frame(height: 29)
            .background(active ? .white.opacity(0.15) : .white.opacity(0.045), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .strokeBorder(.white.opacity(active ? 0.20 : 0.08), lineWidth: 1)
            }
            .contentShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(active ? .isSelected : [])
    }

    private var engineQuickPicker: some View {
        VStack(spacing: 7) {
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHGrid(
                    rows: [GridItem(.fixed(32), spacing: 5), GridItem(.fixed(32), spacing: 5)],
                    alignment: .center,
                    spacing: 5
                ) {
                    ForEach(NativeTextAnimation.allCases) { animation in
                        Button {
                            NativeHaptics.selection(enabled: hapticsEnabled)
                            textDeck.setDefaultAnimation(animation)
                        } label: {
                            Text(animation.title)
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundStyle(textDeck.defaultAnimation == animation ? .white : .white.opacity(0.62))
                                .frame(width: 72, height: 30)
                                .background(
                                    textDeck.defaultAnimation == animation ? .white.opacity(0.17) : .white.opacity(0.045),
                                    in: RoundedRectangle(cornerRadius: 10, style: .continuous)
                                )
                                .overlay {
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .strokeBorder(.white.opacity(textDeck.defaultAnimation == animation ? 0.24 : 0.08), lineWidth: 1)
                                }
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(textDeck.defaultAnimation == animation ? .isSelected : [])
                    }
                }
                .padding(.horizontal, 1)
            }
            HStack {
                Text("默认动效：\(textDeck.defaultAnimation.title)")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(.white.opacity(0.52))
                    .lineLimit(1)
                Spacer(minLength: 5)
                Button("文字卡片") { onOpenText() }
                    .font(.system(size: 10, weight: .semibold))
                    .buttonStyle(.bordered)
                    .tint(.white.opacity(0.7))
            }
        }
    }

    private var backgroundQuickControls: some View {
        VStack(spacing: 8) {
            Picker("背景类型", selection: $appearance.backgroundMode) {
                ForEach(NativeBackgroundMode.allCases) { mode in
                    Text(mode.title).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .tint(.white)
            HStack(spacing: 7) {
                ForEach(NativeBackgroundTheme.presets.prefix(4)) { theme in
                    Button {
                        appearance.applyTheme(theme)
                    } label: {
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .fill(LinearGradient(colors: theme.colors.map { Color(nativeHex: $0) }, startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(height: 23)
                            .overlay {
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .strokeBorder(.white.opacity(0.22), lineWidth: 1)
                            }
                    }
                    .buttonStyle(.plain)
                }
                Button("更多") { onOpenBackground() }
                    .font(.system(size: 10, weight: .semibold))
                    .buttonStyle(.bordered)
                    .tint(.white.opacity(0.7))
            }
        }
    }

    private var typographyQuickControls: some View {
        VStack(spacing: 8) {
            Picker("字体", selection: $fontFamilyID) {
                ForEach(NativeFontFamily.allCases) { item in
                    Text(item.title).tag(item.rawValue)
                }
            }
            .pickerStyle(.menu)
            .tint(.white)
            quickSlider("字号", value: $fontScale, range: 0.75...1.55, valueText: "\(Int(fontScale * 100))%")
            HStack {
                Text("字体、排版、文字卡片")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(.white.opacity(0.50))
                Spacer()
                Button("打开") { onOpenText() }
                    .font(.system(size: 10, weight: .semibold))
                    .buttonStyle(.bordered)
                    .tint(.white.opacity(0.7))
            }
        }
    }

    private func quickSlider(
        _ title: String,
        value: Binding<Double>,
        range: ClosedRange<Double>,
        valueText: String
    ) -> some View {
        HStack(spacing: 8) {
            Text(title)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(.white.opacity(0.62))
                .frame(width: 53, alignment: .leading)
            Slider(value: value, in: range)
                .tint(.white.opacity(0.82))
            Text(valueText)
                .font(.system(size: 9, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(.white.opacity(0.62))
                .frame(width: 38, alignment: .trailing)
        }
    }

    private var trackInformation: some View {
        HStack(spacing: 10) {
            Group {
                if let cover = appearance.coverImage ?? player.currentArtwork {
                    Image(uiImage: cover)
                        .resizable()
                        .scaledToFill()
                } else {
                    ZStack {
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(.white.opacity(0.10))
                        Image(systemName: "waveform")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(.white.opacity(0.78))
                    }
                }
            }
            .frame(width: 42, height: 42)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(.white.opacity(0.14), lineWidth: 1)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(player.currentTrack?.title ?? "尚未播放歌曲")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text(player.currentTrack.map { $0.artist.isEmpty ? "本地音乐" : $0.artist } ?? "选择音乐，开始播放")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(.white.opacity(0.52))
                    .lineLimit(1)
            }

            Spacer(minLength: 0)

            Button(action: onOpenMusic) {
                Image(systemName: "list.bullet")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.72))
                    .frame(width: 30, height: 30)
                    .background(.white.opacity(0.08), in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("打开音乐库")
        }
    }

    private var playbackTimeline: some View {
        VStack(spacing: 5) {
            Slider(
                value: Binding(
                    get: { player.currentTime },
                    set: { player.seek(to: $0) }
                ),
                in: 0...max(player.duration, 1)
            )
            .tint(Color(red: 0.62, green: 0.73, blue: 1.0))
            .disabled(!player.hasTrack)

            HStack {
                Text(player.formattedTime(player.currentTime))
                Spacer()
                Text(player.formattedTime(player.duration))
            }
            .font(.system(size: 9, weight: .medium, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(.white.opacity(0.50))
        }
    }

    private var transportDock: some View {
        HStack(spacing: 0) {
            transportButton("shuffle", active: player.shuffleEnabled) {
                player.toggleShuffle()
            }

            transportButton("backward.end.fill") {
                player.previousTrack()
            }
            .disabled(!player.hasTrack || player.tracks.count < 2)

            Button {
                NativeHaptics.impact(enabled: hapticsEnabled)
                player.togglePlayback()
            } label: {
                Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(.white.opacity(0.16), in: Circle())
                    .overlay { Circle().strokeBorder(.white.opacity(0.18), lineWidth: 1) }
            }
            .buttonStyle(.plain)
            .disabled(!player.hasTrack)
            .accessibilityLabel(player.isPlaying ? "暂停" : "播放")

            transportButton("forward.end.fill") {
                player.nextTrack()
            }
            .disabled(!player.hasTrack || player.tracks.count < 2)

            transportButton(player.repeatMode.symbol, active: player.repeatMode != .off) {
                player.cycleRepeatMode()
            }
        }
        .frame(height: 56)
        .padding(.horizontal, 7)
        .background(.white.opacity(0.075), in: Capsule())
        .overlay {
            Capsule().strokeBorder(.white.opacity(0.15), lineWidth: 1)
        }
    }

    private func transportButton(
        _ symbol: String,
        active: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            NativeHaptics.selection(enabled: hapticsEnabled)
            action()
        } label: {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(active ? Color(red: 0.72, green: 0.80, blue: 1.0) : .white.opacity(0.72))
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
