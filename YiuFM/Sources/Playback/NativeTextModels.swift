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

struct NativeTextLayoutSettings: Codable, Equatable {
    var horizontalAlignment: String
    var verticalPosition: String
    var wrapMode: String
    var sidePadding: Double
    var fontWeight: Double
    var lineSpacing: Double

    static let defaults = NativeTextLayoutSettings(
        horizontalAlignment: "center",
        verticalPosition: "center",
        wrapMode: "fill",
        sidePadding: 22,
        fontWeight: 0.8,
        lineSpacing: 1.35
    )
}

struct NativeTextProjectBackup: Codable {
    let version: Int
    let exportedAt: Date
    let packages: [NativeTextPackage]
    let activePackageID: String?
    let layout: NativeTextLayoutSettings?
}
