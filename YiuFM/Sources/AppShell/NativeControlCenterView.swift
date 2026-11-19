import SwiftUI

struct NativeControlCenterView: View {
    @ObservedObject var player: YiuAudioPlayer
    @ObservedObject var appearance: NativeAppearanceStore

    let onOpenMusic: () -> Void
    let onOpenVisualizer: () -> Void
    let onOpenBackground: () -> Void
    let onOpenSystem: () -> Void
    let onOpenText: () -> Void
    let onClose: () -> Void

    @AppStorage("yiufm.native.visual.engine") private var engineID = NativeVisualEngine.sonnet.rawValue
    @AppStorage("yiufm.native.system.haptics") private var hapticsEnabled = true

    private var engine: NativeVisualEngine {
        NativeVisualEngine(rawValue: engineID) ?? .sonnet
    }

    var body: some View {
        VStack(spacing: 12) {
            header
            engineCard
            sectionNavigation
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
            sectionButton("调节", symbol: "slider.horizontal.3", action: onOpenSystem)
            sectionButton("风格", symbol: "sparkles", action: onOpenVisualizer)
            sectionButton("背景", symbol: "photo", action: onOpenBackground)
            sectionButton("文字", symbol: "textformat", action: onOpenText)
        }
        .padding(5)
        .background(.white.opacity(0.055), in: Capsule())
        .overlay {
            Capsule().strokeBorder(.white.opacity(0.10), lineWidth: 1)
        }
    }

    private func sectionButton(_ title: String, symbol: String, action: @escaping () -> Void) -> some View {
        Button {
            NativeHaptics.selection(enabled: hapticsEnabled)
            action()
        } label: {
            VStack(spacing: 5) {
                Image(systemName: symbol)
                    .font(.system(size: 15, weight: .semibold))
                Text(title)
                    .font(.system(size: 9, weight: .semibold))
            }
            .foregroundStyle(.white.opacity(0.78))
            .frame(maxWidth: .infinity)
            .frame(height: 43)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
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
