import SwiftUI

@main
struct YiuFMApp: App {
    var body: some Scene {
        WindowGroup {
            YiuRootView()
                .ignoresSafeArea()
                .statusBarHidden(true)
                .preferredColorScheme(.dark)
        }
    }
}
