import SwiftUI

@MainActor
final class NativePresentationState: ObservableObject {
    @Published var hideMiniPlayer = false
}
