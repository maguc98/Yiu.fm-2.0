import SwiftUI
import UIKit

/// App entry point for the native SwiftUI experience.
/// The legacy WKWebView host is deliberately not used by this navigation tree.
struct YiuRootView: View {
    @State private var path: [NativeRoute] = []
    @State private var showingControlCenter = false
    @State private var isMiniExpanded = false
    @State private var showingExpandedPlayer = false
    @StateObject private var player = YiuAudioPlayer()
    @StateObject private var appearance = NativeAppearanceStore()
    @StateObject private var textDeck = NativeTextDeckStore()
    @StateObject private var presentation = NativePresentationState()
    @Environment(\.scenePhase) private var scenePhase
    @AppStorage("yiufm.native.system.keepAwake") private var keepScreenAwake = false
    @AppStorage("yiufm.native.ui.autoHideDelay") private var autoHideDelay = 10
    @State private var isMiniPlayerHiddenByTimer = false
    @State private var autoHideTask: Task<Void, Never>?

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottom) {
                NavigationStack(path: $path) {
                    NativeHomeView(
                        player: player,
                        appearance: appearance,
                        openMusic: { path.append(.music) },
                        openVisualizer: { path.append(.visualizer) },
                        openText: { path.append(.textDisplay) },
                        openCategories: { path.append(.categories) },
                        openControlCenter: { showingControlCenter = true }
                    )
                    .navigationDestination(for: NativeRoute.self) { route in
                        switch route {
                        case .categories:
                            NativeFeatureCategoriesView(
                                onSelect: { category in
                                    if category.title == "音乐与播放" {
                                        path.append(.music)
                                    } else if category.title == "背景与封面" {
                                        path.append(.background)
                                    } else if category.title == "文字与排版" {
                                        path.append(.typography)
                                    } else if category.title == "系统与性能" {
                                        path.append(.system)
                                    } else if category.title == "项目与备份" {
                                        path.append(.backup)
                                    } else if category.title == "开发者工具" {
                                        path.append(.developer)
                                    } else {
                                        path.append(.feature(category))
                                    }
                                },
                                onClose: {
                                    if !path.isEmpty { path.removeLast() }
                                }
                            )
                        case .music:
                            NativeMusicView(player: player, appearance: appearance)
                        case .visualizer:
                            NativeVisualizerView(player: player, appearance: appearance)
                        case .tuning:
                            NativeVisualTuningSettingsView()
                        case .textDisplay:
                            NativeTextDisplayView(store: textDeck, appearance: appearance)
                        case .background:
                            NativeBackgroundSettingsView(appearance: appearance)
                        case .typography:
                            NativeTypographySettingsView(textDeck: textDeck, appearance: appearance)
                        case .system:
                            NativeSystemSettingsView()
                        case .backup:
                            NativeBackupSettingsView(player: player, textDeck: textDeck)
                        case .developer:
                            NativeDeveloperToolsView(player: player)
                        case .feature(let category):
                            NativeFeatureDetailView(category: category)
                        }
                    }
                }
                .tint(Color(red: 0.56, green: 0.68, blue: 0.93))
                .preferredColorScheme(.light)
                .environmentObject(presentation)

                if !presentation.hideMiniPlayer && !isMiniPlayerHiddenByTimer {
                    ZStack {
                        NativeMiniPlayerBar(
                            player: player,
                            appearance: appearance,
                            isExpanded: $isMiniExpanded,
                            onOpenControlCenter: { toggleControlCenterPanel() },
                            onSwipeUp: { openExpandedPlayerCard() }
                        )
                        .frame(width: miniPlayerWidth(for: geometry))
                        .padding(.leading, 12)
                        .padding(.bottom, max(geometry.safeAreaInsets.bottom, 34) + 4)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)

                        if !isMiniExpanded && !showingControlCenter && !showingExpandedPlayer {
                            Button {
                                openControlCenterPanel()
                            } label: {
                                NativeMiniSettingsGlyph()
                                    .font(.system(size: 17, weight: .semibold))
                                    .foregroundStyle(.white)
                                    .frame(width: 52, height: 52)
                                    .background {
                                        Circle()
                                            .fill(.ultraThinMaterial)
                                            .overlay {
                                                Circle().fill(Color(red: 34.0 / 255.0, green: 34.0 / 255.0, blue: 40.0 / 255.0).opacity(0.42))
                                            }
                                    }
                                    .overlay {
                                        Circle().strokeBorder(.white.opacity(0.22), lineWidth: 1)
                                    }
                                    .shadow(color: .black.opacity(0.28), radius: 16, x: 0, y: 6)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("打开控制中心")
                            .frame(width: 52, height: 52)
                            .padding(.trailing, 12)
                            .padding(.bottom, max(geometry.safeAreaInsets.bottom, 34) + 11)
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                            .transition(.scale.combined(with: .opacity))
                        }
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                if showingExpandedPlayer {
                    ZStack(alignment: .bottomLeading) {
                        Color.clear
                            .contentShape(Rectangle())
                            .ignoresSafeArea()
                            .onTapGesture {
                                withAnimation(.spring(response: 0.36, dampingFraction: 0.86)) {
                                    showingExpandedPlayer = false
                                }
                            }

                        NativeExpandedPlayerCard(
                            player: player,
                            appearance: appearance,
                            isPresented: $showingExpandedPlayer,
                            width: min(max(geometry.size.width - 24, 180), min(geometry.size.height * 0.30 + 28, 340)),
                            onEditCover: { openCoverSettings() }
                        )
                        .padding(.leading, 12)
                        .padding(.bottom, max(geometry.safeAreaInsets.bottom, 34) + 80)
                        .transition(.move(edge: .bottom).combined(with: .opacity).combined(with: .scale(scale: 0.96, anchor: .bottomLeading)))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                    .zIndex(4)
                }

                if showingControlCenter {
                    NativeControlCenterView(
                        player: player,
                        appearance: appearance,
                        onOpenMusic: { openControlDestination(.music) },
                        onOpenVisualizer: { openControlDestination(.visualizer) },
                        onOpenBackground: { openControlDestination(.background) },
                        onOpenTuning: { openControlDestination(.tuning) },
                        onOpenText: { openControlDestination(.textDisplay) },
                        onClose: {
                            withAnimation(.spring(response: 0.36, dampingFraction: 0.86)) {
                                showingControlCenter = false
                            }
                        }
                    )
                    .frame(
                        width: min(geometry.size.width * 0.76, 340),
                        height: min(geometry.size.height * 0.62, 500)
                    )
                    .padding(.trailing, 12)
                    .padding(.bottom, max(geometry.safeAreaInsets.bottom, 34) + 92)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                    .transition(.offset(y: 26).combined(with: .scale(scale: 0.90, anchor: .bottomTrailing)).combined(with: .opacity))
                    .zIndex(2)
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
            .background(Color.black.ignoresSafeArea())
            .animation(.spring(response: 0.36, dampingFraction: 0.86), value: showingControlCenter)
            .simultaneousGesture(TapGesture().onEnded { registerUIActivity() })
        }
        .ignoresSafeArea()
        .tint(Color(red: 0.56, green: 0.68, blue: 0.93))
        .environmentObject(presentation)
        .onAppear {
            updateIdleTimer()
            scheduleAutoHide()
        }
        .onChange(of: keepScreenAwake) { _, _ in updateIdleTimer() }
        .onChange(of: scenePhase) { _, _ in updateIdleTimer() }
        .onChange(of: player.isPlaying) { _, _ in scheduleAutoHide() }
        .onChange(of: autoHideDelay) { _, _ in scheduleAutoHide() }
        .onDisappear {
            autoHideTask?.cancel()
            UIApplication.shared.isIdleTimerDisabled = false
        }
    }

    private func updateIdleTimer() {
        UIApplication.shared.isIdleTimerDisabled = keepScreenAwake && scenePhase == .active
    }

    private func registerUIActivity() {
        if isMiniPlayerHiddenByTimer {
            withAnimation(.spring(response: 0.34, dampingFraction: 0.84)) {
                isMiniPlayerHiddenByTimer = false
            }
        }
        scheduleAutoHide()
    }

    private func scheduleAutoHide() {
        autoHideTask?.cancel()
        guard player.isPlaying, autoHideDelay > 0, !presentation.hideMiniPlayer else {
            isMiniPlayerHiddenByTimer = false
            return
        }
        autoHideTask = Task { @MainActor in
            do {
                try await Task.sleep(nanoseconds: UInt64(autoHideDelay) * 1_000_000_000)
            } catch {
                return
            }
            guard !Task.isCancelled else { return }
            withAnimation(.easeOut(duration: 0.35)) {
                isMiniPlayerHiddenByTimer = true
                showingControlCenter = false
                showingExpandedPlayer = false
            }
        }
    }

    private func miniPlayerWidth(for geometry: GeometryProxy) -> CGFloat {
        let collapsed = min(max(geometry.size.width - 24, 180), min(geometry.size.height * 0.30 + 28, 340))
        let expanded = min(max(geometry.size.width - 24, 180), 380)
        return isMiniExpanded ? expanded : collapsed
    }

    private func toggleControlCenterPanel() {
        withAnimation(.spring(response: 0.36, dampingFraction: 0.86)) {
            showingExpandedPlayer = false
            isMiniExpanded = false
            showingControlCenter.toggle()
        }
    }

    private func openControlCenterPanel() {
        withAnimation(.spring(response: 0.36, dampingFraction: 0.86)) {
            showingExpandedPlayer = false
            isMiniExpanded = false
            showingControlCenter = true
        }
    }

    private func openExpandedPlayerCard() {
        withAnimation(.spring(response: 0.36, dampingFraction: 0.86)) {
            showingControlCenter = false
            isMiniExpanded = false
            showingExpandedPlayer = true
        }
    }

    private func openCoverSettings() {
        withAnimation(.spring(response: 0.36, dampingFraction: 0.86)) {
            showingExpandedPlayer = false
        }
        DispatchQueue.main.async {
            path.append(.background)
        }
    }

    private func openControlDestination(_ route: NativeRoute) {
        withAnimation(.spring(response: 0.36, dampingFraction: 0.86)) {
            showingControlCenter = false
            showingExpandedPlayer = false
            isMiniExpanded = false
        }
        DispatchQueue.main.async {
            path.append(route)
        }
    }
}

private struct NativeMiniSettingsGlyph: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 5.5, style: .continuous)
                .strokeBorder(.white, lineWidth: 1.8)
                .frame(width: 24, height: 13)

            HStack(spacing: 4) {
                Image(systemName: "play.fill")
                    .font(.system(size: 7, weight: .bold))
                Capsule()
                    .fill(.white)
                    .frame(width: 5, height: 1.5)
            }
            .foregroundStyle(.white)
        }
        .frame(width: 24, height: 24)
        .accessibilityHidden(true)
    }
}

private enum NativeRoute: Hashable {
    case categories
    case music
    case visualizer
    case tuning
    case textDisplay
    case background
    case typography
    case system
    case backup
    case developer
    case feature(FeatureCategory)
}
