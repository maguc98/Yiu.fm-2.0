import UIKit
import WebKit

@MainActor
final class NativeWebContainer: UIView {
    let webView: WKWebView
    private let miniBar = YiuNativeMiniPlayerView()
    private let nativeHubRenderer = YiuNativeHubRenderer()
    private let nativeThemeMenuRenderer = YiuNativeHubRenderer()
    private let nativeFloatingToolsRenderer = YiuNativeHubRenderer()
    private let nativeCommandButtonRenderer = YiuNativeHubRenderer()
    private let nativeSplashWindowRenderer = YiuNativeHubRenderer()
    private let nativeBackButton = YiuNativeBackButtonView()
    private let nativeSettingsButton = YiuNativeSettingsButtonView()
    // Keep native rendering opt-in until the complete control set has passed visual and interaction parity checks.
    private let nativeHubRenderingEnabled = false
    // Theme picker remains opt-in until long-press deletion and visual parity pass device testing.
    private let nativeThemeMenuRenderingEnabled = false
    // Keep the standalone toolbar surface off until its visual and hit-target parity is verified on device.
    private let nativeBackButtonRenderingEnabled = false
    // Keep the standalone settings surface opt-in until device parity is verified.
    private let nativeSettingsButtonRenderingEnabled = false
    private let nativeFloatingToolsRenderingEnabled = false
    private let nativeCommandButtonRenderingEnabled = false
    private let nativeSplashWindowRenderingEnabled = false
    private var miniFrame = CGRect.zero
    private var nativeHubBridgeEnabledState: Bool?
    private var nativeHubPresentationState: Bool?
    private(set) var latestHubState: [String: Any] = [:]
    var onHubStateChanged: (([String: Any]) -> Void)?

    init(webView: WKWebView) {
        self.webView = webView
        super.init(frame: .zero)
        backgroundColor = .black
        addSubview(webView)
        addSubview(miniBar)
        addSubview(nativeHubRenderer)
        addSubview(nativeThemeMenuRenderer)
        addSubview(nativeFloatingToolsRenderer)
        addSubview(nativeCommandButtonRenderer)
        addSubview(nativeSplashWindowRenderer)
        addSubview(nativeBackButton)
        addSubview(nativeSettingsButton)
        miniBar.isHidden = true
        nativeHubRenderer.isHidden = true
        nativeThemeMenuRenderer.isHidden = true
        nativeFloatingToolsRenderer.isHidden = true
        nativeCommandButtonRenderer.isHidden = true
        nativeSplashWindowRenderer.isHidden = true
        nativeBackButton.isHidden = true
        nativeSettingsButton.isHidden = true
        nativeHubRenderer.onDidHide = { [weak self] in
            self?.setHubNativePresentation(false)
        }
        nativeThemeMenuRenderer.onDidHide = { [weak self] in
            self?.setThemeMenuNativePresentation(false)
        }
        nativeBackButton.onTap = { [weak self] in
            self?.evaluate("document.getElementById('hback')?.click()")
        }
        nativeSettingsButton.onTap = { [weak self] in
            self?.evaluate("document.getElementById('miSet')?.click()")
        }
        miniBar.onToggle = { [weak self] in
            self?.evaluate("document.getElementById('mini')?.click()")
        }
        miniBar.onPlayPause = { [weak self] in
            self?.evaluate("document.querySelector('#mini .ppb')?.click()")
        }
        miniBar.onNext = { [weak self] in
            self?.evaluate("document.querySelector('#mini .nxb')?.click()")
        }
        miniBar.onSwipeUp = { [weak self] in
            self?.evaluate("window.__yiuOpenMiniPlayerCard?.()")
        }
        miniBar.onHorizontalSwipe = { [weak self] expanded in
            self?.evaluate("document.body.classList.toggle('mx', \(expanded ? "true" : "false"))")
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        webView.frame = bounds
        if !miniFrame.isEmpty { miniBar.frame = miniFrame }
    }

    func applyHubPayload(_ payload: [String: Any]) {
        latestHubState = payload
        if let back = payload["backButton"] as? [String: Any],
           let rectData = back["rect"] as? [String: Any],
           let x = rectData["x"] as? CGFloat,
           let y = rectData["y"] as? CGFloat,
           let width = rectData["width"] as? CGFloat,
           let height = rectData["height"] as? CGFloat {
            let visible = nativeBackButtonRenderingEnabled && (back["visible"] as? Bool ?? false)
            let opacity = back["opacity"] as? CGFloat ?? 1
            let label = back["label"] as? String ?? "展开部分工具栏"
            let tint = (back["backgroundColor"] as? String).flatMap { Self.cssColor($0) }
            let foreground = (back["color"] as? String).flatMap { Self.cssColor($0) }
            nativeBackButton.update(rect: CGRect(x: x, y: y, width: width, height: height),
                                    visible: visible, opacity: opacity, label: label,
                                    tint: tint, foreground: foreground)
            evaluate("window.YiuHubBridge?.setBackNativePresentation(\(visible ? "true" : "false"))")
        } else {
            nativeBackButton.isHidden = true
            evaluate("window.YiuHubBridge?.setBackNativePresentation(false)")
        }
        if let settings = payload["settingsButton"] as? [String: Any],
           let rectData = settings["rect"] as? [String: Any],
           let x = rectData["x"] as? CGFloat,
           let y = rectData["y"] as? CGFloat,
           let width = rectData["width"] as? CGFloat,
           let height = rectData["height"] as? CGFloat {
            let visible = nativeSettingsButtonRenderingEnabled && (settings["visible"] as? Bool ?? false)
            let opacity = settings["opacity"] as? CGFloat ?? 1
            let tint = (settings["backgroundColor"] as? String).flatMap { Self.cssColor($0) }
            let foreground = (settings["color"] as? String).flatMap { Self.cssColor($0) }
            nativeSettingsButton.update(rect: CGRect(x: x, y: y, width: width, height: height),
                                        visible: visible, opacity: opacity, tint: tint, foreground: foreground)
            setNativeFloatingPresentation(id: "miSet", active: visible)
        } else {
            nativeSettingsButton.isHidden = true
            setNativeFloatingPresentation(id: "miSet", active: false)
        }
        if nativeFloatingToolsRenderingEnabled {
            let tools = payload["floatingTools"] as? [String: Any] ?? ["open": false]
            nativeFloatingToolsRenderer.render(tools) { [weak self] controlID, value in
                guard let self else { return }
                self.activateHubControl(id: controlID)
            }
            setNativeFloatingPresentation(id: "hbTools", active: !nativeFloatingToolsRenderer.isHidden)
        } else {
            nativeFloatingToolsRenderer.isHidden = true
            setNativeFloatingPresentation(id: "hbTools", active: false)
        }
        if nativeCommandButtonRenderingEnabled {
            let command = payload["commandButton"] as? [String: Any] ?? ["open": false]
            nativeCommandButtonRenderer.render(command) { [weak self] controlID, value in
                guard let self else { return }
                self.activateHubControl(id: controlID)
            }
            setNativeFloatingPresentation(id: "cmdFab", active: !nativeCommandButtonRenderer.isHidden)
        } else {
            nativeCommandButtonRenderer.isHidden = true
            setNativeFloatingPresentation(id: "cmdFab", active: false)
        }
        if nativeSplashWindowRenderingEnabled {
            let splash = payload["splashWindow"] as? [String: Any] ?? ["open": false]
            nativeSplashWindowRenderer.render(splash) { [weak self] controlID, value in
                guard let self else { return }
                if let values = value as? [String: Double],
                   let top = values["scrollTop"], let left = values["scrollLeft"] {
                    self.setHubScroll(id: controlID, top: top, left: left)
                } else if let value {
                    self.setHubControl(id: controlID, value: value)
                } else {
                    self.activateHubControl(id: controlID)
                }
            }
            setNativeFloatingPresentation(id: "saWinCard", active: !nativeSplashWindowRenderer.isHidden)
        } else {
            nativeSplashWindowRenderer.isHidden = true
            setNativeFloatingPresentation(id: "saWinCard", active: false)
        }
        setHubBridgeEnabled(nativeHubRenderingEnabled || nativeThemeMenuRenderingEnabled || nativeSettingsButtonRenderingEnabled || nativeFloatingToolsRenderingEnabled || nativeCommandButtonRenderingEnabled || nativeSplashWindowRenderingEnabled)
        if nativeHubRenderingEnabled {
            nativeHubRenderer.render(payload) { [weak self] controlID, value in
                guard let self else { return }
                if let values = value as? [String: Double],
                   let top = values["scrollTop"], let left = values["scrollLeft"] {
                    self.setHubScroll(id: controlID, top: top, left: left)
                } else if let value {
                    self.setHubControl(id: controlID, value: value)
                } else {
                    self.activateHubControl(id: controlID)
                }
            }
            // Keep the DOM foreground hidden until the native close animation
            // has actually completed; onDidHide restores it afterward.
            setHubNativePresentation(!nativeHubRenderer.isHidden)
        } else {
            nativeHubRenderer.isHidden = true
            setHubNativePresentation(false)
        }
        let themeMenu = payload["themeMenu"] as? [String: Any] ?? ["open": false]
        if nativeThemeMenuRenderingEnabled {
            nativeThemeMenuRenderer.render(themeMenu) { [weak self] controlID, value in
                guard let self else { return }
                if let gesture = value as? [String: String],
                   gesture["nativeGesture"] == "longPress" {
                    self.longPressHubControl(id: controlID)
                } else if let values = value as? [String: Double],
                          let top = values["scrollTop"], let left = values["scrollLeft"] {
                    self.setHubScroll(id: controlID, top: top, left: left)
                } else if let value {
                    self.setHubControl(id: controlID, value: value)
                } else {
                    self.activateHubControl(id: controlID)
                }
            }
            setThemeMenuNativePresentation(!nativeThemeMenuRenderer.isHidden)
        } else {
            nativeThemeMenuRenderer.isHidden = true
            setThemeMenuNativePresentation(false)
        }
        onHubStateChanged?(payload)
    }

    private static func cssColor(_ value: String) -> UIColor? {
        if value.hasPrefix("#") {
            let hex = String(value.dropFirst())
            guard let number = UInt64(hex, radix: 16) else { return nil }
            switch hex.count {
            case 6:
                return UIColor(red: CGFloat((number >> 16) & 255) / 255,
                               green: CGFloat((number >> 8) & 255) / 255,
                               blue: CGFloat(number & 255) / 255, alpha: 1)
            case 8:
                return UIColor(red: CGFloat((number >> 24) & 255) / 255,
                               green: CGFloat((number >> 16) & 255) / 255,
                               blue: CGFloat((number >> 8) & 255) / 255,
                               alpha: CGFloat(number & 255) / 255)
            default: return nil
            }
        }
        guard value.hasPrefix("rgba(") || value.hasPrefix("rgb(") else { return nil }
        let numbers = value.filter { $0.isNumber || $0 == "." || $0 == "," }
            .split(separator: ",").compactMap { Double($0) }
        guard numbers.count >= 3 else { return nil }
        let alpha = numbers.count > 3 ? CGFloat(numbers[3]) : 1
        return UIColor(red: CGFloat(numbers[0]) / 255, green: CGFloat(numbers[1]) / 255,
                       blue: CGFloat(numbers[2]) / 255, alpha: alpha)
    }

    private func setHubBridgeEnabled(_ enabled: Bool) {
        guard nativeHubBridgeEnabledState != enabled else { return }
        nativeHubBridgeEnabledState = enabled
        evaluate("window.YiuHubBridge?.setEnabled(\(enabled ? "true" : "false"))")
    }

    /// Native controls send commands back to the existing page runtime.
    /// The web DOM remains the single source of truth for settings and actions.
    private func setHubNativePresentation(_ active: Bool) {
        guard nativeHubPresentationState != active else { return }
        nativeHubPresentationState = active
        evaluate("window.YiuHubBridge?.setNativePresentation(\(active ? "true" : "false"))")
    }

    private func setNativeFloatingPresentation(id: String, active: Bool) {
        guard let data = try? JSONSerialization.data(withJSONObject: id, options: [.fragmentsAllowed]),
              let json = String(data: data, encoding: .utf8) else { return }
        evaluate("window.YiuHubBridge?.setNativeFloatingPresentation(\(json), \(active ? "true" : "false"))")
    }

    private func setThemeMenuNativePresentation(_ active: Bool) {
        evaluate("window.YiuHubBridge?.setNativeThemePresentation(\(active ? "true" : "false"))")
    }

    func setHubOpen(_ open: Bool) {
        evaluate("window.YiuHubBridge?.activate(\(open ? "'open'" : "'close'"))")
    }

    func activateHubControl(id: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: id, options: [.fragmentsAllowed]),
              let json = String(data: data, encoding: .utf8) else { return }
        evaluate("window.YiuHubBridge?.activateControl(\(json))")
    }

    private func longPressHubControl(id: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: id, options: [.fragmentsAllowed]),
              let json = String(data: data, encoding: .utf8) else { return }
        evaluate("window.YiuHubBridge?.longPressControl(\(json))")
    }

    func setHubScroll(id: String, top: Double, left: Double) {
        guard let idData = try? JSONSerialization.data(withJSONObject: id, options: [.fragmentsAllowed]),
              let idJSON = String(data: idData, encoding: .utf8) else { return }
        evaluate("window.YiuHubBridge?.setScroll(\(idJSON), \(top), \(left))")
    }

    func setHubControl(id: String, value: Any) {
        guard let idData = try? JSONSerialization.data(withJSONObject: id, options: [.fragmentsAllowed]),
              let valueData = try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed]),
              let idJSON = String(data: idData, encoding: .utf8),
              let valueJSON = String(data: valueData, encoding: .utf8) else { return }
        evaluate("window.YiuHubBridge?.setControl(\(idJSON), \(valueJSON))")
    }

    func applyMiniPayload(_ payload: [String: Any]) {
        miniBar.isHidden = !(payload["visible"] as? Bool ?? false)
        if let x = payload["x"] as? CGFloat,
           let y = payload["y"] as? CGFloat,
           let width = payload["width"] as? CGFloat,
           let height = payload["height"] as? CGFloat {
            miniFrame = CGRect(x: x, y: y, width: width, height: height)
            miniBar.frame = miniFrame
        }
        miniBar.update(payload)
    }

    private func evaluate(_ script: String) {
        webView.evaluateJavaScript(script, completionHandler: nil)
    }
}
