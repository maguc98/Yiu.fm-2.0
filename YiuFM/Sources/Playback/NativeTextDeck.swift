import SwiftUI
import Foundation

@MainActor
final class NativeTextDeckStore: ObservableObject {
    @Published private(set) var packages: [NativeTextPackage] = []
    @Published private(set) var activePackageID: String?
    @Published private(set) var defaultAnimation: NativeTextAnimation = .scatter

    private let defaults = UserDefaults.standard
    private let storageKey = "yiufm.native.text.packages.v1"
    private let defaultAnimationKey = "yiufm.native.text.defaultAnimation.v1"

    var activePackage: NativeTextPackage? {
        packages.first { $0.id == activePackageID }
    }

    var cards: [NativeTextCard] {
        activePackage?.cards ?? []
    }

    init() {
        defaultAnimation = NativeTextAnimation(rawValue: defaults.string(forKey: defaultAnimationKey) ?? "") ?? .scatter
        restore()
        if packages.isEmpty {
            let initial = NativeTextPackage(name: "默认文件包", cards: [NativeTextCard()])
            packages = [initial]
            activePackageID = initial.id
            persist()
        } else if activePackageID == nil || !packages.contains(where: { $0.id == activePackageID }) {
            activePackageID = packages.first?.id
            persist()
        }
    }

    func exportProjectData() throws -> Data {
        let layout = NativeTextLayoutSettings(
            horizontalAlignment: defaults.string(forKey: "yiufm.native.typography.alignment") ?? NativeTextLayoutSettings.defaults.horizontalAlignment,
            verticalPosition: defaults.string(forKey: "yiufm.native.typography.position") ?? NativeTextLayoutSettings.defaults.verticalPosition,
            wrapMode: defaults.string(forKey: "yiufm.native.typography.wrap") ?? NativeTextLayoutSettings.defaults.wrapMode,
            sidePadding: defaults.object(forKey: "yiufm.native.typography.padding") as? Double ?? NativeTextLayoutSettings.defaults.sidePadding,
            fontWeight: defaults.object(forKey: "yiufm.native.typography.weight") as? Double ?? NativeTextLayoutSettings.defaults.fontWeight,
            lineSpacing: defaults.object(forKey: "yiufm.native.typography.lineSpacing") as? Double ?? NativeTextLayoutSettings.defaults.lineSpacing
        )
        return try NativeTextProjectCodec.encode(packages: packages, activePackageID: activePackageID, layout: layout)
    }

    func importProjectData(_ data: Data) throws {
        let payload = try NativeTextProjectCodec.decode(data)
        packages = payload.packages
        activePackageID = payload.activePackageID
        if let layout = payload.layout {
            defaults.set(layout.horizontalAlignment, forKey: "yiufm.native.typography.alignment")
            defaults.set(layout.verticalPosition, forKey: "yiufm.native.typography.position")
            defaults.set(layout.wrapMode, forKey: "yiufm.native.typography.wrap")
            defaults.set(layout.sidePadding, forKey: "yiufm.native.typography.padding")
            defaults.set(layout.fontWeight, forKey: "yiufm.native.typography.weight")
            defaults.set(layout.lineSpacing, forKey: "yiufm.native.typography.lineSpacing")
        }
        persist()
    }

    func setDefaultAnimation(_ animation: NativeTextAnimation) {
        guard defaultAnimation != animation else { return }
        defaultAnimation = animation
        defaults.set(animation.rawValue, forKey: defaultAnimationKey)
    }

    func addCard() {
        updateActive { $0.cards.append(NativeTextCard(animation: .follow)) }
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
        let cleaned = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let newPackage = NativeTextPackage(
            name: String((cleaned.isEmpty ? "新文件包" : cleaned).prefix(60)),
            cards: [NativeTextCard(animation: .follow)]
        )
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
