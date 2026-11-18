import SwiftUI
import UniformTypeIdentifiers

struct NativeJSONBackupDocument: FileDocument {
    static let contentType: UTType = .json
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
    @ObservedObject var textDeck: NativeTextDeckStore
    @State private var document: NativeJSONBackupDocument?
    @State private var showingExporter = false
    @State private var showingImporter = false
    @State private var showingRestoreConfirmation = false
    @State private var showingTextRestoreConfirmation = false
    @State private var pendingRestoreData: Data?
    @State private var pendingTextRestoreData: Data?
    @State private var alertMessage: String?
    @State private var showingAlert = false
    @State private var lastBackupBytes: Int?
    @State private var defaultFilename = "Yiu.fm-Music-Backup"

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
                    Label("文字文件包", systemImage: "text.alignleft")
                    Spacer()
                    Text("\\(textDeck.packages.count) 个 · \\(textDeck.cards.count) 句")
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
                    Label("导出音乐曲库备份", systemImage: "music.note.list")
                }
                .disabled(player.tracks.isEmpty)

                Button {
                    createTextBackup()
                } label: {
                    Label("导出文字项目备份", systemImage: "text.alignleft")
                }

                Button {
                    showingImporter = true
                } label: {
                    Label("导入备份或旧版项目 JSON", systemImage: "square.and.arrow.down")
                }
            } header: {
                Text("备份与恢复")
            } footer: {
                Text("音乐备份包含音频、LRC 和曲库数据；文字项目备份包含所有文件包及每句的样式。也支持导入旧版导出的 PACKAGES/LN/CF JSON。")
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
            defaultFilename: defaultFilename
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
                let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                if object?["tracks"] != nil {
                    pendingRestoreData = data
                    showingRestoreConfirmation = true
                } else if object?["packages"] != nil || object?["PACKAGES"] != nil || object?["LN"] != nil {
                    pendingTextRestoreData = data
                    showingTextRestoreConfirmation = true
                } else {
                    throw NativeTextDeckError.invalidProjectFile
                }
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
        .confirmationDialog(
            "替换当前文字项目？",
            isPresented: $showingTextRestoreConfirmation,
            titleVisibility: .visible
        ) {
            Button("覆盖并恢复文字项目", role: .destructive) {
                restoreTextBackup()
            }
            Button("取消", role: .cancel) { pendingTextRestoreData = nil }
        } message: {
            Text("当前原生文字文件包会被备份内容替换。音乐曲库不会受到影响。")
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
            document = NativeJSONBackupDocument(data: data)
            defaultFilename = "Yiu.fm-Music-Backup"
            showingExporter = true
        } catch {
            alertMessage = error.localizedDescription
            showingAlert = true
        }
    }

    private func createTextBackup() {
        do {
            let data = try textDeck.exportProjectData()
            lastBackupBytes = data.count
            document = NativeJSONBackupDocument(data: data)
            defaultFilename = "Yiu.fm-Text-Project"
            showingExporter = true
        } catch {
            alertMessage = error.localizedDescription
            showingAlert = true
        }
    }

    private func restoreTextBackup() {
        guard let data = pendingTextRestoreData else { return }
        do {
            try textDeck.importProjectData(data)
            alertMessage = "文字项目恢复完成，已恢复 \\(textDeck.packages.count) 个文件包。"
        } catch {
            alertMessage = error.localizedDescription
        }
        pendingTextRestoreData = nil
        showingAlert = true
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
