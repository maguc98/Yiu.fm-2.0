import UIKit

/// Native foreground renderer for the control center.
/// The web page remains the single source of truth; native controls forward
/// their actions to YiuHubBridge in the existing WKWebView.
@MainActor
final class YiuNativeHubRenderer: UIView {
    private let glass = YiuLiquidGlassSurface(material: .regular, interactive: false)
    private var actionHandler: ((String, Any?) -> Void)?
    private var lastSnapshotKey = ""

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
        isHidden = true
        addSubview(glass)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func render(_ snapshot: [String: Any], action: @escaping (String, Any?) -> Void) {
        actionHandler = action
        guard (snapshot["open"] as? Bool) == true,
              let rawRect = snapshot["rect"] as? [String: Any],
              let x = number(rawRect["x"]), let y = number(rawRect["y"]),
              let width = number(rawRect["width"]), let height = number(rawRect["height"]),
              width > 0, height > 0,
              let nodes = snapshot["nodes"] as? [[String: Any]], !nodes.isEmpty else {
            isHidden = true
            return
        }

        let snapshotData = (try? JSONSerialization.data(withJSONObject: snapshot, options: [.sortedKeys])) ?? Data()
        let key = snapshotData.base64EncodedString()
        if key == lastSnapshotKey { isHidden = false; return }
        lastSnapshotKey = key

        frame = CGRect(x: x, y: y, width: width, height: height)
        glass.frame = bounds
        glass.layer.cornerRadius = 28
        glass.clipsToBounds = true
        glass.isHidden = false

        glass.foregroundView.subviews.forEach { $0.removeFromSuperview() }
        var views: [String: UIView] = [:]

        for node in nodes {
            guard let id = node["nativeId"] as? String,
                  let parentID = node["parentNativeId"] as? String,
                  let frameData = node["frame"] as? [String: Any],
                  let nx = number(frameData["x"]), let ny = number(frameData["y"]),
                  let nw = number(frameData["width"]), let nh = number(frameData["height"]),
                  nw > 0, nh > 0 else { continue }

            let parent = parentID.isEmpty ? glass.foregroundView : views[parentID]
            guard let parent else { continue }
            let parentOrigin = parentID.isEmpty ? CGPoint(x: x, y: y) :
                (views[parentID]?.convert(.zero, to: self) ?? .zero)
            let localFrame = CGRect(x: nx - x - parentOrigin.x,
                                    y: ny - y - parentOrigin.y,
                                    width: nw, height: nh)
            let appearance = node["appearance"] as? [String: Any] ?? [:]
            let display = (appearance["display"] as? String ?? "block")
            let visibility = (appearance["visibility"] as? String ?? "visible")
            let opacity = CGFloat(number(appearance["opacity"]) ?? 1)
            guard display != "none", visibility != "hidden", opacity > 0.01 else { continue }
            let tag = (node["tag"] as? String ?? "div").lowercased()
            let role = (node["role"] as? String ?? "").lowercased()
            let inputType = (node["type"] as? String ?? "").lowercased()
            let isControl = ["button", "input", "select", "textarea"].contains(tag) ||
                role == "button" || (node["id"] as? String == "miSet")
            let view: UIView
            if tag == "img" {
                let imageView = UIImageView()
                imageView.contentMode = ((node["objectFit"] as? String) == "cover") ? .scaleAspectFill : .scaleAspectFit
                imageView.clipsToBounds = true
                if let source = node["src"] as? String, let url = URL(string: source),
                   url.isFileURL {
                    imageView.image = UIImage(contentsOfFile: url.path)
                }
                view = imageView
            } else if tag == "input" && inputType == "checkbox" {
                let toggle = UISwitch()
                toggle.isOn = node["checked"] as? Bool ?? false
                toggle.addAction(UIAction { [weak self] _ in self?.actionHandler?(id, toggle.isOn) }, for: .valueChanged)
                view = toggle
            } else if tag == "input" && inputType == "range" {
                let slider = UISlider()
                slider.minimumValue = Float(number(node["min"]) ?? 0)
                slider.maximumValue = Float(number(node["max"]) ?? 100)
                slider.value = Float(number(node["value"]) ?? Double(slider.minimumValue))
                slider.addAction(UIAction { [weak self] _ in self?.actionHandler?(id, slider.value) }, for: .valueChanged)
                view = slider
            } else if tag == "input" && ["text", "search", "email", "url", "number"].contains(inputType) {
                let field = UITextField()
                field.borderStyle = .none
                field.text = node["value"] as? String
                field.placeholder = node["placeholder"] as? String
                field.addAction(UIAction { [weak self] _ in self?.actionHandler?(id, field.text ?? "") }, for: .editingDidEnd)
                view = field
            } else if isControl {
                let button = UIButton(type: .custom)
                button.addAction(UIAction { [weak self] _ in self?.actionHandler?(id, nil) }, for: .touchUpInside)
                button.accessibilityLabel = (node["text"] as? String).flatMap { $0.isEmpty ? nil : $0 }
                view = button
            } else {
                view = UIView()
            }
            view.frame = localFrame
            if node["disabled"] as? Bool == true { view.isUserInteractionEnabled = false }
            view.backgroundColor = cssColor(appearance["backgroundColor"])
            view.alpha = opacity
            if true {
                let radius = CGFloat(number(appearance["borderRadius"]) ?? 0)
                view.layer.cornerRadius = max(0, radius)
                view.layer.borderWidth = CGFloat(number(appearance["borderWidth"]) ?? 0)
                view.layer.borderColor = cssColor(appearance["borderColor"])?.cgColor
            }
            if let text = node["text"] as? String, !text.isEmpty {
                let label = UILabel(frame: view.bounds.insetBy(dx: 1, dy: 0))
                label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
                label.text = text
                label.numberOfLines = 0
                label.textColor = cssColor(appearance["color"]) ?? .label
                if true {
                    let size = CGFloat(number(appearance["fontSize"]) ?? 14)
                    let weight = (appearance["fontWeight"] as? String).flatMap(Double.init) ?? 400
                    label.font = .systemFont(ofSize: max(8, min(48, size)),
                                             weight: weight >= 650 ? .bold : (weight >= 550 ? .semibold : .regular))
                    if let align = appearance["textAlign"] as? String {
                        label.textAlignment = align == "center" ? .center : (align == "right" ? .right : .left)
                    }
                }
                view.addSubview(label)
            }
            parent.addSubview(view)
            views[id] = view
        }
        isHidden = false
    }

    private func number(_ value: Any?) -> Double? {
        if let n = value as? NSNumber { return n.doubleValue }
        if let s = value as? String { return Double(s.replacingOccurrences(of: "px", with: "")) }
        return nil
    }

    private func cssColor(_ value: Any?) -> UIColor? {
        guard let string = value as? String else { return nil }
        let s = string.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if s == "transparent" { return .clear }
        if s.hasPrefix("#") {
            var hex = String(s.dropFirst())
            if hex.count == 3 { hex = hex.map { "\($0)\($0)" }.joined() }
            guard let value = UInt64(hex, radix: 16) else { return nil }
            return UIColor(red: CGFloat((value >> 16) & 255) / 255,
                           green: CGFloat((value >> 8) & 255) / 255,
                           blue: CGFloat(value & 255) / 255, alpha: 1)
        }
        if s.hasPrefix("rgba"), let open = s.firstIndex(of: "("), let close = s.lastIndex(of: ")") {
            let parts = s[s.index(after: open)..<close].split { $0 == "," || $0 == " " || $0 == "/" }
                .compactMap { Double($0) }
            if parts.count >= 3 {
                return UIColor(red: CGFloat(parts[0]) / 255, green: CGFloat(parts[1]) / 255,
                               blue: CGFloat(parts[2]) / 255,
                               alpha: CGFloat(parts.count > 3 ? parts[3] : 1))
            }
        }
        if s.hasPrefix("rgb"), let open = s.firstIndex(of: "("), let close = s.lastIndex(of: ")") {
            let parts = s[s.index(after: open)..<close].split { $0 == "," || $0 == " " }
                .compactMap { Double($0) }
            if parts.count >= 3 {
                return UIColor(red: CGFloat(parts[0]) / 255, green: CGFloat(parts[1]) / 255,
                               blue: CGFloat(parts[2]) / 255, alpha: 1)
            }
        }
        return nil
    }
}
