import SwiftUI

struct NativeControlCenterView: View {
    @ObservedObject var player: YiuAudioPlayer
    @ObservedObject var appearance: NativeAppearanceStore

    let onOpenMusic: () -> Void
    let onOpenVisualizer: () -> Void
    let onOpenBackground: () -> Void
    let onOpenSystem: () -> Void
    let onOpenText: () -> Void

    @Environment(\.dismiss) private var dismiss
    @AppStorage("yiufm.native.visual.engine") private var engineID = NativeVisualEngine.sonnet.rawValue
    @State private var showingOtherActions = false

    private var engine: NativeVisualEngine {
        NativeVisualEngine(rawValue: engineID) ?? .sonnet
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.96, green: 0.97, blue: 0.99),
                    Color(red: 0.92, green: 0.94, blue: 0.98),
                    Color(red: 0.95, green: 0.92, blue: 0.97)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 12) {
                    header
                    engineCard
                    shortcuts
                    resolutionCard
                    otherButton

                    if showingOtherActions {
                        otherActions
                            .transition(.move(edge: .top).combined(with: .opacity))
                    }
                }
                .padding(.horizontal, 17)
                .padding(.top, 14)
                .padding(.bottom, 26)
            }
        }
        .environment(\.colorScheme, .light)
        .presentationBackground(.ultraThinMaterial)
        .animation(.spring(response: 0.34, dampingFraction: 0.88), value: showingOtherActions)
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 3) {
                Text("控制中心")
                    .font(.system(size: 23, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(red: 0.14, green: 0.17, blue: 0.23))
                Text("YIU.FM")
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .tracking(2.0)
                    .foregroundStyle(Color(red: 0.43, green: 0.47, blue: 0.55))
            }

            Spacer()

            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color(red: 0.24, green: 0.28, blue: 0.36))
                    .frame(width: 30, height: 30)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("关闭控制中心")
        }
        .padding(.bottom, 1)
    }

    private var engineCard: some View {
        Button(action: onOpenVisualizer) {
            VStack(alignment: .leading, spacing: 9) {
                HStack {
                    Text("当前视觉引擎")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color(red: 0.39, green: 0.43, blue: 0.51))
                    Spacer()
                    HStack(spacing: 5) {
                        Circle()
                            .fill(Color(red: 0.25, green: 0.68, blue: 0.49))
                            .frame(width: 6, height: 6)
                        Text(player.isPlaying ? "运行中" : "已就绪")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(Color(red: 0.20, green: 0.56, blue: 0.40))
                    }
                    .padding(.horizontal, 9)
                    .padding(.vertical, 5)
                    .background(Color(red: 0.88, green: 0.96, blue: 0.91), in: Capsule())
                }

                HStack(alignment: .lastTextBaseline, spacing: 9) {
                    Text(engine.rawValue.uppercased())
                        .font(.system(size: 27, weight: .bold, design: .rounded))
                        .tracking(1.2)
                        .foregroundStyle(Color(red: 0.16, green: 0.20, blue: 0.29))
                    Text(engine.title)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color(red: 0.42, green: 0.47, blue: 0.57))
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .strokeBorder(.white.opacity(0.9), lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.045), radius: 14, x: 0, y: 6)
        }
        .buttonStyle(.plain)
    }

    private var shortcuts: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("快捷操作")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Color(red: 0.23, green: 0.27, blue: 0.35))

            HStack(spacing: 9) {
                shortcutCard(title: "视觉效果", symbol: "sparkles", subtitle: "切换视觉引擎", action: onOpenVisualizer)
                shortcutCard(title: "显示模式", symbol: "rectangle.on.rectangle", subtitle: "文字与音乐显示", action: onOpenText)
            }
        }
    }

    private func shortcutCard(
        title: String,
        symbol: String,
        subtitle: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: symbol)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color(red: 0.39, green: 0.50, blue: 0.72))
                    .frame(width: 36, height: 36)
                    .background(Color.white.opacity(0.78), in: RoundedRectangle(cornerRadius: 12, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(red: 0.19, green: 0.23, blue: 0.31))
                    Text(subtitle)
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(Color(red: 0.49, green: 0.53, blue: 0.60))
                        .lineLimit(1)
                }

                Spacer(minLength: 0)
            }
            .padding(10)
            .frame(maxWidth: .infinity, minHeight: 58)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(.white.opacity(0.88), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }

    private var resolutionCard: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack {
                Text("渲染分辨率")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Color(red: 0.27, green: 0.31, blue: 0.39))
                Spacer()
                Text("100%")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Color(red: 0.27, green: 0.39, blue: 0.62))
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color(red: 0.80, green: 0.84, blue: 0.90).opacity(0.68))
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.37, green: 0.53, blue: 0.78),
                                    Color(red: 0.59, green: 0.55, blue: 0.78)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geometry.size.width * 0.5)
                }
            }
            .frame(height: 7)

            Text("由系统原生画布按设备分辨率输出")
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(Color(red: 0.51, green: 0.55, blue: 0.62))
        }
        .padding(.horizontal, 13)
        .padding(.vertical, 11)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(.white.opacity(0.86), lineWidth: 1)
        }
    }

    private var otherButton: some View {
        Button {
            showingOtherActions.toggle()
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "square.grid.2x2")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color(red: 0.43, green: 0.50, blue: 0.67))
                Text("其他")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(red: 0.26, green: 0.30, blue: 0.38))
                Spacer()
                Image(systemName: showingOtherActions ? "chevron.up" : "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 13)
            .frame(height: 43)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(.white.opacity(0.86), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }

    private var otherActions: some View {
        HStack(spacing: 9) {
            smallAction("音乐", symbol: "music.note", action: onOpenMusic)
            smallAction("背景", symbol: "photo", action: onOpenBackground)
            smallAction("系统", symbol: "slider.horizontal.3", action: onOpenSystem)
        }
    }

    private func smallAction(_ title: String, symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 7) {
                Image(systemName: symbol)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color(red: 0.42, green: 0.51, blue: 0.70))
                Text(title)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Color(red: 0.28, green: 0.32, blue: 0.40))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 62)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .strokeBorder(.white.opacity(0.86), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }
}
