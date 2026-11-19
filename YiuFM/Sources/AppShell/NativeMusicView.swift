import SwiftUI
import UniformTypeIdentifiers

struct NativeMusicView: View {
    @ObservedObject var player: YiuAudioPlayer
    @ObservedObject var appearance: NativeAppearanceStore
    @AppStorage("yiufm.native.typography.family") private var lyricFamilyID = NativeFontFamily.serif.rawValue
    @AppStorage("yiufm.native.typography.scale") private var lyricScale = 1.0
    @AppStorage("yiufm.native.typography.weight") private var lyricWeightValue = 0.78
    @AppStorage("yiufm.native.typography.color") private var lyricColorHex = "#FFFFFF"
    @AppStorage("yiufm.native.system.haptics") private var hapticsEnabled = true
    @State private var showingAudioImporter = false
    @State private var showingLyricsImporter = false
    @State private var activeAlert: MusicAlert?

    private var lrcType: UTType { UTType(filenameExtension: "lrc") ?? .plainText }

    var body: some View {
        ZStack {
            NativeAppBackground(appearance: appearance)

            ScrollView(showsIndicators: false) {
                VStack(spacing: 22) {
                    artwork
                    trackInfo
                    playbackProgress
                    transportControls
                    lyricsPanel
                    importActions
                }
                .padding(.horizontal, 20)
                .padding(.top, 18)
                .padding(.bottom, 36)
            }
        }
        .navigationTitle("音乐与播放")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink {
                    NativeLibraryView(player: player, appearance: appearance)
                } label: {
                    Image(systemName: "list.bullet")
                        .font(.system(size: 16, weight: .semibold))
                }
                .accessibilityLabel("播放队列")
            }
        }
        .fileImporter(isPresented: $showingAudioImporter, allowedContentTypes: [.audio], allowsMultipleSelection: true) { result in
            do {
                _ = try player.importAudio(urls: result.get())
            } catch {
                activeAlert = MusicAlert(message: error.localizedDescription)
            }
        }
        .fileImporter(isPresented: $showingLyricsImporter, allowedContentTypes: [lrcType, .plainText], allowsMultipleSelection: true) { result in
            do {
                let count = try player.importLyrics(urls: result.get())
                if count == 0 {
                    activeAlert = MusicAlert(message: "没有找到可关联的 LRC 文件。文件名需要与歌曲文件名一致。")
                }
            } catch {
                activeAlert = MusicAlert(message: error.localizedDescription)
            }
        }
        .alert(item: $activeAlert) { alert in
            Alert(title: Text("音乐库"), message: Text(alert.message), dismissButton: .default(Text("好")))
        }
        .onChange(of: player.errorMessage) { _, value in
            if let value { activeAlert = MusicAlert(message: value); player.clearError() }
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
                    RoundedRectangle(cornerRadius: 32, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.82, green: 0.88, blue: 0.96),
                                    Color(red: 0.89, green: 0.84, blue: 0.94),
                                    Color(red: 0.82, green: 0.92, blue: 0.89)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    Circle()
                        .fill(.white.opacity(0.4))
                        .frame(width: 190, height: 190)
                        .blur(radius: 2)
                    Image(systemName: "waveform")
                        .font(.system(size: 62, weight: .light))
                        .foregroundStyle(Color(red: 0.36, green: 0.48, blue: 0.67))
                }
            }
        }
        .frame(maxWidth: 300)
        .frame(height: 250)
        .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 32, style: .continuous)
                .strokeBorder(.white.opacity(0.9), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.06), radius: 20, x: 0, y: 10)
    }

    private var trackInfo: some View {
        VStack(spacing: 6) {
            Text(player.currentTrack?.title ?? "还没有选择歌曲")
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundStyle(ink)
                .multilineTextAlignment(.center)
                .lineLimit(2)
            Text(player.currentTrack.map { $0.artist.isEmpty ? "本地音乐" : $0.artist } ?? "从文件中导入音频开始播放")
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
            if let album = player.currentTrack?.album, !album.isEmpty {
                Text(album)
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var playbackProgress: some View {
        VStack(spacing: 7) {
            Slider(value: Binding(get: { player.currentTime }, set: { player.seek(to: $0) }), in: 0...max(player.duration, 1))
                .tint(Color(red: 0.42, green: 0.55, blue: 0.76))
                .disabled(!player.hasTrack)

            HStack {
                Text(player.formattedTime(player.currentTime))
                Spacer()
                Text(player.formattedTime(player.duration))
            }
            .font(.system(size: 11, weight: .medium, design: .rounded))
            .foregroundStyle(.secondary)
        }
    }

    private var transportControls: some View {
        HStack(spacing: 0) {
            Button {
                NativeHaptics.selection(enabled: hapticsEnabled)
                player.toggleShuffle()
            } label: {
                Image(systemName: "shuffle")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(player.shuffleEnabled ? accent : .secondary)
                    .frame(maxWidth: .infinity)
            }
            .accessibilityLabel(player.shuffleEnabled ? "关闭随机播放" : "开启随机播放")

            Button {
                NativeHaptics.selection(enabled: hapticsEnabled)
                player.previousTrack()
            } label: {
                Image(systemName: "backward.end.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(ink)
                    .frame(maxWidth: .infinity)
            }
            .disabled(!player.hasTrack || player.tracks.count < 2)

            Button {
                NativeHaptics.impact(enabled: hapticsEnabled)
                player.togglePlayback()
            } label: {
                Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                    .font(.system(size: 22, weight: .bold))
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
                    .shadow(color: accent.opacity(0.22), radius: 14, x: 0, y: 7)
            }
            .buttonStyle(.plain)
            .disabled(!player.hasTrack)
            .accessibilityLabel(player.isPlaying ? "暂停" : "播放")

            Button {
                NativeHaptics.selection(enabled: hapticsEnabled)
                player.nextTrack()
            } label: {
                Image(systemName: "forward.end.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(ink)
                    .frame(maxWidth: .infinity)
            }
            .disabled(!player.hasTrack || player.tracks.count < 2)

            Button {
                NativeHaptics.selection(enabled: hapticsEnabled)
                player.cycleRepeatMode()
            } label: {
                Image(systemName: player.repeatMode.symbol)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(player.repeatMode == .off ? .secondary : accent)
                    .frame(maxWidth: .infinity)
                    .overlay(alignment: .bottom) {
                        if player.repeatMode != .off {
                            Text(player.repeatMode == .all ? "列表" : "单曲")
                                .font(.system(size: 8, weight: .semibold))
                                .offset(y: 12)
                        }
                    }
            }
            .accessibilityLabel(player.repeatMode.title)
        }
        .padding(.vertical, 4)
    }

    private var lyricsPanel: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("歌词")
                        .font(.system(size: 17, weight: .bold, design: .rounded))
                        .foregroundStyle(ink)
                    Text(player.lyrics.isEmpty ? "导入同名 .lrc 文件以同步歌词" : "\(player.lyrics.count) 行 · 点击歌词可跳转")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if !player.lyrics.isEmpty {
                    HStack(spacing: 6) {
                        Button { player.adjustLyricsOffset(by: -0.1) } label: {
                            Image(systemName: "minus")
                                .font(.system(size: 10, weight: .bold))
                                .frame(width: 26, height: 26)
                                .background(.white.opacity(0.74), in: Circle())
                        }
                        Text(String(format: "%+.1fs", player.currentLyricsOffset))
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .monospacedDigit()
                            .frame(minWidth: 42)
                        Button { player.adjustLyricsOffset(by: 0.1) } label: {
                            Image(systemName: "plus")
                                .font(.system(size: 10, weight: .bold))
                                .frame(width: 26, height: 26)
                                .background(.white.opacity(0.74), in: Circle())
                        }
                    }
                    .foregroundStyle(accent)
                    .accessibilityElement(children: .contain)
                    .accessibilityLabel("歌词时间偏移")
                }
            }

            if player.lyrics.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "text.quote")
                        .font(.system(size: 25, weight: .light))
                        .foregroundStyle(accent.opacity(0.7))
                    Text("暂无歌词")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(ink)
                    Text("将 LRC 文件与音频一起导入，或单独导入同名 LRC 文件。")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 26)
            } else {
                ScrollViewReader { proxy in
                    ScrollView(showsIndicators: false) {
                        LazyVStack(alignment: .leading, spacing: 14) {
                            ForEach(player.lyrics) { line in
                                Button {
                                    NativeHaptics.selection(enabled: hapticsEnabled)
                                    player.seekToLyric(line)
                                } label: {
                                    lyricRow(line)
                                }
                                .buttonStyle(.plain)
                                .id(line.id)
                            }
                        }
                        .padding(.vertical, 12)
                    }
                    .frame(height: 240)
                    .onChange(of: player.currentLyricIndex) { _, index in
                        withAnimation(.easeInOut(duration: 0.25)) {
                            proxy.scrollTo(index, anchor: .center)
                        }
                    }
                    .onAppear {
                        proxy.scrollTo(player.currentLyricIndex, anchor: .center)
                    }
                }
            }
        }
        .padding(17)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(.white.opacity(0.85), lineWidth: 1)
        }
    }

    @ViewBuilder
    private func lyricRow(_ line: YiuLyricLine) -> some View {
        let active = line.id == player.currentLyricIndex
        if active, let wordTimes = line.wordTimes, wordTimes.count == line.text.count {
            HStack(spacing: 0) {
                ForEach(Array(line.text.enumerated()), id: \.offset) { index, character in
                    Text(String(character))
                        .font(.system(size: CGFloat(18 * lyricScale), weight: lyricFontWeight, design: lyricFontFamily.design))
                        .foregroundStyle(wordTimes[index] <= player.currentTime - player.currentLyricsOffset ? lyricColor : lyricColor.opacity(0.28))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 2)
        } else {
            Text(line.text)
                .font(.system(size: CGFloat((active ? 18 : 15) * lyricScale), weight: active ? lyricFontWeight : .medium, design: lyricFontFamily.design))
                .foregroundStyle(active ? lyricColor : lyricColor.opacity(0.42))
                .frame(maxWidth: .infinity, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.vertical, 2)
        }
    }

    private var importActions: some View {
        VStack(spacing: 10) {
            HStack(spacing: 10) {
                Button { NativeHaptics.selection(enabled: hapticsEnabled); showingAudioImporter = true } label: {
                    Label("导入音频", systemImage: "plus").frame(maxWidth: .infinity)
                }
                .buttonStyle(PrimaryNativeButtonStyle())

                Button { NativeHaptics.selection(enabled: hapticsEnabled); showingLyricsImporter = true } label: {
                    Label("导入 LRC", systemImage: "text.alignleft").frame(maxWidth: .infinity)
                }
                .buttonStyle(SecondaryNativeButtonStyle())
            }

            HStack(spacing: 6) {
                Image(systemName: "tray.full")
                Text("曲库 \(player.tracks.count) 首")
                Spacer()
                NavigationLink {
                    NativeLibraryView(player: player, appearance: appearance)
                } label: {
                    HStack(spacing: 4) {
                        Text("管理曲库")
                        Image(systemName: "chevron.right")
                    }
                    .font(.system(size: 11, weight: .semibold))
                }
            }
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 2)

            if let message = player.libraryMessage, !message.isEmpty {
                Text(message)
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var lyricFontFamily: NativeFontFamily { NativeFontFamily(rawValue: lyricFamilyID) ?? .serif }
    private var lyricColor: Color { Color(nativeHex: lyricColorHex) }
    private var lyricFontWeight: Font.Weight {
        switch lyricWeightValue {
        case ..<0.48: return .medium
        case ..<0.62: return .semibold
        case ..<0.78: return .bold
        case ..<0.91: return .heavy
        default: return .black
        }
    }

    private var ink: Color { Color(red: 0.17, green: 0.21, blue: 0.29) }
    private var accent: Color { Color(red: 0.40, green: 0.54, blue: 0.75) }
}

private struct PrimaryNativeButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(.white)
            .frame(height: 46)
            .background(Color(red: 0.39, green: 0.52, blue: 0.72), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            .opacity(configuration.isPressed ? 0.82 : 1)
    }
}

private struct SecondaryNativeButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(Color(red: 0.35, green: 0.46, blue: 0.65))
            .frame(height: 46)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .strokeBorder(.white.opacity(0.88), lineWidth: 1)
            }
            .opacity(configuration.isPressed ? 0.82 : 1)
    }
}

private struct MusicAlert: Identifiable {
    let id = UUID()
    let message: String
}
