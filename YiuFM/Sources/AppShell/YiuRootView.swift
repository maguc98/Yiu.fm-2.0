import SwiftUI

/// App entry point for the native SwiftUI experience.
/// The legacy WKWebView host is deliberately not used by this navigation tree.
struct YiuRootView: View {
    @State private var path: [NativeRoute] = []
    @State private var showingControlCenter = false
    @StateObject private var player = YiuAudioPlayer()
    @StateObject private var appearance = NativeAppearanceStore()
    @StateObject private var textDeck = NativeTextDeckStore()
    @StateObject private var presentation = NativePresentationState()

    var body: some View {
        NavigationStack(path: $path) {
            NativeHomeView(
                player: player,
                appearance: appearance,
                openMusic: { path.append(.music) },
                openVisualizer: { path.append(.visualizer) },
                openCategories: { path.append(.categories) }
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
        .tint(Color(red: 0.38, green: 0.51, blue: 0.71))
        .preferredColorScheme(.light)
        .environmentObject(presentation)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if !presentation.hideMiniPlayer {
                NativeMiniPlayerBar(
                    player: player,
                    appearance: appearance,
                    onOpenPlayer: { path.append(.music) },
                    onOpenControlCenter: { showingControlCenter = true }
                )
                .padding(.horizontal, 14)
                .padding(.top, 6)
                .padding(.bottom, 8)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .sheet(isPresented: $showingControlCenter) {
            NativeControlCenterView(
                player: player,
                appearance: appearance,
                onOpenMusic: { openControlDestination(.music) },
                onOpenVisualizer: { openControlDestination(.visualizer) },
                onOpenBackground: { openControlDestination(.background) },
                onOpenSystem: { openControlDestination(.system) },
                onOpenText: { openControlDestination(.typography) }
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
    }

    private func openControlDestination(_ route: NativeRoute) {
        showingControlCenter = false
        DispatchQueue.main.async {
            path.append(route)
        }
    }
}

private enum NativeRoute: Hashable {
    case categories
    case music
    case visualizer
    case background
    case typography
    case system
    case backup
    case developer
    case feature(FeatureCategory)
}
