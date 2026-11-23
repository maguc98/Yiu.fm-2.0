import SwiftUI

struct NativeMiniPlayerBar: View {
    @ObservedObject var player: YiuAudioPlayer
    @ObservedObject var appearance: NativeAppearanceStore
    @Binding var isExpanded: Bool
    let onOpenExpandedPlayer: () -> Void
    let onSwipeUp: () -> Void

    @AppStorage("yiufm.native.system.haptics") private var hapticsEnabled = true

    private var currentTitle: String {
        player.currentTrack?.title ?? player.currentLyric?.text ?? "—"
    }

    private var artworkLetter: String {
        String(currentTitle.prefix(1)).isEmpty ? "文" : String(currentTitle.prefix(1))
    }

    var body: some View {
        HStack(spacing: 9) {
            Button(action: onOpenExpandedPlayer) {
                HStack(spacing: 10) {
                    artwork
                    VStack(alignment: .leading, spacing: 1) {
                        Text("正在播放")
                            .font(.system(size: 11, weight: .medium))
                            .tracking(1)
                            .foregroundStyle(.white.opacity(0.62))
                            .lineLimit(1)
                        Text(currentTitle)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                            .truncationMode(.tail)
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .highPriorityGesture(
                DragGesture(minimumDistance: 18)
                    .onEnded { value in
                        let dx = value.translation.width
                        let dy = value.translation.height
                        if abs(dx) > 36 && abs(dx) > abs(dy) * 1.5 {
                            withAnimation(.spring(response: 0.48, dampingFraction: 0.78)) {
                                isExpanded = dx > 0
                            }
                        } else if dy < -36 && abs(dy) > abs(dx) * 1.5 {
                            onSwipeUp()
                        }
                    }
            )

            if isExpanded {
                Button {
                    NativeHaptics.impact(enabled: hapticsEnabled)
                    player.togglePlayback()
                } label: {
                    Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 42, height: 42)
                        .background(.white.opacity(0.12), in: Circle())
                        .contentShape(Circle())
                }
                .buttonStyle(.plain)
                .disabled(!player.hasTrack)
                .accessibilityLabel(player.isPlaying ? "暂停播放" : "开始播放")
                .transition(.scale.combined(with: .opacity))

                Button {
                    NativeHaptics.selection(enabled: hapticsEnabled)
                    player.nextTrack()
                } label: {
                    Image(systemName: "forward.end.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white.opacity(player.tracks.count > 1 ? 0.88 : 0.35))
                        .frame(width: 42, height: 42)
                        .contentShape(Circle())
                }
                .buttonStyle(.plain)
                .disabled(player.tracks.count < 2)
                .accessibilityLabel("下一首")
                .transition(.scale.combined(with: .opacity))
            }
        }
        .padding(.horizontal, 10)
        .frame(height: 66)
        .background {
            NativeLiquidGlassBackground(
                shape: RoundedRectangle(cornerRadius: 24, style: .continuous),
                tint: Color(red: 0.10, green: 0.11, blue: 0.16),
                fallbackOpacity: 0.34
            )
        }
        .environment(\.colorScheme, .dark)
        .animation(.spring(response: 0.48, dampingFraction: 0.78), value: isExpanded)
        .accessibilityElement(children: .contain)
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
                        .fill(
                            LinearGradient(
                                colors: [Color(red: 0.56, green: 0.69, blue: 1.0).opacity(0.60), .white.opacity(0.12)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    Text(artworkLetter)
                        .font(.system(size: 22, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                }
            }
        }
        .frame(width: 46, height: 46)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(.white.opacity(0.12), lineWidth: 1)
        }
    }
}
