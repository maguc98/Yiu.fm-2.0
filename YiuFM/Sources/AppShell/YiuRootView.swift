import SwiftUI

/// App entry point for the native SwiftUI experience.
/// The legacy WKWebView host is deliberately not used by this navigation tree.
struct YiuRootView: View {
    @State private var path: [NativeRoute] = []
    @StateObject private var player = YiuAudioPlayer()

    var body: some View {
        NavigationStack(path: $path) {
            NativeHomeView(
                player: player,
                openMusic: { path.append(.music) },
                openCategories: { path.append(.categories) }
            )
            .navigationDestination(for: NativeRoute.self) { route in
                switch route {
                case .categories:
                    NativeFeatureCategoriesView(
                        onSelect: { category in
                            if category.title == "音乐与播放" {
                                path.append(.music)
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
    case feature(FeatureCategory)
}
