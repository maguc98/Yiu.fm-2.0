import SwiftUI
import AVFoundation
import Foundation
import CoreFoundation

struct YiuTrack: Identifiable, Codable, Hashable {
    var id: String
    var sourceName: String
    var fileName: String
    var title: String
    var artist: String
    var album: String
    var fileSize: Int64
    var duration: Double
    var lyricsFileName: String?
    var lyricsOffset: Double
    var addedAt: Date

    var hasLyrics: Bool { lyricsFileName != nil }
}

enum YiuRepeatMode: String, CaseIterable, Identifiable {
    case off
    case all
    case one

    var id: String { rawValue }
    var title: String {
        switch self {
        case .off: return "不循环"
        case .all: return "列表循环"
        case .one: return "单曲循环"
        }
    }
    var symbol: String {
        switch self {
        case .off: return "repeat"
        case .all: return "repeat"
        case .one: return "repeat.1"
        }
    }

    mutating func cycle() {
        switch self {
        case .off: self = .all
        case .all: self = .one
        case .one: self = .off
        }
    }
}

enum YiuMusicError: LocalizedError {
    case unsupportedAudio(String)
    case invalidLyrics(String)
    case noMatchingTrack(String)
    case missingAudio
    case invalidTrack
    case unsupportedBackup
    case invalidBackup
    case backupTooLarge

    var errorDescription: String? {
        switch self {
        case .unsupportedAudio(let name):
            return "无法解码音频文件：\(name)。请确认它是 iOS 支持的音频格式。"
        case .invalidLyrics(let name):
            return "没有在歌词文件中找到有效的时间标签：\(name)"
        case .noMatchingTrack(let name):
            return "曲库中没有找到与「\(name)」同名的歌曲。请先导入音频。"
        case .missingAudio:
            return "歌曲文件不存在，请重新导入。"
        case .invalidTrack:
            return "找不到这首歌曲。"
        case .unsupportedBackup:
            return "这个备份版本不受支持，或备份中的曲目数量不正确。"
        case .invalidBackup:
            return "备份包含重复的曲目标识，无法安全恢复。"
        case .backupTooLarge:
            return "备份文件过大，当前版本无法安全地一次性恢复。"
        }
    }
}

private struct YiuMusicBackupPayload: Codable {
    let version: Int
    let createdAt: Date
    let tracks: [YiuMusicBackupTrack]
    let currentTrackID: String?
}

private struct YiuMusicBackupTrack: Codable {
    let track: YiuTrack
    let audioData: Data
    let lyricsData: Data?
}

@MainActor
final class YiuAudioPlayer: ObservableObject {
    @Published private(set) var tracks: [YiuTrack] = []
    @Published private(set) var currentTrackID: String?
    @Published private(set) var isPlaying = false
    @Published private(set) var currentTime: Double = 0
    @Published private(set) var duration: Double = 0
    @Published private(set) var audioLevel: Double = 0
    @Published private(set) var lyrics: [YiuLyricLine] = []
    @Published private(set) var currentLyricIndex = 0
    @Published private(set) var errorMessage: String?
    @Published private(set) var libraryMessage: String?
    @Published var shuffleEnabled = false
    @Published var repeatMode: YiuRepeatMode = .off

    private var audioPlayer: AVAudioPlayer?
    private var progressTimer: Timer?
    private let fileManager = FileManager.default

    private var musicRoot: URL {
        fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Yiu.fm", isDirectory: true)
    }
    private var audioDirectory: URL { musicRoot.appendingPathComponent("Audio", isDirectory: true) }
    private var lyricsDirectory: URL { musicRoot.appendingPathComponent("Lyrics", isDirectory: true) }
    private var libraryURL: URL { musicRoot.appendingPathComponent("library.json") }

    var currentTrack: YiuTrack? {
        guard let currentTrackID else { return nil }
        return tracks.first { $0.id == currentTrackID }
    }
    var hasTrack: Bool { currentTrack != nil }
    var currentLyric: YiuLyricLine? {
        guard lyrics.indices.contains(currentLyricIndex) else { return nil }
        return lyrics[currentLyricIndex]
    }
    var currentLyricsOffset: Double { currentTrack?.lyricsOffset ?? 0 }

    init() {
        do {
            try ensureDirectories()
            restoreLibrary()
            if let id = currentTrackID {
                try loadTrack(id: id, autoplay: false, persistSelection: false)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.12, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in self?.refreshClock() }
        }
    }

    deinit {
        progressTimer?.invalidate()
    }

    func importAudio(urls: [URL]) throws -> Int {
        try ensureDirectories()
        var added = 0
        var failures: [String] = []

        for source in urls {
            let accessed = source.startAccessingSecurityScopedResource()
            defer { if accessed { source.stopAccessingSecurityScopedResource() } }

            let attributes = try? fileManager.attributesOfItem(atPath: source.path)
            let size = (attributes?[.size] as? NSNumber)?.int64Value ?? 0
            let sourceName = source.lastPathComponent
            if tracks.contains(where: {
                $0.sourceName.compare(sourceName, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame &&
                $0.fileSize == size
            }) {
                continue
            }

            let id = UUID().uuidString
            let ext = source.pathExtension.isEmpty ? "audio" : source.pathExtension.lowercased()
            let storedName = id + "." + ext
            let destination = audioDirectory.appendingPathComponent(storedName)

            do {
                try fileManager.copyItem(at: source, to: destination)
                let probe = try AVAudioPlayer(contentsOf: destination)
                let title = source.deletingPathExtension().lastPathComponent
                let track = YiuTrack(
                    id: id,
                    sourceName: sourceName,
                    fileName: storedName,
                    title: title,
                    artist: "",
                    album: "",
                    fileSize: size,
                    duration: probe.duration,
                    lyricsFileName: nil,
                    lyricsOffset: 0,
                    addedAt: Date()
                )
                tracks.insert(track, at: 0)
                do {
                    try saveLibrary()
                    added += 1
                } catch {
                    tracks.removeAll { $0.id == id }
                    throw error
                }
            } catch {
                try? fileManager.removeItem(at: destination)
                failures.append(sourceName + ": " + error.localizedDescription)
            }
        }

        if let first = tracks.first, currentTrackID == nil {
            try loadTrack(id: first.id, autoplay: false)
        }
        libraryMessage = added > 0 ? "已导入 \(added) 首歌曲" : (failures.isEmpty ? "所选歌曲已在曲库中" : failures.joined(separator: "\n"))
        if added == 0, let firstFailure = failures.first {
            throw YiuMusicError.unsupportedAudio(firstFailure)
        }
        return added
    }

    func importLyrics(urls: [URL]) throws -> Int {
        try ensureDirectories()
        var attached = 0
        for source in urls {
            let accessed = source.startAccessingSecurityScopedResource()
            defer { if accessed { source.stopAccessingSecurityScopedResource() } }

            guard source.pathExtension.lowercased() == "lrc" else { continue }
            let baseName = source.deletingPathExtension().lastPathComponent
            guard let trackIndex = tracks.firstIndex(where: {
                let trackStem = URL(fileURLWithPath: $0.sourceName).deletingPathExtension().lastPathComponent
                return trackStem.compare(baseName, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame
                    || $0.title.compare(baseName, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame
            }) else {
                throw YiuMusicError.noMatchingTrack(baseName)
            }

            let data = try Data(contentsOf: source)
            let text = decodeLyrics(data)
            let parsed = YiuLRCParser.parse(text)
            guard !parsed.lines.isEmpty else { throw YiuMusicError.invalidLyrics(source.lastPathComponent) }

            let storedName = UUID().uuidString + ".lrc"
            try data.write(to: lyricsDirectory.appendingPathComponent(storedName), options: .atomic)
            let previousLyricsFile = tracks[trackIndex].lyricsFileName
            tracks[trackIndex].lyricsFileName = storedName
            if let previousLyricsFile {
                try? fileManager.removeItem(at: lyricsDirectory.appendingPathComponent(previousLyricsFile))
            }
            if let title = parsed.metadata["ti"], !title.isEmpty { tracks[trackIndex].title = title }
            if let artist = parsed.metadata["ar"], !artist.isEmpty { tracks[trackIndex].artist = artist }
            if let rawOffset = parsed.metadata["offset"], let milliseconds = Double(rawOffset) {
                tracks[trackIndex].lyricsOffset = milliseconds / 1000
            }
            attached += 1
            try saveLibrary()

            if tracks[trackIndex].id == currentTrackID {
                lyrics = parsed.lines
                refreshLyricIndex()
            }
        }
        libraryMessage = attached > 0 ? "已关联 \(attached) 份歌词" : "没有关联新的歌词"
        return attached
    }

    func selectTrack(_ id: String, autoplay: Bool = true) {
        do { try loadTrack(id: id, autoplay: autoplay) }
        catch { errorMessage = error.localizedDescription }
    }

    func togglePlayback() {
        guard let audioPlayer else { return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
            if audioPlayer.isPlaying {
                audioPlayer.pause()
                isPlaying = false
            } else if audioPlayer.play() {
                isPlaying = true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func seek(to value: Double) {
        guard let audioPlayer else { return }
        let target = min(max(value, 0), duration)
        audioPlayer.currentTime = target
        currentTime = target
        refreshLyricIndex()
    }

    func seekToLyric(_ line: YiuLyricLine) {
        let target = max(0, line.time + currentLyricsOffset)
        seek(to: target)
    }

    func adjustLyricsOffset(by delta: Double) {
        guard let currentTrackID,
              let index = tracks.firstIndex(where: { $0.id == currentTrackID }) else { return }
        tracks[index].lyricsOffset = min(10, max(-10, tracks[index].lyricsOffset + delta))
        try? saveLibrary()
        refreshLyricIndex()
    }

    func previousTrack() {
        guard !tracks.isEmpty else { return }
        if currentTime > 3 {
            seek(to: 0)
            return
        }
        moveTrack(by: -1, automatic: false)
    }

    func nextTrack() {
        moveTrack(by: 1, automatic: false)
    }

    func toggleShuffle() {
        shuffleEnabled.toggle()
    }

    func cycleRepeatMode() {
        repeatMode.cycle()
    }

    func removeTrack(_ id: String) {
        guard let index = tracks.firstIndex(where: { $0.id == id }) else { return }
        let wasCurrent = currentTrackID == id
        let nextCandidate = tracks.dropFirst(index + 1).first ?? tracks.prefix(index).last
        if wasCurrent {
            audioPlayer?.stop()
            audioPlayer = nil
            isPlaying = false
            currentTrackID = nil
            currentTime = 0
            duration = 0
            lyrics = []
            currentLyricIndex = 0
        }
        let removed = tracks.remove(at: index)
        try? fileManager.removeItem(at: audioDirectory.appendingPathComponent(removed.fileName))
        if let lyricName = removed.lyricsFileName {
            try? fileManager.removeItem(at: lyricsDirectory.appendingPathComponent(lyricName))
        }
        try? saveLibrary()
        if wasCurrent, let nextCandidate, tracks.contains(where: { $0.id == nextCandidate.id }) {
            try? loadTrack(id: nextCandidate.id, autoplay: false)
        }
        libraryMessage = "已从曲库移除歌曲"
    }

    func moveTracks(from source: IndexSet, to destination: Int) {
        let moving = source.sorted().map { tracks[$0] }
        tracks.remove(atOffsets: source)
        let adjusted = max(0, min(tracks.count, destination - source.filter { $0 < destination }.count))
        tracks.insert(contentsOf: moving, at: adjusted)
        try? saveLibrary()
    }

    func clearError() { errorMessage = nil }

    func formattedTime(_ value: Double) -> String {
        guard value.isFinite, value >= 0 else { return "0:00" }
        let total = Int(value)
        return "\(total / 60):" + String(format: "%02d", total % 60)
    }

    func createBackupData() throws -> Data {
        try ensureDirectories()
        var estimatedAudioBytes: Int64 = 0
        for track in tracks {
            let url = audioDirectory.appendingPathComponent(track.fileName)
            let attributes = try fileManager.attributesOfItem(atPath: url.path)
            estimatedAudioBytes += (attributes[.size] as? NSNumber)?.int64Value ?? 0
        }
        guard estimatedAudioBytes <= 650_000_000 else { throw YiuMusicError.backupTooLarge }

        let entries = try tracks.map { track -> YiuMusicBackupTrack in
            let audioURL = audioDirectory.appendingPathComponent(track.fileName)
            guard fileManager.fileExists(atPath: audioURL.path) else {
                throw YiuMusicError.missingAudio
            }
            let audioData = try Data(contentsOf: audioURL)
            let lyricsData: Data?
            if let lyricsFileName = track.lyricsFileName {
                let lyricsURL = lyricsDirectory.appendingPathComponent(lyricsFileName)
                lyricsData = try Data(contentsOf: lyricsURL)
            } else {
                lyricsData = nil
            }
            return YiuMusicBackupTrack(track: track, audioData: audioData, lyricsData: lyricsData)
        }

        let payload = YiuMusicBackupPayload(
            version: 1,
            createdAt: Date(),
            tracks: entries,
            currentTrackID: currentTrackID
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return try encoder.encode(payload)
    }

    func restoreBackupData(_ data: Data) throws {
        guard data.count <= 900_000_000 else {
            throw YiuMusicError.backupTooLarge
        }
        let payload = try JSONDecoder().decode(YiuMusicBackupPayload.self, from: data)
        guard payload.version == 1, payload.tracks.count <= 1000 else {
            throw YiuMusicError.unsupportedBackup
        }

        try ensureDirectories()
        let restoreID = UUID().uuidString
        let stageRoot = musicRoot.appendingPathComponent("Restore-\(restoreID)", isDirectory: true)
        let stageAudio = stageRoot.appendingPathComponent("Audio", isDirectory: true)
        let stageLyrics = stageRoot.appendingPathComponent("Lyrics", isDirectory: true)
        let oldAudio = musicRoot.appendingPathComponent("Audio-old-\(restoreID)", isDirectory: true)
        let oldLyrics = musicRoot.appendingPathComponent("Lyrics-old-\(restoreID)", isDirectory: true)
        try fileManager.createDirectory(at: stageAudio, withIntermediateDirectories: true)
        try fileManager.createDirectory(at: stageLyrics, withIntermediateDirectories: true)
        defer { try? fileManager.removeItem(at: stageRoot) }

        var restoredTracks: [YiuTrack] = []
        var identifierMap: [String: String] = [:]
        var usedSourceIDs = Set<String>()

        for entry in payload.tracks {
            let newID = UUID().uuidString
            let rawExtension = URL(fileURLWithPath: entry.track.fileName).pathExtension.lowercased()
            let safeExtension = rawExtension.range(of: #"^[a-z0-9]{1,8}$"#, options: .regularExpression) != nil
                ? rawExtension
                : "audio"
            let newAudioName = newID + "." + safeExtension
            let stagedAudioURL = stageAudio.appendingPathComponent(newAudioName)
            try entry.audioData.write(to: stagedAudioURL, options: .atomic)
            let validationPlayer = try AVAudioPlayer(contentsOf: stagedAudioURL)
            guard validationPlayer.duration.isFinite else { throw YiuMusicError.unsupportedAudio(entry.track.sourceName) }

            var newLyricsName: String?
            if let lyricsData = entry.lyricsData {
                let name = newID + ".lrc"
                try lyricsData.write(to: stageLyrics.appendingPathComponent(name), options: .atomic)
                newLyricsName = name
            }

            var track = entry.track
            let oldID = track.id
            if !usedSourceIDs.insert(oldID).inserted {
                throw YiuMusicError.invalidBackup
            }
            identifierMap[oldID] = newID
            track.id = newID
            track.fileName = newAudioName
            track.fileSize = Int64(entry.audioData.count)
            track.lyricsFileName = newLyricsName
            restoredTracks.append(track)
        }

        let previousTracks = tracks
        let previousCurrentID = currentTrackID
        audioPlayer?.stop()
        audioPlayer = nil
        isPlaying = false

        do {
            try fileManager.moveItem(at: audioDirectory, to: oldAudio)
            do {
                try fileManager.moveItem(at: lyricsDirectory, to: oldLyrics)
            } catch {
                try? fileManager.moveItem(at: oldAudio, to: audioDirectory)
                throw error
            }

            do {
                try fileManager.moveItem(at: stageAudio, to: audioDirectory)
                try fileManager.moveItem(at: stageLyrics, to: lyricsDirectory)
            } catch {
                try? fileManager.removeItem(at: audioDirectory)
                try? fileManager.removeItem(at: lyricsDirectory)
                try? fileManager.moveItem(at: oldAudio, to: audioDirectory)
                try? fileManager.moveItem(at: oldLyrics, to: lyricsDirectory)
                throw error
            }

            tracks = restoredTracks
            currentTrackID = payload.currentTrackID.flatMap { identifierMap[$0] }
            try saveLibrary()
        } catch {
            if fileManager.fileExists(atPath: oldAudio.path) {
                try? fileManager.removeItem(at: audioDirectory)
                try? fileManager.moveItem(at: oldAudio, to: audioDirectory)
            }
            if fileManager.fileExists(atPath: oldLyrics.path) {
                try? fileManager.removeItem(at: lyricsDirectory)
                try? fileManager.moveItem(at: oldLyrics, to: lyricsDirectory)
            }
            tracks = previousTracks
            currentTrackID = previousCurrentID
            try? saveLibrary()
            throw error
        }

        try? fileManager.removeItem(at: oldAudio)
        try? fileManager.removeItem(at: oldLyrics)

        currentTime = 0
        duration = 0
        lyrics = []
        currentLyricIndex = 0
        if let currentTrackID {
            try loadTrack(id: currentTrackID, autoplay: false, persistSelection: false)
        }
        libraryMessage = "已恢复 \(tracks.count) 首歌曲"
    }

    private func loadTrack(id: String, autoplay: Bool, persistSelection: Bool = true) throws {
        guard let track = tracks.first(where: { $0.id == id }) else { throw YiuMusicError.invalidTrack }
        let fileURL = audioDirectory.appendingPathComponent(track.fileName)
        guard fileManager.fileExists(atPath: fileURL.path) else { throw YiuMusicError.missingAudio }

        let next = try AVAudioPlayer(contentsOf: fileURL)
        next.isMeteringEnabled = true
        next.prepareToPlay()
        audioPlayer?.stop()
        audioPlayer = next
        currentTrackID = id
        duration = next.duration
        currentTime = 0
        isPlaying = false
        errorMessage = nil
        loadLyrics(for: track)
        if persistSelection { try saveLibrary() }
        if autoplay { togglePlayback() }
    }

    private func loadLyrics(for track: YiuTrack) {
        lyrics = []
        currentLyricIndex = 0
        guard let fileName = track.lyricsFileName else { return }
        let url = lyricsDirectory.appendingPathComponent(fileName)
        guard let data = try? Data(contentsOf: url) else { return }
        lyrics = YiuLRCParser.parse(decodeLyrics(data)).lines
        refreshLyricIndex()
    }

    private func decodeLyrics(_ data: Data) -> String {
        if let text = String(data: data, encoding: .utf8) { return text }
        if let text = String(data: data, encoding: .utf16) { return text }
        let encoding = String.Encoding(rawValue: CFStringConvertEncodingToNSStringEncoding(
            CFStringEncoding(CFStringEncodings.GB_18030_2000.rawValue)
        ))
        return String(data: data, encoding: encoding) ?? String(decoding: data, as: UTF8.self)
    }

    private func refreshClock() {
        guard let audioPlayer else { return }
        currentTime = audioPlayer.currentTime
        audioPlayer.updateMeters()
        let decibels = Double(audioPlayer.averagePower(forChannel: 0))
        let normalized = decibels.isFinite ? pow(10, decibels / 20) : 0
        let targetLevel = isPlaying ? min(1, max(0, normalized * 2.2)) : 0
        audioLevel = audioLevel * 0.58 + targetLevel * 0.42
        if isPlaying && !audioPlayer.isPlaying {
            let completed = duration > 0 && currentTime >= duration - 0.25
            isPlaying = false
            if completed { finishCurrentTrack() }
        }
        refreshLyricIndex()
    }

    private func refreshLyricIndex() {
        guard !lyrics.isEmpty else {
            currentLyricIndex = 0
            return
        }
        let effectiveTime = currentTime - currentLyricsOffset
        var low = 0
        var high = lyrics.count - 1
        var found = 0
        while low <= high {
            let middle = (low + high) / 2
            if lyrics[middle].time <= effectiveTime {
                found = middle
                low = middle + 1
            } else {
                high = middle - 1
            }
        }
        currentLyricIndex = found
    }

    private func finishCurrentTrack() {
        if repeatMode == .one {
            seek(to: 0)
            togglePlayback()
            return
        }
        moveTrack(by: 1, automatic: true)
    }

    private func moveTrack(by direction: Int, automatic: Bool) {
        guard !tracks.isEmpty else { return }
        guard let currentTrackID,
              let currentIndex = tracks.firstIndex(where: { $0.id == currentTrackID }) else {
            if let first = tracks.first { selectTrack(first.id, autoplay: automatic) }
            return
        }

        if shuffleEnabled && tracks.count > 1 {
            let candidates = tracks.filter { $0.id != currentTrackID }
            if let selected = candidates.randomElement() {
                selectTrack(selected.id, autoplay: automatic)
            }
            return
        }

        let nextIndex = currentIndex + direction
        if tracks.indices.contains(nextIndex) {
            selectTrack(tracks[nextIndex].id, autoplay: automatic)
        } else if automatic {
            if repeatMode == .all {
                selectTrack(direction > 0 ? tracks[0].id : tracks[tracks.count - 1].id, autoplay: true)
            } else {
                audioPlayer?.stop()
                isPlaying = false
            }
        } else {
            let wrapped = (nextIndex + tracks.count) % tracks.count
            selectTrack(tracks[wrapped].id, autoplay: false)
        }
    }

    private func ensureDirectories() throws {
        try fileManager.createDirectory(at: audioDirectory, withIntermediateDirectories: true)
        try fileManager.createDirectory(at: lyricsDirectory, withIntermediateDirectories: true)
    }

    private func restoreLibrary() {
        guard let data = try? Data(contentsOf: libraryURL),
              let library = try? JSONDecoder().decode(PersistedLibrary.self, from: data) else { return }
        // The stored array order is the user's manually arranged playback queue.
        tracks = library.tracks
        currentTrackID = library.currentTrackID
    }

    private func saveLibrary() throws {
        let library = PersistedLibrary(tracks: tracks, currentTrackID: currentTrackID)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(library)
        try data.write(to: libraryURL, options: .atomic)
    }

    private struct PersistedLibrary: Codable {
        let tracks: [YiuTrack]
        let currentTrackID: String?
    }
}
