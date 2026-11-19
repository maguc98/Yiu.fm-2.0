import SwiftUI

struct NativeMiniPlayerBar: View {
    @ObservedObject var player: YiuAudioPlayer
    @ObservedObject var appearance: NativeAppearanceStore
    let onOpenPlayer: () -> Void
    let onOpenControlCenter: () -> Void

    @AppStorage("yiufm.native.system.haptics") private var hapticsEnabled = true

    var body: some View {
        HStack(spacing: 9) {
            Button(action: onOpenPlayer) {
                HStack(spacing: 10) {
                    artwork
                    VStack(alignment: .leading, spacing: 3) {
                        Text(player.currentTrack?.title ?? "Yiu.fm · Aether")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        Text(player.currentTrack.map { $0.artist.isEmpty ? "本地音乐" : $0.artist } ?? "点击选择本地歌曲")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(.white.opacity(0.58))
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
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 34, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(!player.hasTrack)
            .accessibilityLabel(player.isPlaying ? "暂停播放" : "开始播放")

            Button {
                NativeHaptics.selection(enabled: hapticsEnabled)
                player.nextTrack()
            } label: {
                Image(systemName: "forward.end.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white.opacity(player.tracks.count > 1 ? 0.88 : 0.35))
                    .frame(width: 30, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(player.tracks.count < 2)
            .accessibilityLabel("下一首")
        }
        .padding(.horizontal, 10)
        .frame(height: 66)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .environment(\.colorScheme, .dark)
        .overlay {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(.white.opacity(0.20), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.28), radius: 17, x: 0, y: 7)
        .overlay(alignment: .bottomLeading) {
            GeometryReader { geometry in
                Capsule()
                    .fill(Color(red: 0.60, green: 0.72, blue: 0.98).opacity(0.95))
                    .frame(width: geometry.size.width * progress, height: 2)
                    .frame(maxHeight: .infinity, alignment: .bottom)
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 5)
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
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(.white.opacity(0.12))
                    Image(systemName: "waveform")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(.white.opacity(0.82))
                }
            }
        }
        .frame(width: 46, height: 46)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(.white.opacity(0.16), lineWidth: 1)
        }
    }

    private var progress: Double {
        guard player.duration > 0 else { return 0 }
        return min(1, max(0, player.currentTime / player.duration))
    }
}
