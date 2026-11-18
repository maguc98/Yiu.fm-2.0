import SwiftUI

/// App entry point for the native SwiftUI experience.
/// The legacy WKWebView host is deliberately not used by this navigation tree.
struct YiuRootView: View {
    @State private var path: [NativeRoute] = []
    @StateObject private var player = YiuAudioPlayer()
    @StateObject private var appearance = NativeAppearanceStore()

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
                            } else {
                                path.append(.feature(category))
                            }
                        },
                        onClose: {
                            if !path.isEmpty { path.removeLast() }
                        }
                    )
                case .music:
                    NativeMusicView(player: player)
                case .visualizer:
                    NativeVisualizerView(player: player)
                case .background:
                    NativeBackgroundSettingsView(appearance: appearance)
                case .typography:
                    NativeTypographySettingsView()
                case .feature(let category):
                    NativeFeatureDetailView(category: category)
                }
            }
        }
        .tint(Color(red: 0.38, green: 0.51, blue: 0.71))
        .preferredColorScheme(.light)
    }
}

private enum NativeRoute: Hashable {
    case categories
    case music
    case visualizer
    case background
    case typography
    case feature(FeatureCategory)
}
