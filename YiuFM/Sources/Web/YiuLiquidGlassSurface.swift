import UIKit

/// A single native material surface for Yiu.fm.
///
/// The effect and its foreground content share one view hierarchy:
/// UIKit renders the material first, then renders subviews added to
/// `contentView` above it. This deliberately avoids the old full-WKWebView
/// overlay + DOM-mask approach.
///
/// IMPORTANT: Do not put the entire WKWebView above this view and expect
/// UIGlassEffect to become a DOM backdrop. Native surfaces must own their
/// foreground UIKit content (or a separately hosted, transparent content view).
@MainActor
final class YiuLiquidGlassSurface: UIVisualEffectView {
    enum Material {
        case regular
        case clear
    }

    private(set) var material: Material = .regular

    init(material: Material = .regular, interactive: Bool = true) {
        self.material = material
        super.init(effect: Self.makeEffect(material: material, interactive: interactive))
        configureSurface()
    }

    required init?(coder: NSCoder) {
        self.material = .regular
        super.init(coder: coder)
        effect = Self.makeEffect(material: .regular, interactive: true)
        configureSurface()
    }

    func setMaterial(_ material: Material, interactive: Bool = true) {
        guard self.material != material else { return }
        self.material = material
        effect = Self.makeEffect(material: material, interactive: interactive)
    }

    /// Add all native labels, symbols and controls to this view.
    /// They remain above the material without masks or hit-testing tricks.
    var foregroundView: UIView { contentView }

    private func configureSurface() {
        backgroundColor = .clear
        contentView.backgroundColor = .clear
        isOpaque = false
        clipsToBounds = true
        layer.cornerCurve = .continuous
        isUserInteractionEnabled = true
    }

    private static func makeEffect(material: Material, interactive: Bool) -> UIVisualEffect {
        if #available(iOS 26.0, *) {
            let glass = UIGlassEffect(style: material == .regular ? .regular : .clear)
            glass.tintColor = nil
            glass.isInteractive = interactive
            return glass
        }

        // iOS 18–25 compatibility. This is a system blur fallback, not
        // advertised as Liquid Glass; native Liquid Glass requires iOS 26+.
        return UIBlurEffect(style: material == .regular ? .systemMaterial : .systemUltraThinMaterial)
    }
}
