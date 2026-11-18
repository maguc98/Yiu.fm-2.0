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
    @Published var gradientEndHex: String {
        didSet { defaults.set(gradientEndHex, forKey: Keys.gradientEnd) }
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
    @Published private(set) var backgroundImageData: Data?

    private let defaults = UserDefaults.standard
    private let fileManager = FileManager.default

    private enum Keys {
        static let mode = "yiufm.native.background.mode"
        static let solid = "yiufm.native.background.solid"
        static let gradientStart = "yiufm.native.background.gradient.start"
        static let gradientEnd = "yiufm.native.background.gradient.end"
        static let angle = "yiufm.native.background.gradient.angle"
        static let blur = "yiufm.native.background.blur"
        static let dim = "yiufm.native.background.dim"
    }

    private var imageDirectory: URL {
        fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Yiu.fm/Appearance", isDirectory: true)
    }
    private var imageURL: URL {
        imageDirectory.appendingPathComponent("background.jpg")
    }

    var backgroundImage: UIImage? {
        backgroundImageData.flatMap(UIImage.init(data:))
    }

    init() {
        backgroundMode = NativeBackgroundMode(rawValue: defaults.string(forKey: Keys.mode) ?? "") ?? .gradient
        solidColorHex = defaults.string(forKey: Keys.solid) ?? "#E8F4FA"
        gradientStartHex = defaults.string(forKey: Keys.gradientStart) ?? "#E8F4FA"
        gradientEndHex = defaults.string(forKey: Keys.gradientEnd) ?? "#F1ECFA"
        gradientAngle = defaults.object(forKey: Keys.angle) as? Double ?? 135
        backgroundBlur = defaults.object(forKey: Keys.blur) as? Double ?? 0
        backgroundDim = defaults.object(forKey: Keys.dim) as? Double ?? 0

        try? fileManager.createDirectory(at: imageDirectory, withIntermediateDirectories: true)
        backgroundImageData = try? Data(contentsOf: imageURL)
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

    func removeBackground() {
        try? fileManager.removeItem(at: imageURL)
        backgroundImageData = nil
        if backgroundMode == .image { backgroundMode = .gradient }
    }

    func reset() {
        backgroundMode = .gradient
        solidColorHex = "#E8F4FA"
        gradientStartHex = "#E8F4FA"
        gradientEndHex = "#F1ECFA"
        gradientAngle = 135
        backgroundBlur = 0
        backgroundDim = 0
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

    var body: some View {
        ZStack {
            switch appearance.backgroundMode {
            case .solid:
                Color(nativeHex: appearance.solidColorHex)
            case .gradient:
                LinearGradient(
                    colors: [
                        Color(nativeHex: appearance.gradientStartHex),
                        Color(nativeHex: appearance.gradientEndHex)
                    ],
                    startPoint: gradientStart,
                    endPoint: gradientEnd
                )
            case .image:
                if let image = appearance.backgroundImage {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .blur(radius: appearance.backgroundBlur)
                        .clipped()
                } else {
                    LinearGradient(
                        colors: [Color(nativeHex: appearance.gradientStartHex), Color(nativeHex: appearance.gradientEndHex)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                }
            }

            if appearance.backgroundDim > 0 {
                Color.black.opacity(appearance.backgroundDim)
            }
        }
        .ignoresSafeArea()
    }

    private var gradientStart: UnitPoint {
        let normalized = appearance.gradientAngle.truncatingRemainder(dividingBy: 360) / 360
        let x = 0.5 - 0.5 * cos(normalized * 2 * .pi)
        let y = 0.5 - 0.5 * sin(normalized * 2 * .pi)
        return UnitPoint(x: x, y: y)
    }

    private var gradientEnd: UnitPoint {
        let start = gradientStart
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
