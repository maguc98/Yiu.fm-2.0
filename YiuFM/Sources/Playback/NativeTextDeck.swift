import SwiftUI
import Foundation

enum NativeTextAnimation: String, CaseIterable, Codable, Identifiable {
    case follow
    case scatter
    case star
    case pan
    case fade
    case type
    case bounce
    case flip
    case focus
    case wave
    case glitch
    case poster

    var id: String { rawValue }
    var title: String {
        switch self {
        case .follow: return "跟随"
        case .scatter: return "打散重组"
        case .star: return "星空飘字"
        case .pan: return "镜头平移"
        case .fade: return "淡入淡出"
        case .type: return "打字机"
        case .bounce: return "弹跳落字"
        case .flip: return "逐字翻转"
        case .focus: return "模糊聚焦"
        case .wave: return "波浪起伏"
        case .glitch: return "故障闪烁"
        case .poster: return "海报排版"
        }
    }
}

struct NativeTextCard: Identifiable, Codable, Hashable {
    var id: String
    var text: String
    var fontSize: Double
    var colorHex: String?
    var duration: Double
    var animation: NativeTextAnimation

    init(
        id: String = UUID().uuidString,
        text: String = "",
        fontSize: Double = 42,
        colorHex: String? = nil,
        duration: Double = 4,
        animation: NativeTextAnimation = .follow
    ) {
        self.id = id
        self.text = text
        self.fontSize = fontSize
        self.colorHex = colorHex
        self.duration = duration
        self.animation = animation
    }
}

struct NativeTextPackage: Identifiable, Codable, Hashable {
    var id: String
    var name: String
    var shuffle: Bool
    var cards: [NativeTextCard]

    init(id: String = UUID().uuidString, name: String, shuffle: Bool = false, cards: [NativeTextCard]) {
        self.id = id
        self.name = name
        self.shuffle = shuffle
        self.cards = cards
    }
}

private struct NativeTextProjectBackup: Codable {
    let version: Int
    let exportedAt: Date
    let packages: [NativeTextPackage]
    let activePackageID: String?
}

enum NativeTextDeckError: LocalizedError {
    case invalidProjectFile
    case unsupportedVersion
    case noTextContent

    var errorDescription: String? {
        switch self {
        case .invalidProjectFile: return "无法识别这个文字项目文件。"
        case .unsupportedVersion: return "这个文字项目备份版本暂不支持。"
        case .noTextContent: return "文件中没有可导入的文字卡片。"
        }
    }
}

@MainActor
final class NativeTextDeckStore: ObservableObject {
    @Published private(set) var packages: [NativeTextPackage] = []
    @Published private(set) var activePackageID: String?

    private let defaults = UserDefaults.standard
    private let storageKey = "yiufm.native.text.packages.v1"

    var activePackage: NativeTextPackage? {
        packages.first { $0.id == activePackageID }
    }
    var cards: [NativeTextCard] {
        activePackage?.cards ?? []
    }

    init() {
        restore()
        if packages.isEmpty {
            let initial = NativeTextPackage(name: "默认文件包", cards: [NativeTextCard()])
            packages = [initial]
            activePackageID = initial.id
            persist()
        } else if activePackageID == nil || !packages.contains(where: { $0.id == activePackageID }) {
            activePackageID = packages.first?.id
        }
    }

    func exportProjectData() throws -> Data {
        let payload = NativeTextProjectBackup(
            version: 1,
            exportedAt: Date(),
            packages: packages,
            activePackageID: activePackageID
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(payload)
    }

    func importProjectData(_ data: Data) throws {
        if let payload = try? JSONDecoder().decode(NativeTextProjectBackup.self, from: data) {
            guard payload.version == 1 else { throw NativeTextDeckError.unsupportedVersion }
            guard !payload.packages.isEmpty else { throw NativeTextDeckError.noTextContent }
            packages = payload.packages.map { package in
                var safe = package
                safe.name = String(package.name.prefix(60))
                if safe.cards.isEmpty { safe.cards = [NativeTextCard()] }
                safe.cards = safe.cards.map(sanitizedCard)
                return safe
            }
            activePackageID = payload.packages.contains(where: { $0.id == payload.activePackageID })
                ? payload.activePackageID
                : packages.first?.id
            persist()
            return
        }

        try importLegacyStorageJSON(data)
    }

    private func importLegacyStorageJSON(_ data: Data) throws {
        guard let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw NativeTextDeckError.invalidProjectFile
        }

        let global = root["G"] as? [String: Any] ?? [:]
        let globalAnimation = (global["style"] as? String).flatMap(NativeTextAnimation.init(rawValue:)) ?? .follow
        var imported: [NativeTextPackage] = []

        if let oldPackages = root["PACKAGES"] as? [[String: Any]] {
            imported = oldPackages.enumerated().map { index, rawPackage in
                let rawItems = rawPackage["items"] as? [[String: Any]] ?? []
                let cards = rawItems.map { rawItem in
                    makeLegacyCard(rawItem, fallbackAnimation: globalAnimation)
                }
                return NativeTextPackage(
                    name: String((rawPackage["name"] as? String ?? "文件包 \(index + 1)").prefix(60)),
                    shuffle: rawPackage["shuffle"] as? Bool ?? false,
                    cards: cards.isEmpty ? [NativeTextCard()] : cards
                )
            }
        } else if let lines = root["LN"] as? [String] {
            let configs = root["CF"] as? [[String: Any]] ?? []
            let cards = lines.enumerated().map { index, line in
                var item = index < configs.count ? configs[index] : [:]
                item["t"] = line
                return makeLegacyCard(item, fallbackAnimation: globalAnimation)
            }
            imported = [NativeTextPackage(name: "导入的文字项目", cards: cards)]
        }

        guard !imported.isEmpty,
              imported.contains(where: { $0.cards.contains(where: { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }) }) else {
            throw NativeTextDeckError.noTextContent
        }

        let requestedIndex = (root["ACTIVE_PKG"] as? NSNumber)?.intValue ?? 0
        packages = imported
        let selected = min(max(0, requestedIndex), imported.count - 1)
        activePackageID = imported[selected].id
        persist()
    }

    private func makeLegacyCard(
        _ raw: [String: Any],
        fallbackAnimation: NativeTextAnimation
    ) -> NativeTextCard {
        let color = raw["color"] as? String
        let safeColor = color.flatMap { value -> String? in
            let pattern = #"^#[0-9A-Fa-f]{6}$"#
            return value.range(of: pattern, options: .regularExpression) == nil ? nil : value
        }
        let animation = (raw["mode"] as? String).flatMap(NativeTextAnimation.init(rawValue:)) ?? fallbackAnimation
        let size = (raw["size"] as? NSNumber)?.doubleValue ?? 42
        let duration = (raw["dur"] as? NSNumber)?.doubleValue ?? 4
        return sanitizedCard(NativeTextCard(
            text: raw["t"] as? String ?? "",
            fontSize: min(80, max(14, size)),
            colorHex: safeColor,
            duration: min(20, max(0.5, duration)),
            animation: animation
        ))
    }

    private func sanitizedCard(_ card: NativeTextCard) -> NativeTextCard {
        var safe = card
        safe.text = String(card.text.prefix(10000))
        safe.fontSize = min(80, max(14, card.fontSize.isFinite ? card.fontSize : 42))
        safe.duration = min(20, max(0.5, card.duration.isFinite ? card.duration : 4))
        if let color = safe.colorHex {
            let valid = color.range(of: #"^#[0-9A-Fa-f]{6}$"#, options: .regularExpression) != nil
            if !valid { safe.colorHex = nil }
        }
        return safe
    }

    func addCard() {
        updateActive { $0.cards.append(NativeTextCard()) }
    }

    func updateCard(_ id: String, mutate: (inout NativeTextCard) -> Void) {
        updateActive { package in
            guard let index = package.cards.firstIndex(where: { $0.id == id }) else { return }
            mutate(&package.cards[index])
        }
    }

    func removeCard(_ id: String) {
        updateActive { package in
            if package.cards.count <= 1 {
                package.cards = [NativeTextCard()]
            } else {
                package.cards.removeAll { $0.id == id }
            }
        }
    }

    func moveCards(from source: IndexSet, to destination: Int) {
        updateActive { package in
            let ordered = source.sorted()
            let moving = ordered.map { package.cards[$0] }
            package.cards.remove(atOffsets: source)
            let adjusted = max(0, min(package.cards.count, destination - source.filter { $0 < destination }.count))
            package.cards.insert(contentsOf: moving, at: adjusted)
        }
    }

    func addPackage(named name: String) {
        let newPackage = NativeTextPackage(name: name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "新文件包" : name, cards: [NativeTextCard()])
        packages.append(newPackage)
        activePackageID = newPackage.id
        persist()
    }

    func selectPackage(_ id: String) {
        guard packages.contains(where: { $0.id == id }) else { return }
        activePackageID = id
        persist()
    }

    func renameActivePackage(_ name: String) {
        guard let activePackageID,
              let index = packages.firstIndex(where: { $0.id == activePackageID }) else { return }
        let cleaned = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return }
        packages[index].name = String(cleaned.prefix(60))
        persist()
    }

    func removeActivePackage() {
        guard let activePackageID,
              let index = packages.firstIndex(where: { $0.id == activePackageID }) else { return }
        if packages.count <= 1 {
            packages[index].name = "默认文件包"
            packages[index].shuffle = false
            packages[index].cards = [NativeTextCard()]
        } else {
            packages.remove(at: index)
            self.activePackageID = packages.first?.id
        }
        persist()
    }

    func setShuffle(_ enabled: Bool) {
        updateActive { $0.shuffle = enabled }
    }

    private func updateActive(_ mutate: (inout NativeTextPackage) -> Void) {
        guard let activePackageID,
              let index = packages.firstIndex(where: { $0.id == activePackageID }) else { return }
        mutate(&packages[index])
        persist()
    }

    private func persist() {
        let state = PersistedTextDeck(packages: packages, activePackageID: activePackageID)
        guard let data = try? JSONEncoder().encode(state) else { return }
        defaults.set(data, forKey: storageKey)
    }

    private func restore() {
        guard let data = defaults.data(forKey: storageKey),
              let state = try? JSONDecoder().decode(PersistedTextDeck.self, from: data) else { return }
        packages = state.packages
        activePackageID = state.activePackageID
    }

    private struct PersistedTextDeck: Codable {
        let packages: [NativeTextPackage]
        let activePackageID: String?
    }
}
