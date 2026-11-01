import SwiftUI
import AVFoundation

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
