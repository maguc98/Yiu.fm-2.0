import UIKit
import WebKit

/// Experimental host for validating a transparent WKWebView as the foreground
/// of a native Liquid Glass surface.
///
/// The backdrop must be rendered by a separate sibling view placed behind this
/// host. A WKWebView that contains both the backdrop and foreground cannot be
/// used here: UIVisualEffectView samples UIKit content behind itself, not DOM
/// pixels rendered inside its own foreground WKWebView.
///
/// This type is intentionally not wired into the production control center yet.
/// It is an architecture spike; integration requires splitting the visual stage
/// from the interactive hub without creating a second player or WebGL runtime.
@MainActor
final class YiuLiquidGlassWebHost: UIView {
    let surface: YiuLiquidGlassSurface
    let foregroundWebView: WKWebView

    init(
        foregroundWebView: WKWebView,
        material: YiuLiquidGlassSurface.Material = .regular,
        interactive: Bool = true
    ) {
        self.foregroundWebView = foregroundWebView
        self.surface = YiuLiquidGlassSurface(
            material: material,
            interactive: interactive
        )
        super.init(frame: .zero)

        backgroundColor = .clear
        isOpaque = false
        clipsToBounds = true
        layer.cornerCurve = .continuous

        surface.translatesAutoresizingMaskIntoConstraints = false
        foregroundWebView.translatesAutoresizingMaskIntoConstraints = false
        foregroundWebView.isOpaque = false
        foregroundWebView.backgroundColor = .clear
        foregroundWebView.scrollView.backgroundColor = .clear

        addSubview(surface)
        surface.foregroundView.addSubview(foregroundWebView)

        NSLayoutConstraint.activate([
            surface.leadingAnchor.constraint(equalTo: leadingAnchor),
            surface.trailingAnchor.constraint(equalTo: trailingAnchor),
            surface.topAnchor.constraint(equalTo: topAnchor),
            surface.bottomAnchor.constraint(equalTo: bottomAnchor),

            foregroundWebView.leadingAnchor.constraint(equalTo: surface.foregroundView.leadingAnchor),
            foregroundWebView.trailingAnchor.constraint(equalTo: surface.foregroundView.trailingAnchor),
            foregroundWebView.topAnchor.constraint(equalTo: surface.foregroundView.topAnchor),
            foregroundWebView.bottomAnchor.constraint(equalTo: surface.foregroundView.bottomAnchor)
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    /// Updates the clipping shape without changing the foreground layout.
    func setCornerRadius(_ radius: CGFloat) {
        layer.cornerRadius = radius
        surface.layer.cornerRadius = radius
    }
}
