import SwiftUI
import UniformTypeIdentifiers

struct NativeMusicView: View {
    @ObservedObject var player: YiuAudioPlayer
    @State private var showingImporter = false
    @State private var importError: String?

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.94, green: 0.96, blue: 0.99), Color(red: 0.97, green: 0.94, blue: 0.98)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    artwork

                    VStack(spacing: 7) {
                        Text(player.hasTrack ? player.title : "还没有选择歌曲")
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundStyle(ink)
                            .multilineTextAlignment(.center)
                            .lineLimit(2)
                        Text(player.hasTrack ? player.artist : "从文件中选择一首音乐开始播放")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }

                    VStack(spacing: 8) {
                        Slider(
                            value: Binding(
                                get: { player.currentTime },
                                set: { player.seek(to: $0) }
                            ),
                            in: 0...max(player.duration, 1)
                        )
                        .tint(Color(red: 0.43, green: 0.55, blue: 0.75))
                        .disabled(!player.hasTrack)

                        HStack {
                            Text(player.formattedTime(player.currentTime))
                            Spacer()
                            Text(player.formattedTime(player.duration))
                        }
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                    }

                    HStack(spacing: 32) {
                        Image(systemName: "backward.end.fill")
                            .font(.system(size: 19))
                            .foregroundStyle(.tertiary)
                            .accessibilityHidden(true)

                        Button(action: player.togglePlayback) {
                            Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 23, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 68, height: 68)
                                .background(
                                    LinearGradient(
                                        colors: [Color(red: 0.40, green: 0.55, blue: 0.76), Color(red: 0.55, green: 0.52, blue: 0.73)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    in: Circle()
                                )
                                .shadow(color: Color(red: 0.43, green: 0.50, blue: 0.70).opacity(0.22), radius: 14, x: 0, y: 7)
                        }
                        .buttonStyle(.plain)
                        .disabled(!player.hasTrack)
                        .accessibilityLabel(player.isPlaying ? "暂停" : "播放")

                        Image(systemName: "forward.end.fill")
                            .font(.system(size: 19))
                            .foregroundStyle(.tertiary)
                            .accessibilityHidden(true)
                    }
                    .padding(.vertical, 8)

                    Button {
                        showingImporter = true
                    } label: {
                        Label("从文件选择音乐", systemImage: "folder")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color(red: 0.34, green: 0.46, blue: 0.66))
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 17, style: .continuous))
                            .overlay {
                                RoundedRectangle(cornerRadius: 17, style: .continuous)
                                    .strokeBorder(.white.opacity(0.85), lineWidth: 1)
                            }
                    }
                    .buttonStyle(.plain)

                    Text("当前原生播放模块支持从“文件”导入单首音频。播放列表、歌词同步和视觉引擎仍在迁移中。")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, 24)
                .padding(.top, 28)
                .padding(.bottom, 36)
            }
        }
        .navigationTitle("音乐与播放")
        .navigationBarTitleDisplayMode(.inline)
        .fileImporter(
            isPresented: $showingImporter,
            allowedContentTypes: [.audio],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                guard let url = urls.first else { return }
                do {
                    try player.load(url: url)
                } catch {
                    importError = error.localizedDescription
                }
            case .failure(let error):
                importError = error.localizedDescription
            }
        }
        .alert("无法导入音频", isPresented: Binding(
            get: { importError != nil },
            set: { if !$0 { importError = nil } }
        )) {
            Button("好", role: .cancel) { importError = nil }
        } message: {
            Text(importError ?? "")
        }
    }

    private var artwork: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 34, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.83, green: 0.88, blue: 0.95),
                            Color(red: 0.88, green: 0.84, blue: 0.93),
                            Color(red: 0.83, green: 0.91, blue: 0.89)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Circle()
                .fill(.white.opacity(0.35))
                .frame(width: 180, height: 180)
                .blur(radius: 2)
            Image(systemName: "waveform")
                .font(.system(size: 64, weight: .light))
                .foregroundStyle(Color(red: 0.36, green: 0.47, blue: 0.65))
        }
        .frame(maxWidth: 290)
        .frame(height: 290)
        .overlay {
            RoundedRectangle(cornerRadius: 34, style: .continuous)
                .strokeBorder(.white.opacity(0.85), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.06), radius: 22, x: 0, y: 10)
    }

    private var ink: Color { Color(red: 0.17, green: 0.21, blue: 0.29) }
}
