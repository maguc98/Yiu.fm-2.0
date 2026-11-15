import UIKit

/// Native Liquid Glass replacement for the standalone mini settings control.
/// Geometry and visibility come from the existing DOM; taps return to that DOM.
@MainActor
final class YiuNativeSettingsButtonView: UIView {
    private let glass = YiuLiquidGlassSurface(material: .regular, interactive: true)
    private let icon = CAShapeLayer()
    var onTap: (() -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
        addSubview(glass)
        glass.foregroundView.layer.addSublayer(icon)
        icon.fillColor = UIColor.clear.cgColor
        icon.strokeColor = UIColor.white.cgColor
        icon.lineWidth = 2
        icon.lineCap = .round
        icon.lineJoin = .round
        let tap = UITapGestureRecognizer(target: self, action: #selector(didTap))
        addGestureRecognizer(tap)
        isAccessibilityElement = true
        accessibilityLabel = "打开设置"
        isHidden = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func update(rect: CGRect, visible: Bool, opacity: CGFloat, tint: UIColor?) {
        frame = rect
        glass.frame = bounds
        glass.layer.cornerRadius = min(bounds.width, bounds.height) * 0.5
        glass.updateGlassTint(tint)
        alpha = min(1, max(0, opacity))
        isHidden = !visible
        setNeedsLayout()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        glass.frame = bounds
        icon.frame = bounds
        let sx = bounds.width / 24
        let sy = bounds.height / 24
        let path = UIBezierPath()
        path.append(UIBezierPath(roundedRect: CGRect(x: 2.5*sx, y: 6.5*sy, width: 19*sx, height: 11*sy),
                                 cornerRadius: 5.5*min(sx, sy)))
        let play = UIBezierPath()
        play.move(to: CGPoint(x: 8.2*sx, y: 9.6*sy))
        play.addLine(to: CGPoint(x: 8.2*sx, y: 14.4*sy))
        play.addLine(to: CGPoint(x: 11.8*sx, y: 12*sy))
        play.close()
        path.append(play)
        path.move(to: CGPoint(x: 15*sx, y: 12*sy))
        path.addLine(to: CGPoint(x: 17.6*sx, y: 12*sy))
        icon.path = path.cgPath
    }

    @objc private func didTap() { onTap?() }
}
