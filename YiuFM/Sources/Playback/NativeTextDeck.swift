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
