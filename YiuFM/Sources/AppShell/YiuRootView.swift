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

                if !presentation.hideMiniPlayer {
                    HStack(spacing: 10) {
                        NativeMiniPlayerBar(
                            player: player,
                            appearance: appearance,
                            onOpenPlayer: { path.append(.music) },
                            onOpenControlCenter: { showingControlCenter = true }
                        )
                        .frame(width: min(max(geometry.size.width - 98, 180), 340))

                        Button {
                            withAnimation(.spring(response: 0.36, dampingFraction: 0.86)) {
                                showingControlCenter.toggle()
                            }
                        } label: {
                            Image(systemName: showingControlCenter ? "xmark" : "slider.horizontal.3")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(width: 52, height: 52)
                                .background(.ultraThinMaterial, in: Circle())
                                .overlay {
                                    Circle().strokeBorder(.white.opacity(0.22), lineWidth: 1)
                                }
                                .shadow(color: .black.opacity(0.28), radius: 16, x: 0, y: 6)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(showingControlCenter ? "关闭控制中心" : "打开控制中心")
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, max(geometry.safeAreaInsets.bottom, 34) + 4)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                if showingControlCenter {
                    NativeControlCenterView(
                        player: player,
                        appearance: appearance,
                        onOpenMusic: { openControlDestination(.music) },
                        onOpenVisualizer: { openControlDestination(.visualizer) },
                        onOpenBackground: { openControlDestination(.background) },
                        onOpenSystem: { openControlDestination(.system) },
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
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .zIndex(2)
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
            .background(Color.black.ignoresSafeArea())
            .animation(.spring(response: 0.36, dampingFraction: 0.86), value: showingControlCenter)
        }
        .ignoresSafeArea()
        .tint(Color(red: 0.56, green: 0.68, blue: 0.93))
        .environmentObject(presentation)
    }

    private func openControlDestination(_ route: NativeRoute) {
        withAnimation(.spring(response: 0.36, dampingFraction: 0.86)) {
            showingControlCenter = false
        }
        DispatchQueue.main.async {
            path.append(route)
        }
    }
}

private enum NativeRoute: Hashable {
    case categories
    case music
    case visualizer
    case textDisplay
    case background
    case typography
    case system
    case backup
    case developer
    case feature(FeatureCategory)
}
