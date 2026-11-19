import SwiftUI

/// 原版迷你播放器上滑后出现的封面 / 当前歌词播放卡片。
/// 与控制中心互斥；点击卡片外部或向下拖动把手即可收起。
struct NativeExpandedPlayerCard: View {
    @ObservedObject var player: YiuAudioPlayer
    @ObservedObject var appearance: NativeAppearanceStore
    @Binding var isPresented: Bool
    let width: CGFloat
    let onEditCover: () -> Void

    @AppStorage("yiufm.native.system.haptics") private var hapticsEnabled = true
    @AppStorage("yiufm.native.playback.miniMode") private var playMode = 0
    @State private var dragOffset: CGFloat = 0

    private var currentText: String {
        player.currentLyric?.text ?? player.currentTrack?.title ?? "—"
    }

    private var nextText: String {
        let nextIndex = player.currentLyricIndex + 1
        guard player.lyrics.indices.contains(nextIndex) else { return " " }
        return player.lyrics[nextIndex].text
    }

    private var subtitle: String {
        guard let track = player.currentTrack else { return "Yiu.fm · Aether" }
        let parts = [track.artist, track.album].filter { !$0.isEmpty }
        return parts.isEmpty ? "本地音乐" : parts.joined(separator: " · ")
    }

    private var modeTitle: String {
        switch playMode {
        case 1: return "随机播放"
        case 2: return "单曲循环"
        default: return "顺序播放"
        }
    }

    private var modeSymbol: String {
        switch playMode {
        case 1: return "shuffle"
        case 2: return "repeat.1"
        default: return "arrow.left.arrow.right"
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            Capsule()
                .fill(.white.opacity(0.32))
                .frame(width: 38, height: 4)
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .padding(.bottom, 10)
                .gesture(
                    DragGesture(minimumDistance: 8)
                        .onChanged { value in
                            dragOffset = max(0, value.translation.height)
                        }
                        .onEnded { value in
                            if value.translation.height > 80 {
                                dismiss()
                            } else {
                                withAnimation(.spring(response: 0.34, dampingFraction: 0.82)) {
                                    dragOffset = 0
                                }
                            }
                        }
                )

            cover
                .frame(height: max(120, width - 28))
                .padding(.bottom, 12)

            Text(currentText)
                .font(.system(size: 21, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                .padding(.horizontal, 4)

            Text(subtitle)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.white.opacity(0.62))
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 4)
                .padding(.top, 4)

            Text(nextText)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.white.opacity(0.42))
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 4)
                .padding(.top, 2)

            HStack(spacing: 6) {
                transportButton("backward.end.fill", label: "上一句") {
                    stepContent(-1)
                }

                transportButton(player.isPlaying ? "pause.fill" : "play.fill", label: player.isPlaying ? "暂停" : "播放") {
                    NativeHaptics.impact(enabled: hapticsEnabled)
                    player.togglePlayback()
                }
                .disabled(!player.hasTrack)

                transportButton("forward.end.fill", label: "下一句") {
                    stepContent(1)
                }

                Spacer(minLength: 0)

                transportButton(modeSymbol, label: modeTitle) {
                    cyclePlayMode()
                }
            }
            .padding(.top, 12)
        }
        .padding(.horizontal, 14)
        .padding(.top, 10)
        .padding(.bottom, 12)
        .frame(width: width)
        .background {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(.ultraThinMaterial)
                .environment(\.colorScheme, .dark)
                .overlay {
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .fill(Color(red: 34.0 / 255.0, green: 34.0 / 255.0, blue: 40.0 / 255.0).opacity(0.62))
                }
        }
        .overlay {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .strokeBorder(.white.opacity(0.18), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.25), radius: 25, x: 0, y: 12)
        .offset(y: dragOffset)
        .onAppear {
            playMode = player.shuffleEnabled ? 1 : (player.repeatMode == .one ? 2 : 0)
        }
        .accessibilityElement(children: .contain)
    }

    private var cover: some View {
        ZStack(alignment: .topTrailing) {
            Group {
                if let image = appearance.coverImage ?? player.currentArtwork {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                } else {
                    ZStack {
                        LinearGradient(
                            colors: [
                                Color(red: 0.23, green: 0.27, blue: 0.38),
                                Color(red: 0.11, green: 0.12, blue: 0.17)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                        Image(systemName: "waveform")
                            .font(.system(size: 62, weight: .light))
                            .foregroundStyle(.white.opacity(0.76))
                    }
                }
            }
            .frame(width: max(120, width - 28) - 16, height: max(120, width - 28) - 16)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .onLongPressGesture(minimumDuration: 0.55) {
                NativeHaptics.impact(enabled: hapticsEnabled)
                appearance.removeCover()
            }

            Button(action: onEditCover) {
                Image(systemName: "photo")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 34, height: 34)
                    .background(.black.opacity(0.38), in: Circle())
                    .overlay { Circle().strokeBorder(.white.opacity(0.24), lineWidth: 1) }
            }
            .buttonStyle(.plain)
            .padding(14)
            .accessibilityLabel("更换封面")
        }
        .padding(8)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private func transportButton(
        _ symbol: String,
        label: String,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            NativeHaptics.selection(enabled: hapticsEnabled)
            action()
        } label: {
            Image(systemName: symbol)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 42, height: 42)
                .background(.white.opacity(0.10), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    private func stepContent(_ offset: Int) {
        if player.tracks.count > 1 {
            if offset < 0 { player.previousTrack() } else { player.nextTrack() }
            return
        }
        guard !player.lyrics.isEmpty else { return }
        let target = min(player.lyrics.count - 1, max(0, player.currentLyricIndex + offset))
        player.seekToLyric(player.lyrics[target])
    }

    private func cyclePlayMode() {
        playMode = (playMode + 1) % 3
        let wantsShuffle = playMode == 1
        if player.shuffleEnabled != wantsShuffle {
            player.toggleShuffle()
        }
        let target: YiuRepeatMode = playMode == 2 ? .one : .off
        while player.repeatMode != target {
            player.cycleRepeatMode()
        }
    }

    private func dismiss() {
        withAnimation(.spring(response: 0.36, dampingFraction: 0.86)) {
            isPresented = false
            dragOffset = 0
        }
    }
}
