import SwiftUI

struct NativeHomeView: View {
    @ObservedObject var player: YiuAudioPlayer
    let openMusic: () -> Void
    let openCategories: () -> Void

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.94, green: 0.96, blue: 0.99),
                    Color(red: 0.97, green: 0.94, blue: 0.98),
                    Color(red: 0.93, green: 0.97, blue: 0.96)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 22) {
                    header

                    VStack(alignment: .leading, spacing: 8) {
                        Text("让音乐，成为画面。")
                            .font(.system(size: 27, weight: .bold, design: .rounded))
                            .foregroundStyle(ink)
                        Text("在一个安静、清晰的空间里，管理音乐与视觉体验。")
                            .font(.system(size: 14))
                            .foregroundStyle(secondaryInk)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.top, 10)

                    musicCard

                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("功能")
                                .font(.system(size: 20, weight: .bold, design: .rounded))
                                .foregroundStyle(ink)
                            Text("按类别找到你需要的工具")
                                .font(.system(size: 12))
                                .foregroundStyle(secondaryInk)
                        }
                        Spacer()
                        Button(action: openCategories) {
                            HStack(spacing: 5) {
                                Text("全部功能")
                                Image(systemName: "arrow.right")
                            }
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color(red: 0.35, green: 0.48, blue: 0.69))
                        }
                        .buttonStyle(.plain)
                    }

                    Button(action: openCategories) {
                        HStack(spacing: 14) {
                            Image(systemName: "square.grid.2x2.fill")
                                .font(.system(size: 19, weight: .semibold))
                                .foregroundStyle(Color(red: 0.48, green: 0.53, blue: 0.75))
                                .frame(width: 48, height: 48)
                                .background(Color.white.opacity(0.78), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                            VStack(alignment: .leading, spacing: 4) {
                                Text("其他 · 功能分类")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundStyle(ink)
                                Text("音乐、排版、背景、系统、备份与开发者工具")
                                    .font(.system(size: 11))
                                    .foregroundStyle(secondaryInk)
                                    .lineLimit(2)
                                    .multilineTextAlignment(.leading)
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.tertiary)
                        }
                        .padding(16)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 22, style: .continuous)
                                .strokeBorder(.white.opacity(0.8), lineWidth: 1)
                        }
                    }
                    .buttonStyle(.plain)

                    HStack {
                        Text("YIU.FM · NATIVE")
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .tracking(1.8)
                        Spacer()
                        Text("原生界面迁移中")
                            .font(.system(size: 10, weight: .medium))
                    }
                    .foregroundStyle(secondaryInk.opacity(0.75))
                    .padding(.top, 8)
                    .padding(.bottom, 22)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private var header: some View {
        HStack(spacing: 11) {
            Image(systemName: "waveform")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 46, height: 46)
                .background(
                    LinearGradient(
                        colors: [Color(red: 0.42, green: 0.57, blue: 0.78), Color(red: 0.61, green: 0.55, blue: 0.76)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                )
            VStack(alignment: .leading, spacing: 2) {
                Text("Yiu.fm")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(ink)
                Text("AETHER · MUSIC VISUAL EXPERIENCE")
                    .font(.system(size: 8, weight: .semibold, design: .rounded))
                    .tracking(1.1)
                    .foregroundStyle(secondaryInk)
            }
            Spacer()
            Image(systemName: "ellipsis")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(secondaryInk)
                .frame(width: 40, height: 40)
                .background(.regularMaterial, in: Circle())
                .accessibilityHidden(true)
        }
    }

    private var musicCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Label("正在播放", systemImage: "waveform")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(secondaryInk)
                Spacer()
                Text(player.hasTrack ? "本地音乐" : "尚未选择")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Color(red: 0.35, green: 0.56, blue: 0.51))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.72), in: Capsule())
            }

            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color.white.opacity(0.76))
                    Image(systemName: player.hasTrack ? "music.note" : "music.note.list")
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(Color(red: 0.47, green: 0.53, blue: 0.72))
                }
                .frame(width: 72, height: 72)

                VStack(alignment: .leading, spacing: 6) {
                    Text(player.currentTrack?.title ?? "让我们开始播放")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(ink)
                        .lineLimit(1)
                    Text(player.currentTrack.map { $0.artist.isEmpty ? "本地音乐" : $0.artist } ?? "选择设备中的音频文件")
                        .font(.system(size: 12))
                        .foregroundStyle(secondaryInk)
                        .lineLimit(1)
                    if player.hasTrack {
                        Text("\(player.formattedTime(player.currentTime)) / \(player.formattedTime(player.duration))")
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundStyle(secondaryInk)
                    }
                }
                Spacer(minLength: 0)
            }

            HStack(spacing: 10) {
                Button(action: openMusic) {
                    HStack(spacing: 7) {
                        Image(systemName: "music.note")
                        Text(player.hasTrack ? "打开播放器" : "选择音乐")
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 46)
                    .background(Color(red: 0.38, green: 0.51, blue: 0.71), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
                }
                .buttonStyle(.plain)

                if player.hasTrack {
                    Button(action: player.togglePlayback) {
                        Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(Color(red: 0.34, green: 0.43, blue: 0.60))
                            .frame(width: 46, height: 46)
                            .background(Color.white.opacity(0.82), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(player.isPlaying ? "暂停" : "播放")
                }
            }
        }
        .padding(18)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .strokeBorder(.white.opacity(0.84), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.045), radius: 18, x: 0, y: 8)
    }

    private var ink: Color { Color(red: 0.17, green: 0.21, blue: 0.29) }
    private var secondaryInk: Color { Color(red: 0.43, green: 0.48, blue: 0.56) }
}
