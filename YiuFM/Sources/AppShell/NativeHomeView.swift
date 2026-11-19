import SwiftUI

struct NativeHomeView: View {
    @ObservedObject var player: YiuAudioPlayer
    @ObservedObject var appearance: NativeAppearanceStore
    let openMusic: () -> Void
    let openVisualizer: () -> Void
    let openText: () -> Void
    let openCategories: () -> Void
    let openControlCenter: () -> Void

    @AppStorage("yiufm.native.visual.engine") private var engineID = NativeVisualEngine.sonnet.rawValue
    @AppStorage("yiufm.native.visual.intensity") private var intensity = 0.85
    @AppStorage("yiufm.native.visual.audioReactive") private var audioReactive = true
    @AppStorage("yiufm.native.system.targetFPS") private var targetFPS = 30
    @AppStorage("yiufm.native.system.animationSpeed") private var animationSpeed = 1.0
    @AppStorage("yiufm.native.system.reduceMotion") private var reduceMotion = false
    @AppStorage("yiufm.native.typography.family") private var fontFamilyID = NativeFontFamily.serif.rawValue
    @AppStorage("yiufm.native.typography.scale") private var typographyScale = 1.0
    @AppStorage("yiufm.native.typography.weight") private var fontWeightValue = 0.78
    @AppStorage("yiufm.native.typography.color") private var textColorHex = "#FFFFFF"

    private var engine: NativeVisualEngine {
        NativeVisualEngine(rawValue: engineID) ?? .sonnet
    }

    private var fontFamily: NativeFontFamily {
        NativeFontFamily(rawValue: fontFamilyID) ?? .serif
    }

    private var fontWeight: Font.Weight {
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

            NativeVisualBackdrop(
                engine: engine,
                audioLevel: player.audioLevel,
                isPlaying: player.isPlaying,
                intensity: intensity,
                audioReactive: audioReactive,
                targetFPS: targetFPS,
                animationSpeed: animationSpeed,
                reduceMotion: reduceMotion
            )
            .ignoresSafeArea()

            LinearGradient(
                stops: [
                    .init(color: .black.opacity(0.44), location: 0),
                    .init(color: .clear, location: 0.32),
                    .init(color: .clear, location: 0.66),
                    .init(color: .black.opacity(0.66), location: 1)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                header
                    .padding(.top, 8)

                Spacer(minLength: 24)

                lyricStage
                    .frame(maxWidth: 560)

                Spacer(minLength: 24)

                playbackPanel
                controlDock
                    .padding(.top, 13)
                    .padding(.bottom, 8)
            }
            .padding(.horizontal, 16)
        }
        .toolbar(.hidden, for: .navigationBar)
        .background(Color.black.ignoresSafeArea())
    }

    private var header: some View {
        HStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(.white.opacity(0.13))
                Image(systemName: "waveform")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .frame(width: 38, height: 38)
            .overlay {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(.white.opacity(0.2), lineWidth: 1)
            }

            VStack(alignment: .leading, spacing: 1) {
                Text("Yiu.fm")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                Text("AETHER · MUSIC VISUAL EXPERIENCE")
                    .font(.system(size: 7, weight: .bold, design: .rounded))
                    .tracking(1.35)
                    .foregroundStyle(.white.opacity(0.58))
            }

            Spacer()

            HStack(spacing: 6) {
                Circle()
                    .fill(player.isPlaying ? Color(red: 0.43, green: 0.88, blue: 0.69) : .white.opacity(0.45))
                    .frame(width: 6, height: 6)
                Text(engine.rawValue.uppercased())
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .tracking(0.9)
                    .foregroundStyle(.white.opacity(0.82))
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(.white.opacity(0.10), in: Capsule())
            .overlay { Capsule().strokeBorder(.white.opacity(0.15), lineWidth: 1) }

            Button(action: openControlCenter) {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(.white.opacity(0.12), in: Circle())
                    .overlay { Circle().strokeBorder(.white.opacity(0.20), lineWidth: 1) }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("控制中心")
        }
    }

    private var lyricStage: some View {
        VStack(spacing: 18) {
            HStack(spacing: 7) {
                Circle()
                    .fill(player.isPlaying ? Color(red: 0.47, green: 0.91, blue: 0.73) : .white.opacity(0.45))
                    .frame(width: 6, height: 6)
                Text(player.isPlaying ? "NOW PLAYING" : "READY TO PLAY")
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .tracking(1.8)
                    .foregroundStyle(.white.opacity(0.63))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(.black.opacity(0.18), in: Capsule())
            .overlay { Capsule().strokeBorder(.white.opacity(0.12), lineWidth: 1) }

            if player.lyrics.isEmpty {
                VStack(spacing: 12) {
                    Text(player.currentTrack?.title ?? "让音乐，成为画面。")
                        .font(.system(size: 25, weight: .semibold, design: .serif))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                        .lineLimit(3)
                    Text(player.currentTrack.map { $0.artist.isEmpty ? "本地音乐" : $0.artist } ?? "让文字、光线与节奏在这里相遇")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.white.opacity(0.60))
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, minHeight: 220)
            } else {
                VStack(spacing: 22) {
                    if player.currentLyricIndex > 0,
                       player.currentLyricIndex - 1 < player.lyrics.count {
                        Text(player.lyrics[player.currentLyricIndex - 1].text)
                            .font(.system(size: 13, weight: .medium, design: .serif))
                            .foregroundStyle(.white.opacity(0.32))
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                    }

                    if let lyric = player.currentLyric {
                        Text(lyric.text)
                            .font(.system(
                                size: CGFloat(29 * typographyScale),
                                weight: fontWeight,
                                design: fontFamily.design
                            ))
                            .tracking(engine == .sonnet ? 1.1 : 0.35)
                            .foregroundStyle(Color(nativeHex: textColorHex))
                            .multilineTextAlignment(.center)
                            .lineSpacing(8)
                            .shadow(color: .black.opacity(0.22), radius: 9, x: 0, y: 3)
                            .frame(maxWidth: .infinity)
                            .id(player.currentLyricIndex)
                            .transition(.opacity.combined(with: .scale(scale: 0.97)))
                    } else {
                        Text(" ")
                            .frame(height: 52)
                    }

                    if player.currentLyricIndex + 1 < player.lyrics.count {
                        Text(player.lyrics[player.currentLyricIndex + 1].text)
                            .font(.system(size: 13, weight: .medium, design: .serif))
                            .foregroundStyle(.white.opacity(0.40))
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 220)
                .animation(.easeInOut(duration: 0.32), value: player.currentLyricIndex)
            }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 26)
        .frame(maxWidth: .infinity)
    }

    private var playbackPanel: some View {
        VStack(spacing: 9) {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(player.currentTrack?.title ?? "Yiu.fm")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(player.currentTrack.map { $0.artist.isEmpty ? "本地音乐" : $0.artist } ?? "选择音频，开启你的视觉体验")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(.white.opacity(0.52))
                        .lineLimit(1)
                }

                Spacer(minLength: 8)

                Text("\(player.formattedTime(player.currentTime))  /  \(player.formattedTime(player.duration))")
                    .font(.system(size: 9, weight: .medium, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white.opacity(0.62))
            }

            Slider(
                value: Binding(
                    get: { player.currentTime },
                    set: { player.seek(to: $0) }
                ),
                in: 0...max(player.duration, 1)
            )
            .tint(Color(red: 0.63, green: 0.73, blue: 1.0))
            .disabled(!player.hasTrack)
        }
        .padding(.horizontal, 15)
        .padding(.vertical, 11)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 19, style: .continuous))
        .environment(\.colorScheme, .dark)
        .overlay {
            RoundedRectangle(cornerRadius: 19, style: .continuous)
                .strokeBorder(.white.opacity(0.19), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.22), radius: 16, x: 0, y: 7)
    }

    private var controlDock: some View {
        HStack(spacing: 0) {
            NativeHomeDockButton(title: "文字", symbol: "text.aligncenter", action: openText)
            NativeHomeDockButton(title: "视觉", symbol: "sparkles", action: openVisualizer)
            NativeHomeDockButton(title: "音乐", symbol: "music.note", action: openMusic)
            NativeHomeDockButton(title: "功能", symbol: "square.grid.2x2", action: openCategories)
            NativeHomeDockButton(title: "控制", symbol: "slider.horizontal.3", action: openControlCenter)
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 7)
        .background(.ultraThinMaterial, in: Capsule())
        .environment(\.colorScheme, .dark)
        .overlay { Capsule().strokeBorder(.white.opacity(0.20), lineWidth: 1) }
        .shadow(color: .black.opacity(0.25), radius: 18, x: 0, y: 8)
    }
}

private struct NativeHomeDockButton: View {
    let title: String
    let symbol: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 5) {
                Image(systemName: symbol)
                    .font(.system(size: 15, weight: .semibold))
                    .frame(height: 17)
                Text(title)
                    .font(.system(size: 8, weight: .semibold))
            }
            .foregroundStyle(.white.opacity(0.83))
            .frame(maxWidth: .infinity)
            .frame(height: 42)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
