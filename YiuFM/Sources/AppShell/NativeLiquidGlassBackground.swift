import SwiftUI

/// A shared native glass surface for floating controls.
struct NativeLiquidGlassBackground<S: InsettableShape>: View {
    let shape: S
    var tint: Color = .black
    var fallbackOpacity: Double = 0.42
    var shadowRadius: CGFloat = 18

    var body: some View {
        Group {
            if #available(iOS 26.0, *) {
                shape
                    .fill(.clear)
                    .glassEffect(.regular, in: shape)
                    .overlay {
                        shape.fill(
                            LinearGradient(
                                colors: [tint.opacity(0.08), tint.opacity(0.20)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    }
                    .overlay {
                        shape.strokeBorder(
                            LinearGradient(
                                colors: [.white.opacity(0.34), .white.opacity(0.08), .white.opacity(0.22)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                    }
            } else {
                shape
                    .fill(.ultraThinMaterial)
                    .overlay { shape.fill(tint.opacity(fallbackOpacity)) }
                    .overlay {
                        shape.strokeBorder(.white.opacity(0.22), lineWidth: 1)
                    }
            }
        }
        .shadow(color: .black.opacity(shadowRadius > 0 ? 0.16 : 0), radius: shadowRadius, x: 0, y: 5)
        .accessibilityHidden(true)
    }
}
