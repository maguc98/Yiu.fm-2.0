import SwiftUI

struct NativeControlCenterView: View {
    @ObservedObject var player: YiuAudioPlayer
    @ObservedObject var appearance: NativeAppearanceStore

    let onOpenMusic: () -> Void
    let onOpenVisualizer: () -> Void
    let onOpenBackground: () -> Void
    let onOpenSystem: () -> Void
    let onOpenText: () -> Void

    @Environment(\.dismiss) private var dismiss
    @AppStorage("yiufm.native.visual.engine") private var engineID = NativeVisualEngine.sonnet.rawValue
    @AppStorage("yiufm.native.system.haptics") private var hapticsEnabled = true

    private var engine: NativeVisualEngine {
        NativeVisualEngine(rawValue: engineID) ?? .sonnet
    }

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.93, green: 0.96, blue: 0.99),
                        Color(red: 0.96, green: 0.93, blue: 0.98),
                        Color(red: 0.93, green: 0.97, blue: 0.95)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 18) {
                        header
                        playbackCard
                        engineCard
                        quickActions
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 10)
                    .padding(.bottom, 30)
                }
            }
            .navigationTitle("控制中心")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("完成") { dismiss() }
                        .font(.system(size: 14, weight: .semibold))
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("YIU.FM · NATIVE")
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .tracking(1.8)
                .foregroundStyle(.secondary)
            Text("控制中心")
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundStyle(Color(red: 0.16, green: 0.20, blue: 0.29))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 4)
    }

    private var playbackCard: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack {
                Label("音乐与播放", systemImage: "waveform")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                Text(player.isPlaying ? "正在播放" : (player.hasTrack ? "已暂停" : "未选择歌曲"))
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Color(red: 0.35, green: 0.58, blue: 0.52))
                    .padding(.horizontal, 9)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.7), in: Capsule())
            }

            HStack(spacing: 11) {
                if let cover = appearance.coverImage {
                    Image(uiImage: cover)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 48, height: 48)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                } else {
                    Image(systemName: "music.note")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(Color(red: 0.41, green: 0.53, blue: 0.72))
                        .frame(width: 48, height: 48)
                        .background(Color.white.opacity(0.76), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(player.currentTrack?.title ?? "选择一首音乐")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color(red: 0.17, green: 0.21, blue: 0.29))
                        .lineLimit(1)
                    Text("\(player.formattedTime(player.currentTime)) / \(player.formattedTime(player.duration))")
                        .font(.system(size: 10, weight: .medium, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 4)

                Button {
                    NativeHaptics.impact(enabled: hapticsEnabled)
                    player.togglePlayback()
                } label: {
                    Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 42, height: 42)
                        .background(Color(red: 0.40, green: 0.54, blue: 0.74), in: Circle())
                }
                .buttonStyle(.plain)
                .disabled(!player.hasTrack)
                .accessibilityLabel(player.isPlaying ? "暂停" : "播放")
            }

            Button(action: onOpenMusic) {
                HStack {
                    Text("打开音乐播放器")
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color(red: 0.36, green: 0.49, blue: 0.69))
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(.white.opacity(0.86), lineWidth: 1)
        }
    }

    private var engineCard: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("视觉引擎")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(red: 0.17, green: 0.21, blue: 0.29))
                    Text(engine.title + " · " + engine.subtitle)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text(player.isPlaying ? "运行中" : "已就绪")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(Color(red: 0.26, green: 0.56, blue: 0.47))
                    .padding(.horizontal, 9)
                    .padding(.vertical, 5)
                    .background(Color(red: 0.87, green: 0.95, blue: 0.91), in: Capsule())
            }

            HStack(spacing: 7) {
                ForEach(NativeVisualEngine.allCases) { item in
                    Button {
                        NativeHaptics.selection(enabled: hapticsEnabled)
                        engineID = item.rawValue
                    } label: {
                        VStack(spacing: 6) {
                            Image(systemName: item.symbol)
                                .font(.system(size: 15, weight: .semibold))
                            Text(item.title)
                                .font(.system(size: 10, weight: .semibold))
                        }
                        .foregroundStyle(engine == item ? .white : Color(red: 0.43, green: 0.49, blue: 0.59))
                        .frame(maxWidth: .infinity)
                        .frame(height: 58)
                        .background(
                            engine == item ? Color(red: 0.40, green: 0.53, blue: 0.72) : Color.white.opacity(0.62),
                            in: RoundedRectangle(cornerRadius: 14, style: .continuous)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }

            Button(action: onOpenVisualizer) {
                HStack {
                    Text("打开视觉舞台")
                    Spacer()
                    Image(systemName: "arrow.up.right")
                }
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color(red: 0.36, green: 0.49, blue: 0.69))
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(.white.opacity(0.86), lineWidth: 1)
        }
    }

    private var quickActions: some View {
        VStack(alignment: .leading, spacing: 11) {
            Text("快捷操作")
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(Color(red: 0.17, green: 0.21, blue: 0.29))

            HStack(spacing: 10) {
                quickAction(title: "文字内容", symbol: "text.alignleft", action: onOpenText)
                quickAction(title: "背景与封面", symbol: "photo", action: onOpenBackground)
                quickAction(title: "系统与性能", symbol: "slider.horizontal.3", action: onOpenSystem)
            }
        }
    }

    private func quickAction(title: String, symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 11) {
                Image(systemName: symbol)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color(red: 0.43, green: 0.53, blue: 0.72))
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Color(red: 0.23, green: 0.28, blue: 0.37))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity, minHeight: 82, alignment: .leading)
            .padding(12)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 17, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 17, style: .continuous)
                    .strokeBorder(.white.opacity(0.82), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }
}
