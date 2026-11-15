import UIKit

/// Native mini-player surface. The web DOM remains the source of truth,
/// while all visible mini-player foreground content is rendered in UIKit.
@MainActor
final class YiuNativeMiniPlayerView: UIView, UIGestureRecognizerDelegate {
    private let glass = YiuLiquidGlassSurface(material: .regular, interactive: true)
    private let artwork = UIView()
    private let artworkImage = UIImageView()
    private let artworkFallback = UILabel()
    private let statusLabel = UILabel()
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()
    private let playButton = UIButton(type: .system)
    private let nextButton = UIButton(type: .system)
    private var rowStack: UIStackView!
    private var textStack: UIStackView!
    private var playWidth: NSLayoutConstraint!
    private var nextWidth: NSLayoutConstraint!
    private var isExpanded = false
    private var lastArtworkKey = ""
    var onToggle: (() -> Void)?
    var onPlayPause: (() -> Void)?
    var onNext: (() -> Void)?
    var onSwipeUp: (() -> Void)?
    var onHorizontalSwipe: ((Bool) -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        configure()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        configure()
    }

    private func configure() {
        backgroundColor = .clear
        isOpaque = false
        glass.translatesAutoresizingMaskIntoConstraints = false
        addSubview(glass)
        NSLayoutConstraint.activate([
            glass.leadingAnchor.constraint(equalTo: leadingAnchor),
            glass.trailingAnchor.constraint(equalTo: trailingAnchor),
            glass.topAnchor.constraint(equalTo: topAnchor),
            glass.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
        glass.layer.cornerRadius = 24
        glass.clipsToBounds = true

        let row = UIStackView()
        rowStack = row
        row.axis = .horizontal
        row.alignment = .center
        row.spacing = 10
        row.translatesAutoresizingMaskIntoConstraints = false
        glass.foregroundView.addSubview(row)
        NSLayoutConstraint.activate([
            row.leadingAnchor.constraint(equalTo: glass.foregroundView.leadingAnchor, constant: 10),
            row.trailingAnchor.constraint(equalTo: glass.foregroundView.trailingAnchor, constant: -10),
            row.centerYAnchor.constraint(equalTo: glass.foregroundView.centerYAnchor),
            row.heightAnchor.constraint(equalToConstant: 46)
        ])

        artwork.translatesAutoresizingMaskIntoConstraints = false
        artwork.layer.cornerRadius = 14
        artwork.clipsToBounds = true
        artwork.backgroundColor = UIColor(red: 0.48, green: 0.58, blue: 0.88, alpha: 0.72)
        let gradient = CAGradientLayer()
        gradient.colors = [
            UIColor(red: 143/255, green: 176/255, blue: 1, alpha: 0.60).cgColor,
            UIColor.white.withAlphaComponent(0.12).cgColor
        ]
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint = CGPoint(x: 1, y: 1)
        gradient.frame = CGRect(x: 0, y: 0, width: 46, height: 46)
        artwork.layer.insertSublayer(gradient, at: 0)
        artworkImage.translatesAutoresizingMaskIntoConstraints = false
        artworkImage.contentMode = .scaleAspectFill
        artworkImage.clipsToBounds = true
        artworkFallback.translatesAutoresizingMaskIntoConstraints = false
        artworkFallback.text = "文"
        artworkFallback.textColor = .white
        artworkFallback.font = .systemFont(ofSize: 22, weight: .heavy)
        artworkFallback.textAlignment = .center
        artwork.addSubview(artworkImage)
        artwork.addSubview(artworkFallback)
        NSLayoutConstraint.activate([
            artwork.widthAnchor.constraint(equalToConstant: 46),
            artwork.heightAnchor.constraint(equalToConstant: 46),
            artworkImage.leadingAnchor.constraint(equalTo: artwork.leadingAnchor),
            artworkImage.trailingAnchor.constraint(equalTo: artwork.trailingAnchor),
            artworkImage.topAnchor.constraint(equalTo: artwork.topAnchor),
            artworkImage.bottomAnchor.constraint(equalTo: artwork.bottomAnchor),
            artworkFallback.leadingAnchor.constraint(equalTo: artwork.leadingAnchor),
            artworkFallback.trailingAnchor.constraint(equalTo: artwork.trailingAnchor),
            artworkFallback.topAnchor.constraint(equalTo: artwork.topAnchor),
            artworkFallback.bottomAnchor.constraint(equalTo: artwork.bottomAnchor)
        ])
        row.addArrangedSubview(artwork)

        let textStack = UIStackView(arrangedSubviews: [statusLabel, titleLabel, subtitleLabel])
        self.textStack = textStack
        textStack.axis = .vertical
        textStack.alignment = .leading
        textStack.spacing = 1
        row.addArrangedSubview(textStack)
        textStack.setContentHuggingPriority(.defaultLow, for: .horizontal)
        textStack.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        statusLabel.text = "正在播放"
        statusLabel.font = .systemFont(ofSize: 11, weight: .regular)
        statusLabel.textColor = UIColor.white.withAlphaComponent(0.62)
        titleLabel.font = .systemFont(ofSize: 16, weight: .heavy)
        titleLabel.textColor = .white
        titleLabel.lineBreakMode = .byTruncatingTail
        subtitleLabel.font = .systemFont(ofSize: 12, weight: .regular)
        subtitleLabel.textColor = UIColor.white.withAlphaComponent(0.62)
        subtitleLabel.lineBreakMode = .byTruncatingTail

        configureButton(playButton, symbol: "pause.fill", action: #selector(playTapped))
        configureButton(nextButton, symbol: "forward.end.fill", action: #selector(nextTapped))
        playButton.accessibilityLabel = "暂停或继续"
        nextButton.accessibilityLabel = "下一句"
        row.addArrangedSubview(playButton)
        row.addArrangedSubview(nextButton)
        row.setCustomSpacing(0, after: textStack)
        row.setCustomSpacing(0, after: playButton)
        playWidth = playButton.widthAnchor.constraint(equalToConstant: 0)
        nextWidth = nextButton.widthAnchor.constraint(equalToConstant: 0)
        NSLayoutConstraint.activate([
            playButton.heightAnchor.constraint(equalToConstant: 42),
            nextButton.heightAnchor.constraint(equalToConstant: 42),
            playWidth, nextWidth
        ])

        let pan = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
        pan.delegate = self
        pan.cancelsTouchesInView = false
        addGestureRecognizer(pan)
        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
        tap.delegate = self
        tap.cancelsTouchesInView = false
        addGestureRecognizer(tap)
    }

    private func configureButton(_ button: UIButton, symbol: String, action: Selector) {
        button.translatesAutoresizingMaskIntoConstraints = false
        button.tintColor = .white
        button.backgroundColor = UIColor.white.withAlphaComponent(0.12)
        button.layer.cornerRadius = 21
        button.setImage(UIImage(systemName: symbol), for: .normal)
        button.addTarget(self, action: action, for: .touchUpInside)
    }

    func update(_ payload: [String: Any]) {
        if let value = payload["title"] as? String { titleLabel.text = value.isEmpty ? "—" : value }
        if let value = payload["subtitle"] as? String { subtitleLabel.text = value }
        if let value = payload["status"] as? String { statusLabel.text = value }
        if let value = payload["coverText"] as? String, artworkImage.image == nil {
            artworkFallback.text = value.isEmpty ? "文" : value
        }
        if let value = payload["playing"] as? Bool {
            playButton.setImage(UIImage(systemName: value ? "pause.fill" : "play.fill"), for: .normal)
        }
        if let value = payload["expanded"] as? Bool, value != isExpanded {
            isExpanded = value
            playWidth.constant = value ? 42 : 0
            nextWidth.constant = value ? 42 : 0
            rowStack.setCustomSpacing(value ? 10 : 0, after: textStack)
            rowStack.setCustomSpacing(value ? 10 : 0, after: playButton)
            UIView.animate(withDuration: 0.28, delay: 0, usingSpringWithDamping: 0.82, initialSpringVelocity: 0.2) {
                self.layoutIfNeeded()
                self.playButton.alpha = value ? 1 : 0
                self.nextButton.alpha = value ? 1 : 0
            }
        }
        if let value = payload["artwork"] as? String, value != lastArtworkKey {
            lastArtworkKey = value
            if let data = Self.imageData(fromCSSBackground: value), let image = UIImage(data: data) {
                artworkImage.image = image
                artworkFallback.isHidden = true
            } else {
                artworkImage.image = nil
                artworkFallback.isHidden = false
            }
        }
    }

    private static func imageData(fromCSSBackground value: String) -> Data? {
        guard let range = value.range(of: "data:image/") else { return nil }
        let tail = value[range.lowerBound...]
        guard let comma = tail.firstIndex(of: ",") else { return nil }
        let encoded = tail[tail.index(after: comma)...]
        let base64 = String(encoded.prefix { $0 != ")" && $0 != "'" && $0 != "\"" && $0 != " " })
        guard base64.count < 8_000_000 else { return nil }
        return Data(base64Encoded: base64)
    }

    @objc private func playTapped() { onPlayPause?() }
    @objc private func nextTapped() { onNext?() }
    @objc private func handleTap(_ recognizer: UITapGestureRecognizer) {
        if recognizer.state == .ended { onToggle?() }
    }
    @objc private func handlePan(_ recognizer: UIPanGestureRecognizer) {
        guard recognizer.state == .ended else { return }
        let translation = recognizer.translation(in: self)
        if abs(translation.x) > 36 && abs(translation.x) > abs(translation.y) * 1.5 {
            onHorizontalSwipe?(translation.x > 0)
        } else if translation.y < -36 && abs(translation.y) > abs(translation.x) * 1.5 {
            onSwipeUp?()
        }
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        var candidate = touch.view
        while let view = candidate, view !== self {
            if view is UIButton { return false }
            candidate = view.superview
        }
        return true
    }
}
