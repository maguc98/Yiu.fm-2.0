import SwiftUI
import UIKit

enum NativeBackgroundMode: String, CaseIterable, Identifiable {
    case gradient
    case solid
    case image

    var id: String { rawValue }
    var title: String {
        switch self {
        case .gradient: return "渐变"
        case .solid: return "纯色"
        case .image: return "图片"
        }
    }
}

struct NativeBackgroundTheme: Identifiable, Hashable {
    let name: String
    let colors: [String]
    let isSolid: Bool

    var id: String { name }

    static let presets: [NativeBackgroundTheme] = [
        NativeBackgroundTheme(name: "紫夜", colors: ["#2B1055", "#7597DE", "#D16BA5", "#5FFBF1"], isSolid: false),
        NativeBackgroundTheme(name: "落日", colors: ["#FF512F", "#DD2476", "#F9D423", "#6A11CB"], isSolid: false),
        NativeBackgroundTheme(name: "深海", colors: ["#0F2027", "#2C5364", "#00C6FF", "#0072FF"], isSolid: false),
        NativeBackgroundTheme(name: "墨绿", colors: ["#134E5E", "#71B280", "#C6FFDD", "#2C5364"], isSolid: false),
        NativeBackgroundTheme(name: "纯黑", colors: ["#000000", "#0B0B12", "#1A1A2E", "#000000"], isSolid: true)
    ]
}

struct NativeCustomBackgroundTheme: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var colors: [String]
    var isSolid: Bool

    var theme: NativeBackgroundTheme {
        NativeBackgroundTheme(name: name, colors: colors, isSolid: isSolid)
    }
}

enum NativeFontFamily: String, CaseIterable, Identifiable {
    case rounded
    case sans
    case serif
    case mono

    var id: String { rawValue }
    var title: String {
        switch self {
        case .rounded: return "圆润"
        case .sans: return "无衬线"
        case .serif: return "衬线"
        case .mono: return "等宽"
        }
    }

    var design: Font.Design {
        switch self {
        case .rounded: return .rounded
        case .sans: return .default
        case .serif: return .serif
        case .mono: return .monospaced
        }
    }
}

@MainActor
final class NativeAppearanceStore: ObservableObject {
    @Published var backgroundMode: NativeBackgroundMode {
        didSet { defaults.set(backgroundMode.rawValue, forKey: Keys.mode) }
    }
    @Published var solidColorHex: String {
        didSet { defaults.set(solidColorHex, forKey: Keys.solid) }
    }
    @Published var gradientStartHex: String {
        didSet { defaults.set(gradientStartHex, forKey: Keys.gradientStart) }
    }
    @Published var gradientMid1Hex: String {
        didSet { defaults.set(gradientMid1Hex, forKey: Keys.gradientMid1) }
    }
    @Published var gradientMid2Hex: String {
        didSet { defaults.set(gradientMid2Hex, forKey: Keys.gradientMid2) }
    }
    @Published var gradientEndHex: String {
        didSet { defaults.set(gradientEndHex, forKey: Keys.gradientEnd) }
    }
    @Published var gradientFlowEnabled: Bool {
        didSet { defaults.set(gradientFlowEnabled, forKey: Keys.flow) }
    }
    @Published var gradientAngle: Double {
        didSet { defaults.set(gradientAngle, forKey: Keys.angle) }
    }
    @Published var backgroundBlur: Double {
        didSet { defaults.set(backgroundBlur, forKey: Keys.blur) }
    }
    @Published var backgroundDim: Double {
        didSet { defaults.set(backgroundDim, forKey: Keys.dim) }
    }
    @Published var backgroundSquare: Bool {
        didSet { defaults.set(backgroundSquare, forKey: Keys.square) }
    }
    @Published private(set) var backgroundImageData: Data?
    @Published private(set) var coverImageData: Data?
    @Published private(set) var customThemes: [NativeCustomBackgroundTheme] = []

    private let defaults = UserDefaults.standard
    private let fileManager = FileManager.default

    private enum Keys {
        static let mode = "yiufm.native.background.mode"
        static let solid = "yiufm.native.background.solid"
        static let gradientStart = "yiufm.native.background.gradient.start"
        static let gradientMid1 = "yiufm.native.background.gradient.mid1"
        static let gradientMid2 = "yiufm.native.background.gradient.mid2"
        static let gradientEnd = "yiufm.native.background.gradient.end"
        static let flow = "yiufm.native.background.gradient.flow"
        static let angle = "yiufm.native.background.gradient.angle"
        static let blur = "yiufm.native.background.blur"
        static let dim = "yiufm.native.background.dim"
        static let square = "yiufm.native.background.square"
        static let customThemes = "yiufm.native.background.customThemes.v1"
    }

    private var imageDirectory: URL {
        fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Yiu.fm/Appearance", isDirectory: true)
    }
    private var imageURL: URL {
        imageDirectory.appendingPathComponent("background.jpg")
    }
    private var coverURL: URL {
        imageDirectory.appendingPathComponent("cover.jpg")
    }

    var backgroundImage: UIImage? {
        backgroundImageData.flatMap(UIImage.init(data:))
    }
    var coverImage: UIImage? {
        coverImageData.flatMap(UIImage.init(data:))
    }

    init() {
        backgroundMode = NativeBackgroundMode(rawValue: defaults.string(forKey: Keys.mode) ?? "") ?? .gradient
        solidColorHex = defaults.string(forKey: Keys.solid) ?? "#E8F4FA"
        gradientStartHex = defaults.string(forKey: Keys.gradientStart) ?? "#2B1055"
        gradientMid1Hex = defaults.string(forKey: Keys.gradientMid1) ?? "#7597DE"
        gradientMid2Hex = defaults.string(forKey: Keys.gradientMid2) ?? "#D16BA5"
        gradientEndHex = defaults.string(forKey: Keys.gradientEnd) ?? "#5FFBF1"
        gradientFlowEnabled = defaults.object(forKey: Keys.flow) as? Bool ?? false
        gradientAngle = defaults.object(forKey: Keys.angle) as? Double ?? 160
        backgroundBlur = defaults.object(forKey: Keys.blur) as? Double ?? 8
        backgroundDim = defaults.object(forKey: Keys.dim) as? Double ?? 0.30
        backgroundSquare = defaults.object(forKey: Keys.square) as? Bool ?? false
        if let data = defaults.data(forKey: Keys.customThemes),
           let decoded = try? JSONDecoder().decode([NativeCustomBackgroundTheme].self, from: data) {
            customThemes = decoded
        }

        try? fileManager.createDirectory(at: imageDirectory, withIntermediateDirectories: true)
        backgroundImageData = try? Data(contentsOf: imageURL)
        coverImageData = try? Data(contentsOf: coverURL)
    }

    func applyTheme(_ theme: NativeBackgroundTheme) {
        if theme.isSolid {
            backgroundMode = .solid
            solidColorHex = theme.colors[0]
        } else {
            backgroundMode = .gradient
            gradientStartHex = theme.colors[0]
            gradientMid1Hex = theme.colors[1]
            gradientMid2Hex = theme.colors[2]
            gradientEndHex = theme.colors[3]
        }
    }

    @discardableResult
    func addCustomThemeFromCurrentSettings() -> NativeCustomBackgroundTheme {
        let number = (customThemes.compactMap { Int($0.name.replacingOccurrences(of: "自定义 ", with: "")) }.max() ?? 0) + 1
        let colors: [String]
        let isSolid: Bool
        if backgroundMode == .solid {
            colors = [solidColorHex, solidColorHex, solidColorHex, solidColorHex]
            isSolid = true
        } else {
            colors = [gradientStartHex, gradientMid1Hex, gradientMid2Hex, gradientEndHex]
            isSolid = false
        }
        let theme = NativeCustomBackgroundTheme(
            id: UUID().uuidString,
            name: "自定义 \(number)",
            colors: colors,
            isSolid: isSolid
        )
        customThemes.append(theme)
        persistCustomThemes()
        return theme
    }

    func applyCustomTheme(_ theme: NativeCustomBackgroundTheme) {
        applyTheme(theme.theme)
    }

    func removeCustomTheme(_ id: String) {
        customThemes.removeAll { $0.id == id }
        persistCustomThemes()
    }

    private func persistCustomThemes() {
        guard let data = try? JSONEncoder().encode(customThemes) else { return }
        defaults.set(data, forKey: Keys.customThemes)
    }

    func importBackground(from url: URL) throws {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }

        let data = try Data(contentsOf: url)
        guard let sourceImage = UIImage(data: data) else {
            throw NativeAppearanceError.invalidImage
        }

        let maxDimension: CGFloat = 2400
        let largest = max(sourceImage.size.width, sourceImage.size.height)
        let ratio = min(1, maxDimension / max(largest, 1))
        let targetSize = CGSize(
            width: max(1, sourceImage.size.width * ratio),
            height: max(1, sourceImage.size.height * ratio)
        )
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: targetSize, format: format)
        let resized = renderer.image { _ in
            sourceImage.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        guard let jpeg = resized.jpegData(compressionQuality: 0.86) else {
            throw NativeAppearanceError.encodingFailed
        }

        try fileManager.createDirectory(at: imageDirectory, withIntermediateDirectories: true)
        try jpeg.write(to: imageURL, options: .atomic)
        backgroundImageData = jpeg
        backgroundMode = .image
    }

    func importCover(from url: URL) throws {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }

        let data = try Data(contentsOf: url)
        guard let sourceImage = UIImage(data: data) else {
            throw NativeAppearanceError.invalidImage
        }

        let maxDimension: CGFloat = 1800
        let largest = max(sourceImage.size.width, sourceImage.size.height)
        let ratio = min(1, maxDimension / max(largest, 1))
        let targetSize = CGSize(
            width: max(1, sourceImage.size.width * ratio),
            height: max(1, sourceImage.size.height * ratio)
        )
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: targetSize, format: format)
        let resized = renderer.image { _ in
            sourceImage.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        guard let jpeg = resized.jpegData(compressionQuality: 0.88) else {
            throw NativeAppearanceError.encodingFailed
        }

        try fileManager.createDirectory(at: imageDirectory, withIntermediateDirectories: true)
        try jpeg.write(to: coverURL, options: .atomic)
        coverImageData = jpeg
    }

    func removeCover() {
        try? fileManager.removeItem(at: coverURL)
        coverImageData = nil
    }

    func removeBackground() {
        try? fileManager.removeItem(at: imageURL)
        backgroundImageData = nil
        if backgroundMode == .image { backgroundMode = .gradient }
    }

    func reset() {
        backgroundMode = .gradient
        solidColorHex = "#E8F4FA"
        gradientStartHex = "#2B1055"
        gradientMid1Hex = "#7597DE"
        gradientMid2Hex = "#D16BA5"
        gradientEndHex = "#5FFBF1"
        gradientFlowEnabled = false
        gradientAngle = 160
        backgroundBlur = 8
        backgroundDim = 0.30
        backgroundSquare = false
        removeBackground()
    }
}

enum NativeAppearanceError: LocalizedError {
    case invalidImage
    case encodingFailed

    var errorDescription: String? {
        switch self {
        case .invalidImage: return "无法读取这张图片，请选择有效的图片文件。"
        case .encodingFailed: return "图片处理失败，请尝试使用另一张图片。"
        }
    }
}

struct NativeAppBackground: View {
    @ObservedObject var appearance: NativeAppearanceStore
    @AppStorage("yiufm.native.system.targetFPS") private var targetFPS = 30
    @AppStorage("yiufm.native.system.animationSpeed") private var animationSpeed = 1.0
    @AppStorage("yiufm.native.system.reduceMotion") private var reduceMotion = false
    @AppStorage("yiufm.native.background.fadeSpeed") private var fadeSpeed = 1.5

    private var backgroundSignature: String {
        [
            appearance.backgroundMode.rawValue,
            appearance.solidColorHex,
            appearance.gradientStartHex,
            appearance.gradientMid1Hex,
            appearance.gradientMid2Hex,
            appearance.gradientEndHex,
            String(appearance.gradientAngle),
            String(appearance.backgroundDim),
            String(appearance.backgroundBlur),
            String(appearance.backgroundImageData?.hashValue ?? 0)
        ].joined(separator: "|")
    }

    var body: some View {
        ZStack {
            switch appearance.backgroundMode {
            case .solid:
                Color(nativeHex: appearance.solidColorHex)
            case .gradient:
                gradientLayer
            case .image:
                if let image = appearance.backgroundImage {
                    if appearance.backgroundSquare {
                        ZStack {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFill()
                                .blur(radius: max(18, appearance.backgroundBlur + 14))
                                .clipped()
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFit()
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .clipped()
                    } else {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .blur(radius: appearance.backgroundBlur)
                            .clipped()
                    }
                } else {
                    gradient(angle: appearance.gradientAngle)
                }
            }

            if appearance.backgroundDim > 0 {
                Color.black.opacity(appearance.backgroundDim)
            }
        }
        .ignoresSafeArea()
        .animation(.easeInOut(duration: fadeSpeed), value: backgroundSignature)
    }

    @ViewBuilder
    private var gradientLayer: some View {
        if appearance.gradientFlowEnabled {
            TimelineView(.animation(minimumInterval: 1.0 / Double(max(15, min(60, targetFPS))), paused: reduceMotion)) { timeline in
                let elapsed = timeline.date.timeIntervalSinceReferenceDate * animationSpeed
                let cycle = elapsed.truncatingRemainder(dividingBy: 14) / 14
                gradient(angle: appearance.gradientAngle + cycle * 360)
            }
        } else {
            gradient(angle: appearance.gradientAngle)
        }
    }

    private func gradient(angle: Double) -> LinearGradient {
        LinearGradient(
            colors: [
                Color(nativeHex: appearance.gradientStartHex),
                Color(nativeHex: appearance.gradientMid1Hex),
                Color(nativeHex: appearance.gradientMid2Hex),
                Color(nativeHex: appearance.gradientEndHex)
            ],
            startPoint: gradientStart(for: angle),
            endPoint: gradientEnd(for: angle)
        )
    }

    private func gradientStart(for angle: Double) -> UnitPoint {
        let normalized = angle.truncatingRemainder(dividingBy: 360) / 360
        let x = 0.5 - 0.5 * cos(normalized * 2 * .pi)
        let y = 0.5 - 0.5 * sin(normalized * 2 * .pi)
        return UnitPoint(x: CGFloat(x), y: CGFloat(y))
    }

    private func gradientEnd(for angle: Double) -> UnitPoint {
        let start = gradientStart(for: angle)
        return UnitPoint(x: 1 - start.x, y: 1 - start.y)
    }
}

extension Color {
    init(nativeHex: String) {
        let cleaned = nativeHex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        let value = UInt64(cleaned, radix: 16) ?? 0xE8F4FA
        self.init(
            .sRGB,
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255,
            opacity: 1
        )
    }

    var nativeHex: String {
        #if canImport(UIKit)
        let color = UIColor(self)
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        color.getRed(&red, green: &green, blue: &blue, alpha: nil)
        return String(format: "#%02X%02X%02X", Int(red * 255), Int(green * 255), Int(blue * 255))
        #else
        return "#E8F4FA"
        #endif
    }
}
