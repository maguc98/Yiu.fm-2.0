import UIKit

/// Standalone native Liquid Glass treatment for the floating toolbar button.
/// The web page remains the source of truth; taps are forwarded to #hback.
@MainActor
final class YiuNativeBackButtonView: UIView {
    private let glass = YiuLiquidGlassSurface(material: .regular, interactive: true)
    private let glyph = CAShapeLayer()
    var onTap: (() -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
        addSubview(glass)
        glass.foregroundView.layer.addSublayer(glyph)
        glyph.fillColor = UIColor.clear.cgColor
        glyph.strokeColor = UIColor.white.cgColor
        glyph.lineWidth = 1.8
        glyph.lineCap = .round
        glyph.lineJoin = .round
        let tap = UITapGestureRecognizer(target: self, action: #selector(didTap))
        addGestureRecognizer(tap)
        isAccessibilityElement = true
        accessibilityLabel = "展开部分工具栏"
        isHidden = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func update(rect: CGRect, visible: Bool, opacity: CGFloat, label: String, tint: UIColor?, foreground: UIColor?) {
        frame = rect
        glass.frame = bounds
        glass.layer.cornerRadius = min(bounds.width, bounds.height) / 2
        glass.updateGlassTint(tint)
        glyph.strokeColor = (foreground ?? .white).cgColor
        glass.clipsToBounds = true
        accessibilityLabel = label
        alpha = min(1, max(0, opacity))
        isHidden = !visible
        setNeedsLayout()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        glass.frame = bounds
        let w = bounds.width, h = bounds.height
        let capsule = CGRect(x: w * 0.16, y: h * 0.30, width: w * 0.68, height: h * 0.40)
        let path = UIBezierPath(roundedRect: capsule, cornerRadius: capsule.height / 2)
        [0.27, 0.50, 0.73].forEach { x in
            let radius: CGFloat = x == 0.27 ? 1.9 : 1.35
            path.append(UIBezierPath(ovalIn: CGRect(x: w * x - radius, y: h * 0.5 - radius,
                                                    width: radius * 2, height: radius * 2)))
        }
        glyph.frame = bounds
        glyph.path = path.cgPath
    }

    @objc private func didTap() { onTap?() }
}
