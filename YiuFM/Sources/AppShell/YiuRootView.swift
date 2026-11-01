import SwiftUI

/// Yiu.fm 2.0 的视觉层：完整加载旧版本地 Web UI，先恢复用户熟悉的界面。
/// 后续原生音频核心通过独立、版本化桥接接入，不在本阶段改写旧视觉代码。
struct YiuRootView: View {
    var body: some View {
        LegacyVisualStage()
            .background(Color.black)
            .ignoresSafeArea()
    }
}
