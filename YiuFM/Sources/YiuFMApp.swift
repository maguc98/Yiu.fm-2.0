import SwiftUI
import AVFoundation
import UniformTypeIdentifiers

@main
struct YiuFMApp: App {
    @StateObject private var audioPlayer = YiuAudioPlayer()
    var body: some Scene {
        WindowGroup {
            YiuHomeView().environmentObject(audioPlayer).preferredColorScheme(.dark)
        }
    }
}

private enum YiuPalette {
    static let ink = Color(red: 0.035, green: 0.045, blue: 0.095)
    static let violet = Color(red: 0.55, green: 0.38, blue: 1.0)
    static let cyan = Color(red: 0.30, green: 0.88, blue: 1.0)
    static let pink = Color(red: 1.0, green: 0.42, blue: 0.76)
    static let muted = Color.white.opacity(0.58)
}

private enum YiuTab: String, CaseIterable {
    case home = "发现"
    case library = "曲库"
    case visual = "视觉"
    case settings = "设置"

    var symbol: String {
        switch self {
        case .home: return "sparkles"
        case .library: return "square.stack"
        case .visual: return "waveform"
        case .settings: return "slider.horizontal.3"
        }
    }
}

struct YiuHomeView: View {
    @EnvironmentObject private var audioPlayer: YiuAudioPlayer
    @State private var selectedTab: YiuTab = .home
    @State private var showingAudioImporter = false
    @State private var glow = false

    var body: some View {
        ZStack {
            YiuAtmosphere()
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 27) {
                    header
                    hero
                    nowPlaying
                    engineSection
                    collectionSection
                    footer
                }
                .padding(.horizontal, 22)
                .padding(.top, 18)
                .padding(.bottom, 28)
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            tabBar
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 3.2).repeatForever(autoreverses: true)) {
                glow = true
            }
        }
        .fileImporter(isPresented: $showingAudioImporter, allowedContentTypes: [.audio], allowsMultipleSelection: false) { result in
            if case .success(let urls) = result, let url = urls.first {
                do { try audioPlayer.load(url: url) } catch { audioPlayer.report(error: error) }
            }
        }
    }

    private var header: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 3) {
                Text("Yiu.fm")
                    .font(.system(size: 27, weight: .bold, design: .rounded))
                    .tracking(-1.2)
                Text("YOUR MUSIC, YOUR UNIVERSE")
                    .font(.system(size: 8, weight: .semibold, design: .rounded))
                    .tracking(2.2)
                    .foregroundStyle(YiuPalette.muted)
            }
            Spacer()
            Button {} label: {
                Image(systemName: "person.crop.circle")
                    .font(.system(size: 19, weight: .medium))
                    .foregroundStyle(.white.opacity(0.9))
                    .frame(width: 43, height: 43)
                    .background(.white.opacity(0.07), in: Circle())
                    .overlay(Circle().stroke(.white.opacity(0.12), lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
    }

    private var hero: some View {
        ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: 30, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.24, green: 0.16, blue: 0.52),
                            Color(red: 0.12, green: 0.25, blue: 0.48),
                            Color(red: 0.08, green: 0.48, blue: 0.53)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Circle()
                .fill(YiuPalette.pink.opacity(0.65))
                .frame(width: 170, height: 170)
                .blur(radius: 48)
                .offset(x: glow ? 215 : 175, y: glow ? -85 : -55)
            Circle()
                .fill(YiuPalette.cyan.opacity(0.65))
                .frame(width: 150, height: 150)
                .blur(radius: 45)
                .offset(x: glow ? 5 : 35, y: glow ? 65 : 90)
            OrbitalArtwork()
                .padding(.trailing, 8)
                .padding(.top, 10)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
            VStack(alignment: .leading, spacing: 10) {
                Text("SOUND IN MOTION")
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .tracking(2.8)
                    .foregroundStyle(.white.opacity(0.72))
                Text("让每一段旋律\n都有自己的光。")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .tracking(-0.8)
                    .lineSpacing(3)
                HStack(spacing: 7) {
                    Image(systemName: "sparkle")
                    Text("探索你的音乐宇宙")
                }
                .font(.system(size: 11, weight: .semibold))
                .padding(.horizontal, 13)
                .padding(.vertical, 9)
                .background(.white.opacity(0.16), in: Capsule())
                .overlay(Capsule().stroke(.white.opacity(0.2), lineWidth: 1))
                .padding(.top, 4)
            }
            .padding(23)
        }
        .frame(height: 248)
        .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 30).stroke(.white.opacity(0.16), lineWidth: 1))
        .shadow(color: YiuPalette.violet.opacity(0.22), radius: 28, y: 12)
    }

    private var nowPlaying: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionHeading("正在播放", detail: "NOW PLAYING")
            VStack(spacing: 11) {
                HStack(spacing: 15) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 17, style: .continuous)
                            .fill(LinearGradient(colors: [YiuPalette.pink, YiuPalette.violet, YiuPalette.cyan], startPoint: .topLeading, endPoint: .bottomTrailing))
                        Circle().stroke(.white.opacity(0.55), lineWidth: 1).padding(11)
                        Circle().stroke(.white.opacity(0.3), lineWidth: 1).padding(20)
                        Image(systemName: "waveform").font(.system(size: 27, weight: .light)).foregroundStyle(.white)
                    }
                    .frame(width: 68, height: 68)
                    VStack(alignment: .leading, spacing: 5) {
                        Text(audioPlayer.title).font(.system(size: 14, weight: .semibold)).lineLimit(1)
                        Text(audioPlayer.artist.isEmpty ? "Yiu.fm · 本地音乐" : audioPlayer.artist)
                            .font(.system(size: 11)).foregroundStyle(YiuPalette.muted)
                        HStack(spacing: 3) {
                            ForEach(0..<22, id: \.self) { index in
                                Capsule().fill(index < 13 ? YiuPalette.cyan : .white.opacity(0.17))
                                    .frame(width: 2, height: CGFloat([5, 10, 15, 8, 19, 12, 7, 16][index % 8]))
                            }
                        }.padding(.top, 3)
                    }
                    Spacer(minLength: 0)
                    Button { audioPlayer.togglePlayback() } label: {
                        Image(systemName: audioPlayer.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 17, weight: .bold)).foregroundStyle(YiuPalette.ink)
                            .frame(width: 45, height: 45)
                            .background(LinearGradient(colors: [YiuPalette.cyan, Color.white], startPoint: .topLeading, endPoint: .bottomTrailing), in: Circle())
                            .shadow(color: YiuPalette.cyan.opacity(0.35), radius: 13)
                    }
                    .buttonStyle(.plain).disabled(!audioPlayer.hasTrack)
                    .opacity(audioPlayer.hasTrack ? 1 : 0.55)
                }
                if audioPlayer.hasTrack {
                    VStack(spacing: 4) {
                        Slider(value: Binding(get: { audioPlayer.currentTime }, set: { audioPlayer.seek(to: $0) }), in: 0...max(audioPlayer.duration, 0.1)).tint(YiuPalette.cyan)
                        HStack { Text(audioPlayer.formattedTime(audioPlayer.currentTime)); Spacer(); Text(audioPlayer.formattedTime(audioPlayer.duration)) }
                            .font(.system(size: 9, design: .rounded)).foregroundStyle(YiuPalette.muted)
                    }.padding(.horizontal, 3)
                }
            }
            .padding(15)
            .background(.ultraThinMaterial.opacity(0.75), in: RoundedRectangle(cornerRadius: 23, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 23).stroke(.white.opacity(0.12), lineWidth: 1))
        }
    }

    private var engineSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionHeading("视觉引擎", detail: "FOUR WORLDS")
            HStack(spacing: 10) {
                engineCard("Sonnet", subtitle: "诗意流动", colors: [YiuPalette.pink, YiuPalette.violet], icon: "sparkles")
                engineCard("Tempera", subtitle: "色彩脉冲", colors: [Color.orange, YiuPalette.pink], icon: "sun.max")
            }
            HStack(spacing: 10) {
                engineCard("Lumiere", subtitle: "光影漫游", colors: [YiuPalette.cyan, YiuPalette.violet], icon: "光")
                engineCard("Partita", subtitle: "节奏构形", colors: [Color(red: 0.42, green: 0.92, blue: 0.68), YiuPalette.cyan], icon: "waveform.path")
            }
        }
    }

    private func engineCard(_ title: String, subtitle: String, colors: [Color], icon: String) -> some View {
        Button {} label: {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: icon == "光" ? "sun.max.fill" : icon)
                        .font(.system(size: 18, weight: .medium))
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.65))
                }
                .foregroundStyle(LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing))
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.system(size: 14, weight: .bold, design: .rounded))
                    Text(subtitle).font(.system(size: 10)).foregroundStyle(YiuPalette.muted)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(15)
            .background(.white.opacity(0.055), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(.white.opacity(0.11), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var collectionSection: some View {
        VStack(alignment: .leading, spacing: 13) {
            sectionHeading("你的音乐空间", detail: "YOUR SPACE")
            Button { showingAudioImporter = true } label: {
            HStack(spacing: 12) {
                Image(systemName: "music.note.list")
                    .font(.system(size: 21))
                    .foregroundStyle(YiuPalette.cyan)
                    .frame(width: 45, height: 45)
                    .background(YiuPalette.cyan.opacity(0.1), in: RoundedRectangle(cornerRadius: 14))
                VStack(alignment: .leading, spacing: 4) {
                    Text("本地音乐库").font(.system(size: 13, weight: .semibold))
                    Text("导入歌曲，建立你的私人收藏").font(.system(size: 10)).foregroundStyle(YiuPalette.muted)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.4))
            }
            .padding(15)
            .background(.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 19, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 19).stroke(.white.opacity(0.1), lineWidth: 1))
            }.buttonStyle(.plain)
        }
    }

    private var footer: some View {
        HStack {
            Spacer()
            Text("MADE FOR THE WAY YOU FEEL")
                .font(.system(size: 8, weight: .medium, design: .rounded))
                .tracking(2)
                .foregroundStyle(.white.opacity(0.28))
            Spacer()
        }
        .padding(.top, 2)
    }

    private func sectionHeading(_ title: String, detail: String) -> some View {
        HStack(alignment: .lastTextBaseline) {
            Text(title).font(.system(size: 17, weight: .bold, design: .rounded))
            Spacer()
            Text(detail)
                .font(.system(size: 8, weight: .semibold, design: .rounded))
                .tracking(1.7)
                .foregroundStyle(YiuPalette.muted)
        }
    }

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(YiuTab.allCases, id: \.self) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    VStack(spacing: 5) {
                        Image(systemName: tab.symbol)
                            .font(.system(size: 17, weight: selectedTab == tab ? .semibold : .regular))
                        Text(tab.rawValue).font(.system(size: 9, weight: selectedTab == tab ? .semibold : .medium))
                    }
                    .foregroundStyle(selectedTab == tab ? YiuPalette.cyan : .white.opacity(0.43))
                    .frame(maxWidth: .infinity)
                    .padding(.top, 12)
                    .padding(.bottom, 8)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) { Rectangle().fill(.white.opacity(0.1)).frame(height: 0.7) }
    }
}

private struct YiuAtmosphere: View {
    var body: some View {
        ZStack {
            YiuPalette.ink.ignoresSafeArea()
            LinearGradient(
                colors: [YiuPalette.violet.opacity(0.15), .clear, YiuPalette.cyan.opacity(0.08)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            TimelineView(.animation(minimumInterval: 1.0 / 24.0, paused: false)) { timeline in
                Canvas { context, size in
                    let time = timeline.date.timeIntervalSinceReferenceDate
                    for index in 0..<95 {
                        let x = CGFloat((index * 73) % 997) / 997 * size.width
                        let baseY = CGFloat((index * 137) % 991) / 991 * size.height
                        let y = baseY + CGFloat(sin(time * 0.35 + Double(index)) * 5)
                        let diameter = CGFloat(index % 3 + 1) * 0.8
                        let rect = CGRect(x: x, y: y, width: diameter, height: diameter)
                        context.fill(Path(ellipseIn: rect), with: .color(.white.opacity(index % 5 == 0 ? 0.55 : 0.2)))
                    }
                }
            }
            .ignoresSafeArea()
        }
    }
}

private struct OrbitalArtwork: View {
    var body: some View {
        GeometryReader { proxy in
            let side = min(proxy.size.width * 0.72, 190)
            ZStack {
                ForEach(0..<3, id: \.self) { index in
                    Circle()
                        .stroke(.white.opacity(0.2 - Double(index) * 0.035), lineWidth: 0.8)
                        .frame(width: side - CGFloat(index) * 27, height: side - CGFloat(index) * 27)
                        .rotation3DEffect(.degrees(66), axis: (x: 1, y: 0, z: 0))
                }
                Circle()
                    .fill(RadialGradient(colors: [.white.opacity(0.9), YiuPalette.cyan.opacity(0.65), YiuPalette.violet.opacity(0.12), .clear], center: .center, startRadius: 2, endRadius: side * 0.45))
                    .frame(width: side * 0.72, height: side * 0.72)
                    .blur(radius: 2)
                Circle()
                    .fill(.white)
                    .frame(width: 5, height: 5)
                    .shadow(color: YiuPalette.cyan, radius: 10)
                    .offset(x: side * 0.42, y: -side * 0.1)
            }
            .frame(width: proxy.size.width, height: proxy.size.height)
        }
        .allowsHitTesting(false)
    }
}


// MARK: - Native local audio playback
@MainActor
final class YiuAudioPlayer: ObservableObject {
    @Published private(set) var title = "选择一首本地歌曲"
    @Published private(set) var artist = ""
    @Published private(set) var isPlaying = false
    @Published private(set) var currentTime: Double = 0
    @Published private(set) var duration: Double = 0
    @Published private(set) var hasTrack = false
    @Published private(set) var errorMessage: String?
    private var player: AVAudioPlayer?
    private var progressTimer: Timer?

    func load(url: URL) throws {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        let fm = FileManager.default
        let folder = fm.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("YiuMusic", isDirectory: true)
        try fm.createDirectory(at: folder, withIntermediateDirectories: true)
        let destination = folder.appendingPathComponent(url.lastPathComponent)
        if destination.standardizedFileURL != url.standardizedFileURL {
            if fm.fileExists(atPath: destination.path) { try fm.removeItem(at: destination) }
            try fm.copyItem(at: url, to: destination)
        }
        let next = try AVAudioPlayer(contentsOf: destination)
        next.prepareToPlay()
        player?.stop()
        player = next
        title = destination.deletingPathExtension().lastPathComponent
        artist = "本地文件"
        duration = next.duration
        currentTime = 0
        hasTrack = true
        isPlaying = false
        errorMessage = nil
        progressTimer?.invalidate()
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, let active = self.player else { return }
                self.currentTime = active.currentTime
                self.isPlaying = active.isPlaying
                if !active.isPlaying && active.currentTime >= active.duration {
                    self.currentTime = 0
                }
            }
        }
    }

    func togglePlayback() {
        guard let player else { return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
            if player.isPlaying { player.pause(); isPlaying = false }
            else if player.play() { isPlaying = true }
        } catch { report(error: error) }
    }

    func seek(to value: Double) {
        guard let player else { return }
        let target = min(max(value, 0), duration)
        player.currentTime = target
        currentTime = target
    }

    func formattedTime(_ value: Double) -> String {
        guard value.isFinite, value >= 0 else { return "0:00" }
        let total = Int(value)
        return "\(total / 60):" + String(format: "%02d", total % 60)
    }

    func report(error: Error) { errorMessage = error.localizedDescription }



    deinit { progressTimer?.invalidate() }
}
