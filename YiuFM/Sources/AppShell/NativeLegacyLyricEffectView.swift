import SwiftUI

/// Applies the selected legacy lyric motion to the currently displayed lyric line.
struct NativeLegacyLyricEffectView: View {
    let text: String
    let animation: NativeTextAnimation
    let color: Color
    let fontSize: CGFloat
    let fontWeight: Font.Weight
    let fontDesign: Font.Design
    let currentTime: Double
    let audioLevel: Double

    @State private var entrance: Double = 0

    private var horizontalOffset: CGFloat {
        switch animation {
        case .pan:
            return CGFloat((1 - entrance) * 34)
        case .scatter:
            return CGFloat(sin(Double(text.count) * 0.73) * (1 - entrance) * 18)
        case .glitch:
            return CGFloat(sin(currentTime * 74) * 5)
        default:
            return 0
        }
    }

    private var verticalOffset: CGFloat {
        switch animation {
        case .bounce:
            return CGFloat((1 - entrance) * 30)
        case .scatter:
            return CGFloat(cos(Double(text.count) * 0.61) * (1 - entrance) * 16)
        case .star:
            return CGFloat(sin(entrance * .pi) * -12)
        default:
            return 0
        }
    }

    private var scale: CGFloat {
        switch animation {
        case .scatter:
            return CGFloat(0.92 + 0.08 * entrance)
        case .bounce:
            return CGFloat(0.78 + 0.22 * min(1, entrance * 1.8))
        case .poster:
            return 1.04
        default:
            return 1
        }
    }

    private var opacity: Double {
        switch animation {
        case .fade:
            return 0.12 + entrance * 0.88
        case .glitch:
            return currentTime.truncatingRemainder(dividingBy: 1.7) < 0.055 ? 0.56 : 1
        default:
            return 1
        }
    }

    private var rotation: Double {
        switch animation {
        case .wave:
            return sin(currentTime * 2.4) * 1.2
        case .glitch:
            return sin(currentTime * 21) * 0.35
        default:
            return 0
        }
    }

    var body: some View {
        Text(text.isEmpty ? " " : text)
            .font(.system(size: fontSize, weight: fontWeight, design: fontDesign))
            .foregroundStyle(color)
            .multilineTextAlignment(.center)
            .lineSpacing(8)
            .opacity(opacity)
            .scaleEffect(scale)
            .offset(x: horizontalOffset, y: verticalOffset)
            .blur(radius: animation == .focus ? CGFloat((1 - entrance) * 8) : 0)
            .rotation3DEffect(
                .degrees(animation == .flip ? (1 - entrance) * 76 : 0),
                axis: (x: 1, y: 0, z: 0)
            )
            .rotationEffect(.degrees(rotation))
            .shadow(
                color: animation == .star ? color.opacity(0.58) : color.opacity(0.14),
                radius: animation == .star ? 16 + CGFloat(audioLevel * 9) : (animation == .focus ? 8 : 4),
                x: 0,
                y: 3
            )
            .mask(alignment: .leading) {
                GeometryReader { geometry in
                    Rectangle()
                        .frame(width: animation == .type ? geometry.size.width * max(0.02, entrance) : geometry.size.width)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .overlay {
                if animation == .poster {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(color.opacity(0.26), lineWidth: 1)
                        .padding(.horizontal, -10)
                        .padding(.vertical, -8)
                        .allowsHitTesting(false)
                }
            }
            .onAppear(perform: animateEntrance)
            .onChange(of: text) { _, _ in animateEntrance() }
            .onChange(of: animation) { _, _ in animateEntrance() }
    }

    private func animateEntrance() {
        entrance = 0
        withAnimation(.spring(response: animation == .bounce ? 0.72 : 0.56, dampingFraction: animation == .bounce ? 0.62 : 0.84)) {
            entrance = 1
        }
    }
}
