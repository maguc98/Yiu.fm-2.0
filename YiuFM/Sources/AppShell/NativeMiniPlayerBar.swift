import SwiftUI

struct NativeMiniPlayerBar: View {
    @ObservedObject var player: YiuAudioPlayer
    @ObservedObject var appearance: NativeAppearanceStore
    let onOpenPlayer: () -> Void
    let onOpenControlCenter: () -> Void

    @AppStorage("yiufm.native.system.haptics") private var hapticsEnabled = true

    var body: some View {
        HStack(spacing: 11) {
            Button(action: onOpenPlayer) {
                HStack(spacing: 10) {
                    artwork
                    VStack(alignment: .leading, spacing: 3) {
                        Text(player.currentTrack?.title ?? "Yiu.fm · 音乐播放器")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color(red: 0.16, green: 0.20, blue: 0.29))
                            .lineLimit(1)
                        Text(player.currentTrack.map { $0.artist.isEmpty ? "本地音乐" : $0.artist } ?? "选择一首本地歌曲")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            Button {
                NativeHaptics.impact(enabled: hapticsEnabled)
                player.togglePlayback()
            } label: {
                Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(Color(red: 0.32, green: 0.43, blue: 0.61))
                    .frame(width: 38, height: 42)
            }
            .buttonStyle(.plain)
            .disabled(!player.hasTrack)
            .accessibilityLabel(player.isPlaying ? "暂停播放" : "开始播放")

            Button(action: onOpenControlCenter) {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color(red: 0.39, green: 0.48, blue: 0.63))
                    .frame(width: 38, height: 42)
                    .background(Color.white.opacity(0.56), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("打开控制中心")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 23, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 23, style: .continuous)
                .strokeBorder(.white.opacity(0.82), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.09), radius: 16, x: 0, y: 6)
        .overlay(alignment: .bottomLeading) {
            GeometryReader { geometry in
                Capsule()
                    .fill(Color(red: 0.47, green: 0.59, blue: 0.77).opacity(0.9))
                    .frame(width: geometry.size.width * progress, height: 2)
                    .frame(maxHeight: .infinity, alignment: .bottom)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 7)
            .allowsHitTesting(false)
        }
    }

    private var artwork: some View {
        Group {
            if let cover = appearance.coverImage ?? player.currentArtwork {
                Image(uiImage: cover)
                    .resizable()
                    .scaledToFill()
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color(red: 0.84, green: 0.88, blue: 0.95))
                    Image(systemName: "waveform")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundStyle(Color(red: 0.39, green: 0.50, blue: 0.69))
                }
            }
        }
        .frame(width: 44, height: 44)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var progress: Double {
        guard player.duration > 0 else { return 0 }
        return min(1, max(0, player.currentTime / player.duration))
    }
}
