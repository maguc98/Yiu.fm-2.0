import Foundation

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

enum NativeTextProjectCodec {
    static func encode(
        packages: [NativeTextPackage],
        activePackageID: String?,
        layout: NativeTextLayoutSettings = .defaults
    ) throws -> Data {
        let payload = NativeTextProjectBackup(
            version: 1,
            exportedAt: Date(),
            packages: packages,
            activePackageID: activePackageID,
            layout: layout
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(payload)
    }

    static func decode(_ data: Data) throws -> NativeTextProjectBackup {
        if let payload = try? JSONDecoder().decode(NativeTextProjectBackup.self, from: data) {
            guard payload.version == 1 else { throw NativeTextDeckError.unsupportedVersion }
            guard !payload.packages.isEmpty else { throw NativeTextDeckError.noTextContent }
            let safePackages = sanitize(payload.packages)
            let safeActiveID = safePackages.contains(where: { $0.id == payload.activePackageID })
                ? payload.activePackageID
                : safePackages.first?.id
            return NativeTextProjectBackup(
                version: 1,
                exportedAt: payload.exportedAt,
                packages: safePackages,
                activePackageID: safeActiveID,
                layout: payload.layout
            )
        }

        return try decodeLegacyStorageJSON(data)
    }

    private static func sanitize(_ source: [NativeTextPackage]) -> [NativeTextPackage] {
        var packageIDs = Set<String>()
        return source.map { original in
            var package = original
            if !packageIDs.insert(package.id).inserted {
                package.id = UUID().uuidString
                packageIDs.insert(package.id)
            }
            package.name = String(package.name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(60))
            if package.name.isEmpty { package.name = "未命名文件包" }

            var cardIDs = Set<String>()
            package.cards = package.cards.map { originalCard in
                var card = sanitize(originalCard)
                if !cardIDs.insert(card.id).inserted {
                    card.id = UUID().uuidString
                    cardIDs.insert(card.id)
                }
                return card
            }
            if package.cards.isEmpty { package.cards = [NativeTextCard()] }
            return package
        }
    }

    private static func sanitize(_ original: NativeTextCard) -> NativeTextCard {
        var card = original
        card.text = String(card.text.prefix(10000))
        card.fontSize = min(80, max(14, card.fontSize.isFinite ? card.fontSize : 42))
        card.duration = min(20, max(0.5, card.duration.isFinite ? card.duration : 4))
        if let color = card.colorHex, !isValidColor(color) {
            card.colorHex = nil
        }
        return card
    }

    private static func decodeLegacyStorageJSON(_ data: Data) throws -> NativeTextProjectBackup {
        guard let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw NativeTextDeckError.invalidProjectFile
        }

        let global = root["G"] as? [String: Any] ?? [:]
        let globalAnimation = (global["style"] as? String).flatMap(NativeTextAnimation.init(rawValue:)) ?? .follow
        var imported: [NativeTextPackage] = []

        if let oldPackages = root["PACKAGES"] as? [[String: Any]] {
            imported = oldPackages.enumerated().map { index, rawPackage in
                let rawItems = rawPackage["items"] as? [[String: Any]] ?? []
                let cards = rawItems.map { makeLegacyCard($0, fallbackAnimation: globalAnimation) }
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
              imported.contains(where: { package in
                  package.cards.contains(where: { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty })
              }) else {
            throw NativeTextDeckError.noTextContent
        }

        let requestedIndex = (root["ACTIVE_PKG"] as? NSNumber)?.intValue ?? 0
        let safePackages = sanitize(imported)
        let selectedIndex = min(max(0, requestedIndex), safePackages.count - 1)

        let legacyLayout = root["LY"] as? [String: Any] ?? [:]
        let extra = root["X"] as? [String: Any] ?? [:]
        let ui = extra["ui"] as? [String: Any] ?? [:]
        let alignment = (legacyLayout["a"] as? String).flatMap { ["left", "center", "right"].contains($0) ? $0 : nil } ?? NativeTextLayoutSettings.defaults.horizontalAlignment
        let vertical = (legacyLayout["v"] as? String).flatMap { ["top", "center", "bottom"].contains($0) ? $0 : nil } ?? NativeTextLayoutSettings.defaults.verticalPosition
        let wrap = (legacyLayout["w"] as? String).flatMap { ["fill", "word", "balance"].contains($0) ? $0 : nil } ?? NativeTextLayoutSettings.defaults.wrapMode
        let padding = (ui["lyPad"] as? NSNumber)?.doubleValue ?? NativeTextLayoutSettings.defaults.sidePadding
        let oldWeight = (ui["lyFw"] as? NSNumber)?.doubleValue ?? 8
        let lineHeight = (ui["lyLh"] as? NSNumber)?.doubleValue ?? 135
        let layout = NativeTextLayoutSettings(
            horizontalAlignment: alignment,
            verticalPosition: vertical,
            wrapMode: wrap,
            sidePadding: min(80, max(0, padding)),
            fontWeight: min(1, max(0.4, oldWeight / 10)),
            lineSpacing: min(2.2, max(1, lineHeight / 100))
        )

        return NativeTextProjectBackup(
            version: 1,
            exportedAt: Date(),
            packages: safePackages,
            activePackageID: safePackages[selectedIndex].id,
            layout: layout
        )
    }

    private static func makeLegacyCard(
        _ raw: [String: Any],
        fallbackAnimation: NativeTextAnimation
    ) -> NativeTextCard {
        let safeColor = (raw["color"] as? String).flatMap { isValidColor($0) ? $0 : nil }
        let animation = (raw["mode"] as? String).flatMap(NativeTextAnimation.init(rawValue:)) ?? fallbackAnimation
        let size = (raw["size"] as? NSNumber)?.doubleValue ?? 42
        let duration = (raw["dur"] as? NSNumber)?.doubleValue ?? 4
        return sanitize(NativeTextCard(
            text: raw["t"] as? String ?? "",
            fontSize: min(80, max(14, size)),
            colorHex: safeColor,
            duration: min(20, max(0.5, duration)),
            animation: animation
        ))
    }

    private static func isValidColor(_ value: String) -> Bool {
        value.range(of: #"^#[0-9A-Fa-f]{6}$"#, options: .regularExpression) != nil
    }
}
