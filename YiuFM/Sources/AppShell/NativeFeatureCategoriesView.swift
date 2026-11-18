import SwiftUI

/// 原生功能分类页。此视图不依赖 WKWebView、HTML 或 CSS。
/// 迁移期间先独立落地并逐项接入原有功能；完成迁移前不替换现有主入口。
struct NativeFeatureCategoriesView: View {
    let onSelect: (FeatureCategory) -> Void
    let onClose: () -> Void

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    private let categories: [FeatureCategory] = [
        .init(title: "音乐与播放", subtitle: "音频、歌词与播放控制", symbol: "music.note", tint: Color(red: 0.42, green: 0.57, blue: 0.78)),
        .init(title: "文字与排版", subtitle: "文字内容、字体与布局", symbol: "textformat", tint: Color(red: 0.57, green: 0.49, blue: 0.76)),
        .init(title: "背景与封面", subtitle: "背景图片、封面与主题", symbol: "photo", tint: Color(red: 0.36, green: 0.64, blue: 0.59)),
        .init(title: "系统与性能", subtitle: "显示、动画与运行状态", symbol: "sun.max", tint: Color(red: 0.82, green: 0.60, blue: 0.38)),
        .init(title: "项目与备份", subtitle: "项目文件、导入与备份", symbol: "folder.badge.gearshape", tint: Color(red: 0.43, green: 0.59, blue: 0.76)),
        .init(title: "开发者工具", subtitle: "调试、诊断与高级选项", symbol: "chevron.left.forwardslash.chevron.right", tint: Color(red: 0.58, green: 0.55, blue: 0.70))
    ]

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.94, green: 0.96, blue: 0.99),
                    Color(red: 0.97, green: 0.94, blue: 0.98),
                    Color(red: 0.94, green: 0.97, blue: 0.96)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(categories) { category in
                        Button {
                            onSelect(category)
                        } label: {
                            FeatureCategoryCard(category: category)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 28)
            }
        }
        .safeAreaInset(edge: .top, spacing: 0) {
            header
        }
        .preferredColorScheme(.light)
    }

    private var header: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("其他")
                    .font(.system(size: 27, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(red: 0.16, green: 0.20, blue: 0.28))
                Text("功能分类")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 12)

            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color(red: 0.34, green: 0.40, blue: 0.50))
                    .frame(width: 42, height: 42)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 15, style: .continuous)
                            .strokeBorder(.white.opacity(0.75), lineWidth: 1)
                    }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("关闭功能分类")
        }
        .padding(.horizontal, 22)
        .padding(.top, 12)
        .padding(.bottom, 16)
        .background(.ultraThinMaterial)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(.white.opacity(0.7))
                .frame(height: 1)
        }
    }
}

private struct FeatureCategoryCard: View {
    let category: FeatureCategory

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack {
                Image(systemName: category.symbol)
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(category.tint)
                    .frame(width: 44, height: 44)
                    .background(category.tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                Spacer(minLength: 4)

                Image(systemName: "arrow.up.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.tertiary)
            }

            VStack(alignment: .leading, spacing: 5) {
                Text(category.title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color(red: 0.18, green: 0.22, blue: 0.30))
                    .lineLimit(1)
                    .minimumScaleFactor(0.82)

                Text(category.subtitle)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, minHeight: 142, alignment: .topLeading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(.white.opacity(0.82), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.045), radius: 14, x: 0, y: 6)
        .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

struct FeatureCategory: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let subtitle: String
    let symbol: String
    let tint: Color

    static func == (lhs: FeatureCategory, rhs: FeatureCategory) -> Bool {
        lhs.title == rhs.title
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(title)
    }
}
