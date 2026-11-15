import UIKit

/// Native foreground renderer for the control center.
/// The web page remains the single source of truth; native controls forward
/// their actions to YiuHubBridge in the existing WKWebView.
@MainActor
final class YiuNativeHubRenderer: UIView {
    private let glass = YiuLiquidGlassSurface(material: .regular, interactive: false)
    private var actionHandler: ((String, Any?) -> Void)?
    private var lastSnapshotKey = ""
    private var scrollViews: [String: YiuNativeHubScrollView] = [:]

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
        let surfaceAppearance = snapshot["surfaceAppearance"] as? [String: Any] ?? [:]
        applyCSSShadow(surfaceAppearance["boxShadow"], to: layer, cornerRadius: 28)
        glass.updateGlassTint(cssColor(surfaceAppearance["backgroundColor"]))
        glass.frame = bounds
        glass.layer.cornerRadius = 28
        glass.clipsToBounds = true
        glass.isHidden = false

        glass.foregroundView.subviews.forEach { $0.removeFromSuperview() }
        scrollViews.removeAll()
        var views: [String: UIView] = [:]
        var contentHosts: [String: UIView] = [:]
        let nodesByParent = Dictionary(grouping: nodes) {
            ($0["parentNativeId"] as? String) ?? ""
        }
        func orderedChildren(_ parentID: String) -> [[String: Any]] {
            let siblings = (nodesByParent[parentID] ?? []).enumerated().sorted { lhs, rhs in
                let leftAppearance = lhs.element["appearance"] as? [String: Any] ?? [:]
                let rightAppearance = rhs.element["appearance"] as? [String: Any] ?? [:]
                let leftZ = self.number(leftAppearance["zIndex"]) ?? 0
                let rightZ = self.number(rightAppearance["zIndex"]) ?? 0
                return leftZ == rightZ ? lhs.offset < rhs.offset : leftZ < rightZ
            }
            return siblings.flatMap { pair -> [[String: Any]] in
                guard let id = pair.element["nativeId"] as? String else { return [pair.element] }
                return [pair.element] + orderedChildren(id)
            }
        }
        let renderNodes = orderedChildren("")

        for node in renderNodes {
            guard let id = node["nativeId"] as? String,
                  let parentID = node["parentNativeId"] as? String,
                  let frameData = node["frame"] as? [String: Any],
                  let nx = number(frameData["x"]), let ny = number(frameData["y"]),
                  let nw = number(frameData["width"]), let nh = number(frameData["height"]),
                  nw > 0, nh > 0 else { continue }

            let parentHost = parentID.isEmpty ? glass.foregroundView : contentHosts[parentID]
            guard let parentHost else { continue }
            // DOM frames are viewport-relative. Root nodes are relative to
            // the glass surface; nested nodes are relative to their native parent.
            let parentOrigin = parentID.isEmpty ? CGPoint.zero :
                (views[parentID]?.convert(.zero, to: self) ?? .zero)
            // getBoundingClientRect() reports children inside a scroller at
            // their viewport position. Native scroll content uses content-space
            // coordinates, so restore the source scroll offset before insertion.
            let parentNode = nodes.first { ($0["nativeId"] as? String) == parentID }
            let parentScrollLeft = parentID.isEmpty ? 0 : (number(parentNode?["scrollLeft"]) ?? 0)
            let parentScrollTop = parentID.isEmpty ? 0 : (number(parentNode?["scrollTop"]) ?? 0)
            let localFrame = CGRect(x: nx - x - parentOrigin.x + parentScrollLeft,
                                    y: ny - y - parentOrigin.y + parentScrollTop,
                                    width: nw, height: nh)
            let appearance = node["appearance"] as? [String: Any] ?? [:]
            let display = (appearance["display"] as? String ?? "block")
            let visibility = (appearance["visibility"] as? String ?? "visible")
            let opacity = CGFloat(number(appearance["opacity"]) ?? 1)
            guard display != "none", visibility != "hidden", opacity > 0.01 else { continue }
            let tag = (node["tag"] as? String ?? "div").lowercased()
            let role = (node["role"] as? String ?? "").lowercased()
            let inputType = (node["type"] as? String ?? "").lowercased()
            let href = (node["href"] as? String) ?? ""
            let tabIndex = number(node["tabIndex"]) ?? -1
            let isControl = ["button", "input", "select", "textarea"].contains(tag) ||
                (tag == "a" && !href.isEmpty) || tabIndex >= 0 ||
                ["button", "link", "checkbox", "switch", "slider", "menuitem"].contains(role) ||
                (node["id"] as? String == "miSet")
            let overflowY = (appearance["overflowY"] as? String) ?? (appearance["overflow"] as? String ?? "visible")
            let overflowX = (appearance["overflowX"] as? String) ?? (appearance["overflow"] as? String ?? "visible")
            let scrollable = tag != "textarea" && (["auto", "scroll"].contains(overflowY) || ["auto", "scroll"].contains(overflowX))
            let backdropFilter = (appearance["backdropFilter"] as? String ?? "none").lowercased()
            let usesGlass = !backdropFilter.isEmpty && backdropFilter != "none"
            let view: UIView
            if scrollable {
                let scroll = YiuNativeHubScrollView()
                scroll.showsVerticalScrollIndicator = ["auto", "scroll"].contains(overflowY)
                scroll.showsHorizontalScrollIndicator = ["auto", "scroll"].contains(overflowX)
                scroll.alwaysBounceVertical = overflowY == "scroll"
                scroll.alwaysBounceHorizontal = overflowX == "scroll"
                if usesGlass {
                    scroll.setGlassBackground(YiuLiquidGlassSurface(
                        material: .regular,
                        interactive: false,
                        tintColor: cssColor(appearance["backgroundColor"])
                    ))
                }
                scroll.onScrollEnded = { [weak self] offset in
                    self?.actionHandler?(id, ["scrollTop": offset.y, "scrollLeft": offset.x])
                }
                scrollViews[id] = scroll
                view = scroll
            } else if usesGlass {
                view = YiuLiquidGlassSurface(
                    material: .regular,
                    interactive: false,
                    tintColor: cssColor(appearance["backgroundColor"])
                )
            } else if tag == "svg" {
                let imageView = UIImageView()
                imageView.contentMode = .scaleAspectFit
                if let dataURL = node["svgImage"] as? String,
                   let comma = dataURL.firstIndex(of: ",") {
                    let encoded = String(dataURL[dataURL.index(after: comma)...])
                    if let data = Data(base64Encoded: encoded) {
                        imageView.image = UIImage(data: data)
                    }
                }
                view = imageView
            } else if tag == "img" {
                let imageView = UIImageView()
                imageView.contentMode = ((node["objectFit"] as? String) == "cover") ? .scaleAspectFill : .scaleAspectFit
                imageView.clipsToBounds = true
                if let source = node["src"] as? String {
                    if source.hasPrefix("data:image/"), let comma = source.firstIndex(of: ",") {
                        let encoded = String(source[source.index(after: comma)...])
                        if let data = Data(base64Encoded: encoded) {
                            imageView.image = UIImage(data: data)
                        }
                    } else if let url = URL(string: source), url.isFileURL {
                        imageView.image = UIImage(contentsOfFile: url.path)
                    }
                }
                view = imageView
            } else if (tag == "input" && inputType == "checkbox") || role == "switch" || role == "checkbox" {
                let toggle = UISwitch()
                toggle.isOn = (node["checked"] as? Bool) ??
                    ((node["ariaChecked"] as? String) == "true")
                toggle.addAction(UIAction { [weak self] _ in self?.actionHandler?(id, toggle.isOn) }, for: .valueChanged)
                view = toggle
            } else if (tag == "input" && inputType == "range") || role == "slider" {
                let slider = UISlider()
                let minimum = number(node["min"]) ?? number(node["ariaValueMin"]) ?? 0
                let maximum = number(node["max"]) ?? number(node["ariaValueMax"]) ?? 100
                let step = number(node["step"]) ?? 0
                slider.minimumValue = Float(minimum)
                slider.maximumValue = Float(maximum > minimum ? maximum : minimum + 1)
                slider.value = Float(number(node["value"]) ?? number(node["ariaValueNow"]) ?? minimum)
                slider.setMinimumTrackImage(sliderTrackImage(color: UIColor.white.withAlphaComponent(0.62)), for: .normal)
                slider.setMaximumTrackImage(sliderTrackImage(color: UIColor.white.withAlphaComponent(0.14)), for: .normal)
                slider.setThumbImage(sliderThumbImage(), for: .normal)
                slider.addAction(UIAction { [weak self] _ in
                    let raw = Double(slider.value)
                    let stepped = step > 0 ? minimum + ((raw - minimum) / step).rounded() * step : raw
                    self?.actionHandler?(id, min(maximum, max(minimum, stepped)))
                }, for: .valueChanged)
                view = slider
            } else if tag == "input" && inputType == "color" {
                let colorButton = YiuNativeColorPickerButton(frame: .zero)
                colorButton.backgroundColor = cssColor(node["value"]) ?? .white
                colorButton.onColorChange = { [weak self] hex in self?.actionHandler?(id, hex) }
                view = colorButton
            } else if tag == "select" {
                let button = UIButton(type: .system)
                let options = node["options"] as? [[String: Any]] ?? []
                let currentValue = node["value"] as? String ?? ""
                let selectedTitle = (options.first { ($0["value"] as? String) == currentValue }?["label"] as? String) ?? currentValue
                button.setTitle(selectedTitle, for: .normal)
                let menuItems = options.map { option -> UIAction in
                    let title = option["label"] as? String ?? ""
                    let value = option["value"] as? String ?? ""
                    let disabled = option["disabled"] as? Bool ?? false
                    return UIAction(title: title,
                                    attributes: disabled ? .disabled : [],
                                    state: value == currentValue ? .on : .off) { [weak self] _ in
                        self?.actionHandler?(id, value)
                    }
                }
                button.menu = UIMenu(children: menuItems)
                button.showsMenuAsPrimaryAction = true
                view = button
            } else if tag == "textarea" {
                let textView = YiuNativeHubTextView(frame: .zero, textContainer: nil)
                textView.text = node["value"] as? String ?? ""
                textView.placeholderText = node["placeholder"] as? String
                textView.font = .systemFont(ofSize: CGFloat(number(appearance["fontSize"]) ?? 14))
                textView.textColor = cssColor(appearance["color"]) ?? .label
                textView.onTextChanged = { [weak self] text in self?.actionHandler?(id, text) }
                view = textView
            } else if tag == "input" && ["text", "search", "email", "url", "number"].contains(inputType) {
                let field = UITextField()
                field.borderStyle = .none
                field.text = node["value"] as? String
                field.placeholder = node["placeholder"] as? String
                switch inputType {
                case "number": field.keyboardType = .decimalPad
                case "email": field.keyboardType = .emailAddress
                case "url": field.keyboardType = .URL
                case "search": field.returnKeyType = .search
                default: break
                }
                field.addAction(UIAction { [weak self] _ in self?.actionHandler?(id, field.text ?? "") }, for: .editingChanged)
                view = field
            } else if isControl {
                let button = UIButton(type: .custom)
                button.addAction(UIAction { [weak self] _ in self?.actionHandler?(id, nil) }, for: .touchUpInside)
                button.accessibilityLabel = (node["text"] as? String).flatMap { $0.isEmpty ? nil : $0 }
                if !href.isEmpty { button.accessibilityHint = "打开链接" }
                view = button
            } else {
                view = UIView()
            }
            view.frame = localFrame
            if node["disabled"] as? Bool == true { view.isUserInteractionEnabled = false }
            if let glassView = view as? YiuLiquidGlassSurface {
                glassView.updateGlassTint(cssColor(appearance["backgroundColor"]))
            } else {
                view.backgroundColor = cssColor(appearance["backgroundColor"])
            }
            let contentHost = (view as? YiuLiquidGlassSurface)?.foregroundView ?? view
            if let cssBackground = appearance["backgroundImage"] as? String,
               let image = imageFromCSSBackground(cssBackground) {
                let imageView = UIImageView(frame: view.bounds)
                imageView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
                let size = (appearance["backgroundSize"] as? String ?? "").lowercased()
                imageView.contentMode = size.contains("contain") ? .scaleAspectFit : .scaleAspectFill
                imageView.image = image
                imageView.clipsToBounds = true
                contentHost.insertSubview(imageView, at: 0)
            }
            view.alpha = opacity
            if ["hidden", "clip", "auto", "scroll"].contains(overflowY) || ["hidden", "clip", "auto", "scroll"].contains(overflowX) { view.clipsToBounds = true }
            if true {
                let radius = CGFloat(number(appearance["borderRadius"]) ?? 0)
                view.layer.cornerRadius = max(0, radius)
                view.layer.borderWidth = CGFloat(number(appearance["borderWidth"]) ?? 0)
                view.layer.borderColor = cssColor(appearance["borderColor"])?.cgColor
            }
            if let text = node["text"] as? String, !text.isEmpty {
                let padding = edgeInsets(appearance["padding"])
                let label = UILabel(frame: view.bounds.inset(by: padding))
                label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
                label.numberOfLines = 0
                let textColor = cssColor(appearance["color"]) ?? .label
                label.textColor = textColor
                let size = CGFloat(number(appearance["fontSize"]) ?? 14)
                let weight = (appearance["fontWeight"] as? String).flatMap(Double.init) ?? 400
                let fallbackFont = UIFont.systemFont(ofSize: max(8, min(48, size)),
                                                     weight: weight >= 750 ? .heavy : (weight >= 650 ? .bold : (weight >= 550 ? .semibold : .regular)))
                let family = (appearance["fontFamily"] as? String)?
                    .split(separator: ",").first.map { $0.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "\"", with: "") }
                label.font = family.flatMap { UIFont(name: $0, size: max(8, min(48, size))) } ?? fallbackFont
                let paragraph = NSMutableParagraphStyle()
                if let align = appearance["textAlign"] as? String {
                    paragraph.alignment = align == "center" ? .center : (align == "right" ? .right : .left)
                    label.textAlignment = paragraph.alignment
                }
                if let lineHeight = number(appearance["lineHeight"]), lineHeight > 0 {
                    paragraph.minimumLineHeight = CGFloat(lineHeight)
                    paragraph.maximumLineHeight = CGFloat(lineHeight)
                }
                let kern = CGFloat(number(appearance["letterSpacing"]) ?? 0)
                label.attributedText = NSAttributedString(string: text, attributes: [
                    .font: label.font as Any, .foregroundColor: textColor,
                    .kern: kern, .paragraphStyle: paragraph
                ])
                contentHost.addSubview(label)
            }
            parentHost.addSubview(view)
            views[id] = view
            contentHosts[id] = contentHost
        }

        for (id, scroll) in scrollViews {
            let contentWidth = max(number((nodes.first { ($0["nativeId"] as? String) == id }?["scrollWidth"])) ?? 0,
                                   scroll.subviews.map { Double($0.frame.maxX) }.max() ?? 0)
            let contentHeight = max(number((nodes.first { ($0["nativeId"] as? String) == id }?["scrollHeight"])) ?? 0,
                                    scroll.subviews.map { Double($0.frame.maxY) }.max() ?? 0)
            scroll.contentSize = CGSize(width: contentWidth, height: contentHeight)
            let source = nodes.first { ($0["nativeId"] as? String) == id }
            scroll.contentOffset = CGPoint(x: number(source?["scrollLeft"]) ?? 0,
                                           y: number(source?["scrollTop"]) ?? 0)
        }
        isHidden = false
    }




    private func applyCSSShadow(_ value: Any?, to target: CALayer, cornerRadius: CGFloat) {
        guard let raw = value as? String, raw != "none" else {
            target.shadowOpacity = 0
            target.shadowPath = nil
            return
        }
        let colorString: String
        if let range = raw.range(of: "rgba?\\([^)]*\\)", options: .regularExpression) {
            colorString = String(raw[range])
        } else {
            colorString = "rgba(0,0,0,0.32)"
        }
        let numericSource = raw.replacingOccurrences(of: colorString, with: "")
            .replacingOccurrences(of: "inset", with: "")
        let values = numericSource.split(whereSeparator: { $0 == " " || $0 == "\t" })
            .compactMap { Double(String($0).replacingOccurrences(of: "px", with: "")) }
        guard values.count >= 3 else { return }
        let color = cssColor(colorString) ?? .black
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 1
        color.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        target.shadowColor = UIColor(red: red, green: green, blue: blue, alpha: 1).cgColor
        target.shadowOpacity = Float(alpha)
        target.shadowOffset = CGSize(width: values[0], height: values[1])
        target.shadowRadius = max(0, values[2] * 0.5)
        target.shadowPath = UIBezierPath(roundedRect: bounds, cornerRadius: cornerRadius).cgPath
    }

    private func sliderTrackImage(color: UIColor) -> UIImage {
        let size = CGSize(width: 12, height: 6)
        let renderer = UIGraphicsImageRenderer(size: size)
        let image = renderer.image { _ in
            color.setFill()
            UIBezierPath(roundedRect: CGRect(origin: .zero, size: size), cornerRadius: 3).fill()
        }
        return image.resizableImage(withCapInsets: UIEdgeInsets(top: 0, left: 3, bottom: 0, right: 3))
    }

    private func sliderThumbImage() -> UIImage {
        let size = CGSize(width: 42, height: 30)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { context in
            context.cgContext.setShadow(offset: CGSize(width: 0, height: 2),
                                       blur: 6,
                                       color: UIColor.black.withAlphaComponent(0.35).cgColor)
            UIColor.white.setFill()
            UIBezierPath(roundedRect: CGRect(x: 4, y: 4, width: 34, height: 22),
                         cornerRadius: 11).fill()
        }
    }

    private func imageFromCSSBackground(_ value: String) -> UIImage? {
        guard let start = value.range(of: "url("),
              let end = value[start.upperBound...].firstIndex(of: ")") else { return nil }
        let source = value[start.upperBound..<end]
            .trimmingCharacters(in: CharacterSet(charactersIn: " \"'"))
        if source.hasPrefix("data:image/"),
           let comma = source.firstIndex(of: ",") {
            let encoded = String(source[source.index(after: comma)...])
            if let data = Data(base64Encoded: encoded) { return UIImage(data: data) }
        }
        if let url = URL(string: source), url.isFileURL {
            return UIImage(contentsOfFile: url.path)
        }
        return nil
    }

    private func edgeInsets(_ value: Any?) -> UIEdgeInsets {
        guard let raw = value as? String else { return .zero }
        let parts = raw.split(whereSeparator: { $0 == " " }).compactMap { Double(String($0).replacingOccurrences(of: "px", with: "")) }
        guard !parts.isEmpty else { return .zero }
        let top = parts[0]
        let right = parts.count > 1 ? parts[1] : top
        let bottom = parts.count > 2 ? parts[2] : top
        let left = parts.count > 3 ? parts[3] : right
        return UIEdgeInsets(top: top, left: left, bottom: bottom, right: right)
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


@MainActor
private final class YiuNativeHubScrollView: UIScrollView, UIScrollViewDelegate {
    var onScrollEnded: ((CGPoint) -> Void)?
    private var glassBackground: YiuLiquidGlassSurface?

    func setGlassBackground(_ surface: YiuLiquidGlassSurface) {
        glassBackground = surface
        insertSubview(surface, at: 0)
        setNeedsLayout()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        glassBackground?.frame = CGRect(origin: contentOffset, size: bounds.size)
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        delegate = self
        backgroundColor = .clear
        clipsToBounds = true
        contentInsetAdjustmentBehavior = .never
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func scrollViewDidEndDragging(_ scrollView: UIScrollView, willDecelerate decelerate: Bool) {
        if !decelerate { onScrollEnded?(contentOffset) }
    }

    func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
        onScrollEnded?(contentOffset)
    }
}


@MainActor
private final class YiuNativeHubTextView: UITextView, UITextViewDelegate {
    var placeholderText: String? {
        didSet { placeholderLabel.text = placeholderText; updatePlaceholder() }
    }
    var onTextChanged: ((String) -> Void)?
    private let placeholderLabel = UILabel()

    override init(frame: CGRect, textContainer: NSTextContainer?) {
        super.init(frame: frame, textContainer: textContainer)
        delegate = self
        backgroundColor = .clear
        textContainerInset = UIEdgeInsets(top: 6, left: 4, bottom: 6, right: 4)
        placeholderLabel.font = .systemFont(ofSize: 14)
        placeholderLabel.textColor = .secondaryLabel
        addSubview(placeholderLabel)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        placeholderLabel.frame = CGRect(x: textContainerInset.left + 4,
                                        y: textContainerInset.top,
                                        width: max(0, bounds.width - textContainerInset.left - textContainerInset.right - 8),
                                        height: 22)
    }

    func textViewDidChange(_ textView: UITextView) {
        updatePlaceholder()
        onTextChanged?(textView.text)
    }
    func textViewDidEndEditing(_ textView: UITextView) {
        updatePlaceholder()
    }

    private func updatePlaceholder() {
        placeholderLabel.isHidden = !text.isEmpty
    }
}

@MainActor
private final class YiuNativeColorPickerButton: UIButton, UIColorPickerViewControllerDelegate {
    var onColorChange: ((String) -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        layer.cornerRadius = 8
        layer.borderWidth = 1
        layer.borderColor = UIColor.white.withAlphaComponent(0.35).cgColor
        addAction(UIAction { [weak self] _ in self?.presentPicker() }, for: .touchUpInside)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func presentPicker() {
        var responder: UIResponder? = self
        while let current = responder {
            if let controller = current as? UIViewController {
                let picker = UIColorPickerViewController()
                picker.selectedColor = backgroundColor ?? .white
                picker.delegate = self
                controller.present(picker, animated: true)
                return
            }
            responder = current.next
        }
    }

    func colorPickerViewControllerDidSelectColor(_ viewController: UIColorPickerViewController) {
        backgroundColor = viewController.selectedColor
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 1
        viewController.selectedColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        let hex = String(format: "#%02X%02X%02X", Int(red * 255), Int(green * 255), Int(blue * 255))
        onColorChange?(hex)
    }
}

