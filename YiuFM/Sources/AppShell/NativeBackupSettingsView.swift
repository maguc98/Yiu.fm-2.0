import SwiftUI
import UniformTypeIdentifiers

struct NativeMusicBackupDocument: FileDocument {
    static let contentType = UTType(exportedAs: "com.maguc98.yiufm.music-backup", conformingTo: .data)
    static var readableContentTypes: [UTType] { [contentType] }

    let data: Data

    init(data: Data) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents else {
            throw CocoaError(.fileReadCorruptFile)
        }
        self.data = data
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

struct NativeBackupSettingsView: View {
    @ObservedObject var player: YiuAudioPlayer
    @State private var document: NativeMusicBackupDocument?
    @State private var showingExporter = false
    @State private var showingImporter = false
    @State private var showingRestoreConfirmation = false
    @State private var pendingRestoreData: Data?
    @State private var alertMessage: String?
    @State private var showingAlert = false
    @State private var lastBackupBytes: Int?

    var body: some View {
        Form {
            Section {
                HStack {
                    Label("曲库歌曲", systemImage: "music.note.list")
                    Spacer()
                    Text("\(player.tracks.count) 首")
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }

                HStack {
                    Label("关联歌词", systemImage: "text.quote")
                    Spacer()
                    Text("\(player.tracks.filter(\.hasLyrics).count) 首")
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }

                HStack {
                    Label("当前播放", systemImage: "waveform")
                    Spacer()
                    Text(player.currentTrack?.title ?? "无")
                        .lineLimit(1)
                        .foregroundStyle(.secondary)
                }
            } header: {
                Text("本机音乐库")
            }

            Section {
                Button {
                    createBackup()
                } label: {
                    Label("导出完整备份", systemImage: "square.and.arrow.up")
                }
                .disabled(player.tracks.isEmpty)

                Button {
                    showingImporter = true
                } label: {
                    Label("从备份恢复", systemImage: "square.and.arrow.down")
                }
            } header: {
                Text("备份与恢复")
            } footer: {
                Text("备份包含曲库信息、音频文件、关联的 LRC 歌词和当前选中曲目。不会包含 iCloud 音乐、在线音乐账号或第三方平台缓存。")
            }

            if let lastBackupBytes {
                Section("最近一次备份") {
                    LabeledContent("文件大小", value: ByteCountFormatter.string(fromByteCount: Int64(lastBackupBytes), countStyle: .file))
                }
            }

            Section {
                Label("恢复备份会替换当前应用内的音乐曲库。确认前会先读取并校验备份内容。", systemImage: "exclamationmark.triangle")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("项目与备份")
        .navigationBarTitleDisplayMode(.inline)
        .fileExporter(
            isPresented: $showingExporter,
            document: document,
            contentType: NativeMusicBackupDocument.contentType,
            defaultFilename: "Yiu.fm-Music-Backup"
        ) { result in
            switch result {
            case .success:
                alertMessage = "音乐库备份已导出到所选位置。"
                showingAlert = true
            case .failure(let error):
                alertMessage = error.localizedDescription
                showingAlert = true
            }
        }
        .fileImporter(
            isPresented: $showingImporter,
            allowedContentTypes: [NativeMusicBackupDocument.contentType],
            allowsMultipleSelection: false
        ) { result in
            do {
                guard let url = try result.get().first else { return }
                let accessed = url.startAccessingSecurityScopedResource()
                defer { if accessed { url.stopAccessingSecurityScopedResource() } }
                let data = try Data(contentsOf: url)
                guard data.count <= 900_000_000 else {
                    throw YiuMusicError.backupTooLarge
                }
                pendingRestoreData = data
                showingRestoreConfirmation = true
            } catch {
                alertMessage = error.localizedDescription
                showingAlert = true
            }
        }
        .confirmationDialog(
            "替换当前音乐曲库？",
            isPresented: $showingRestoreConfirmation,
            titleVisibility: .visible
        ) {
            Button("覆盖并恢复", role: .destructive) {
                restoreBackup()
            }
            Button("取消", role: .cancel) {
                pendingRestoreData = nil
            }
        } message: {
            Text("当前应用内的歌曲和歌词将被备份内容替换。原始文件 App 中的文件不会受到影响。")
        }
        .alert("备份与恢复", isPresented: $showingAlert) {
            Button("好", role: .cancel) {}
        } message: {
            Text(alertMessage ?? "")
        }
    }

    private func createBackup() {
        do {
            let data = try player.createBackupData()
            lastBackupBytes = data.count
            document = NativeMusicBackupDocument(data: data)
            showingExporter = true
        } catch {
            alertMessage = error.localizedDescription
            showingAlert = true
        }
    }

    private func restoreBackup() {
        guard let data = pendingRestoreData else { return }
        do {
            try player.restoreBackupData(data)
            alertMessage = "备份恢复完成，已恢复 \(player.tracks.count) 首歌曲。"
        } catch {
            alertMessage = error.localizedDescription
        }
        pendingRestoreData = nil
        showingAlert = true
    }
}
