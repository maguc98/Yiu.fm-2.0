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
    private let nativeTimelineLensRenderer = YiuNativeHubRenderer()
    private let nativeCropRenderer = YiuNativeHubRenderer()
    private let nativeControlBarRenderer = YiuNativeHubRenderer()
    private let nativeNavigationBarRenderer = YiuNativeHubRenderer()
    private let nativeQuickPopupRenderer = YiuNativeHubRenderer()
    private let nativeDropdownPopupRenderer = YiuNativeHubRenderer()
    private let nativeZoomPopupRenderer = YiuNativeHubRenderer()
    private let nativeCoverToastRenderer = YiuNativeHubRenderer()
    private let nativePlaybackCardRenderer = YiuNativeHubRenderer()
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
    private let nativeTimelineLensRenderingEnabled = false
    private let nativeCropRenderingEnabled = false
    private let nativeControlBarRenderingEnabled = false
    private let nativeNavigationBarRenderingEnabled = false
    private let nativeQuickPopupRenderingEnabled = false
    private let nativeDropdownPopupRenderingEnabled = false
    private let nativeZoomPopupRenderingEnabled = false
    private let nativeCoverToastRenderingEnabled = false
    // Playback card is wired to the native glass renderer but stays opt-in until swipe, artwork and controls pass device parity.
    private let nativePlaybackCardRenderingEnabled = false
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
        addSubview(nativeTimelineLensRenderer)
        addSubview(nativeCropRenderer)
        addSubview(nativeControlBarRenderer)
        addSubview(nativeNavigationBarRenderer)
        addSubview(nativeQuickPopupRenderer)
        addSubview(nativeDropdownPopupRenderer)
        addSubview(nativeZoomPopupRenderer)
        addSubview(nativeCoverToastRenderer)
        addSubview(nativePlaybackCardRenderer)
        addSubview(nativeBackButton)
        addSubview(nativeSettingsButton)
        miniBar.isHidden = true
        nativeHubRenderer.isHidden = true
        nativeThemeMenuRenderer.isHidden = true
        nativeFloatingToolsRenderer.isHidden = true
        nativeCommandButtonRenderer.isHidden = true
        nativeSplashWindowRenderer.isHidden = true
        nativeTimelineLensRenderer.isHidden = true
        nativeTimelineLensRenderer.isUserInteractionEnabled = false
        nativeCropRenderer.isHidden = true
        nativeCropRenderer.isUserInteractionEnabled = false
        nativeControlBarRenderer.isHidden = true
        nativeControlBarRenderer.isUserInteractionEnabled = false
        nativeNavigationBarRenderer.isHidden = true
        nativeNavigationBarRenderer.isUserInteractionEnabled = false
        nativeQuickPopupRenderer.isHidden = true
        nativeQuickPopupRenderer.isUserInteractionEnabled = false
        nativeDropdownPopupRenderer.isHidden = true
        nativeDropdownPopupRenderer.isUserInteractionEnabled = false
        nativeZoomPopupRenderer.isHidden = true
        nativeZoomPopupRenderer.isUserInteractionEnabled = false
        nativeCoverToastRenderer.isHidden = true
        nativeCoverToastRenderer.isUserInteractionEnabled = false
        nativePlaybackCardRenderer.isHidden = true
        nativeBackButton.isHidden = true
        nativeSettingsButton.isHidden = true
        nativeHubRenderer.onDidHide = { [weak self] in
            self?.setHubNativePresentation(false)
        }
        nativeThemeMenuRenderer.onDidHide = { [weak self] in
            self?.setThemeMenuNativePresentation(false)
        }
        nativeTimelineLensRenderer.onDidHide = { [weak self] in self?.setNativeMirrorPresentation(id: "tlLens", active: false) }
        nativeCropRenderer.onDidHide = { [weak self] in self?.setNativeMirrorPresentation(id: "crop", active: false) }
        nativeControlBarRenderer.onDidHide = { [weak self] in self?.setNativeMirrorPresentation(id: "cbar", active: false) }
        nativeNavigationBarRenderer.onDidHide = { [weak self] in self?.setNativeMirrorPresentation(id: "lg", active: false) }
        nativeQuickPopupRenderer.onDidHide = { [weak self] in self?.setNativeMirrorPresentation(id: "qpop", active: false) }
        nativeDropdownPopupRenderer.onDidHide = { [weak self] in self?.setNativeMirrorPresentation(id: "ddPop", active: false) }
        nativeZoomPopupRenderer.onDidHide = { [weak self] in self?.setNativeMirrorPresentation(id: "zoomPop", active: false) }
        nativeCoverToastRenderer.onDidHide = { [weak self] in self?.setNativeMirrorPresentation(id: "npToast", active: false) }
        nativePlaybackCardRenderer.onDidHide = { [weak self] in self?.setNativeMirrorPresentation(id: "npCard", active: false) }
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
        if nativeTimelineLensRenderingEnabled {
            let lens = payload["timelineLens"] as? [String: Any] ?? ["open": false]
            nativeTimelineLensRenderer.render(lens) { _, _ in }
            nativeTimelineLensRenderer.isUserInteractionEnabled = false
            setNativeMirrorPresentation(id: "tlLens", active: !nativeTimelineLensRenderer.isHidden)
        } else {
            nativeTimelineLensRenderer.isHidden = true
            setNativeMirrorPresentation(id: "tlLens", active: false)
        }
        if nativeCropRenderingEnabled {
            let crop = payload["cropPanel"] as? [String: Any] ?? ["open": false]
            nativeCropRenderer.render(crop) { [weak self] controlID, value in
                guard let self else { return }
                if let gesture = value as? [String: Any],
                   let kind = gesture["nativeGesture"] as? String,
                   kind == "cropPan" || kind == "cropPinch",
                   let data = try? JSONSerialization.data(withJSONObject: gesture, options: [.fragmentsAllowed]),
                   let json = String(data: data, encoding: .utf8) {
                    self.evaluate("window.YiuCropNativeGesture?.(\(json))")
                } else if let value {
                    self.setHubControl(id: controlID, value: value)
                } else {
                    self.activateHubControl(id: controlID)
                }
            }
            nativeCropRenderer.isUserInteractionEnabled = true
            setNativeMirrorPresentation(id: "crop", active: !nativeCropRenderer.isHidden)
        } else {
            nativeCropRenderer.isHidden = true
            setNativeMirrorPresentation(id: "crop", active: false)
        }
        if nativeNavigationBarRenderingEnabled {
            let bar = payload["navigationBar"] as? [String: Any] ?? ["open": false]
            nativeNavigationBarRenderer.render(bar) { _, _ in }
            nativeNavigationBarRenderer.isUserInteractionEnabled = false
            setNativeMirrorPresentation(id: "lg", active: !nativeNavigationBarRenderer.isHidden)
        } else {
            nativeNavigationBarRenderer.isHidden = true
            setNativeMirrorPresentation(id: "lg", active: false)
        }
        if nativeControlBarRenderingEnabled {
            let bar = payload["controlBar"] as? [String: Any] ?? ["open": false]
            nativeControlBarRenderer.render(bar) { _, _ in }
            nativeControlBarRenderer.isUserInteractionEnabled = false
            setNativeMirrorPresentation(id: "cbar", active: !nativeControlBarRenderer.isHidden)
        } else {
            nativeControlBarRenderer.isHidden = true
            setNativeMirrorPresentation(id: "cbar", active: false)
        }
        if nativeQuickPopupRenderingEnabled {
            let popup = payload["quickPopup"] as? [String: Any] ?? ["open": false]
            nativeQuickPopupRenderer.render(popup) { _, _ in }
            nativeQuickPopupRenderer.isUserInteractionEnabled = false
            setNativeMirrorPresentation(id: "qpop", active: !nativeQuickPopupRenderer.isHidden)
        } else {
            nativeQuickPopupRenderer.isHidden = true
            setNativeMirrorPresentation(id: "qpop", active: false)
        }
        if nativeDropdownPopupRenderingEnabled {
            let popup = payload["dropdownPopup"] as? [String: Any] ?? ["open": false]
            nativeDropdownPopupRenderer.render(popup) { _, _ in }
            nativeDropdownPopupRenderer.isUserInteractionEnabled = false
            setNativeMirrorPresentation(id: "ddPop", active: !nativeDropdownPopupRenderer.isHidden)
        } else {
            nativeDropdownPopupRenderer.isHidden = true
            setNativeMirrorPresentation(id: "ddPop", active: false)
        }
        if nativeZoomPopupRenderingEnabled {
            let popup = payload["zoomPopup"] as? [String: Any] ?? ["open": false]
            nativeZoomPopupRenderer.render(popup) { _, _ in }
            nativeZoomPopupRenderer.isUserInteractionEnabled = false
            setNativeMirrorPresentation(id: "zoomPop", active: !nativeZoomPopupRenderer.isHidden)
        } else {
            nativeZoomPopupRenderer.isHidden = true
            setNativeMirrorPresentation(id: "zoomPop", active: false)
        }
        if nativeCoverToastRenderingEnabled {
            let toast = payload["coverToast"] as? [String: Any] ?? ["open": false]
            nativeCoverToastRenderer.render(toast) { _, _ in }
            nativeCoverToastRenderer.isUserInteractionEnabled = false
            setNativeMirrorPresentation(id: "npToast", active: !nativeCoverToastRenderer.isHidden)
        } else {
            nativeCoverToastRenderer.isHidden = true
            setNativeMirrorPresentation(id: "npToast", active: false)
        }
        if nativePlaybackCardRenderingEnabled {
            let card = payload["playbackCard"] as? [String: Any] ?? ["open": false]
            nativePlaybackCardRenderer.render(card) { [weak self] controlID, value in
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
            setNativeMirrorPresentation(id: "npCard", active: !nativePlaybackCardRenderer.isHidden)
        } else {
            nativePlaybackCardRenderer.isHidden = true
            setNativeMirrorPresentation(id: "npCard", active: false)
        }
        setHubBridgeEnabled(nativeHubRenderingEnabled || nativeThemeMenuRenderingEnabled || nativeBackButtonRenderingEnabled || nativeSettingsButtonRenderingEnabled || nativeFloatingToolsRenderingEnabled || nativeCommandButtonRenderingEnabled || nativeSplashWindowRenderingEnabled || nativeTimelineLensRenderingEnabled || nativeCropRenderingEnabled || nativeControlBarRenderingEnabled || nativeQuickPopupRenderingEnabled || nativeDropdownPopupRenderingEnabled || nativeZoomPopupRenderingEnabled || nativeCoverToastRenderingEnabled || nativePlaybackCardRenderingEnabled)
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
        // The crop modal has the highest independent surface priority and must
        // remain above the dock, toolbar and floating controls when it is open.
        if !nativeCropRenderer.isHidden { bringSubviewToFront(nativeCropRenderer) }
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

    private func setNativeMirrorPresentation(id: String, active: Bool) {
        guard let data = try? JSONSerialization.data(withJSONObject: id, options: [.fragmentsAllowed]),
              let json = String(data: data, encoding: .utf8) else { return }
        evaluate("window.YiuHubBridge?.setNativeMirrorPresentation(\(json), \(active ? "true" : "false"))")
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
