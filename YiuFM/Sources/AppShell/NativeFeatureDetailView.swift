import SwiftUI

struct NativeFeatureDetailView: View {
    let category: FeatureCategory

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.94, green: 0.96, blue: 0.99), Color(red: 0.97, green: 0.94, blue: 0.98)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 18) {
                Image(systemName: category.symbol)
                    .font(.system(size: 34, weight: .medium))
                    .foregroundStyle(category.tint)
                    .frame(width: 84, height: 84)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 26, style: .continuous)
                            .strokeBorder(.white.opacity(0.85), lineWidth: 1)
                    }

                Text(category.title)
                    .font(.system(size: 23, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(red: 0.17, green: 0.21, blue: 0.29))

                Text("原生界面迁移中")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(red: 0.43, green: 0.54, blue: 0.70))
                    .padding(.horizontal, 13)
                    .padding(.vertical, 7)
                    .background(.white.opacity(0.72), in: Capsule())

                Text("这个分类已纳入原生导航。原有功能逻辑尚未全部迁移完成，当前不会显示无法使用的假按钮。")
                    .font(.system(size: 14))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 18)

                Spacer(minLength: 0)
            }
            .padding(.horizontal, 28)
            .padding(.top, 52)
        }
        .navigationTitle(category.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
