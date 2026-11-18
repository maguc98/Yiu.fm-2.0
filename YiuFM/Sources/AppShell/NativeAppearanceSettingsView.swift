import SwiftUI
import UniformTypeIdentifiers

struct NativeBackgroundSettingsView: View {
    @ObservedObject var appearance: NativeAppearanceStore
    @State private var showingImporter = false
    @State private var showingCoverImporter = false
    @State private var importError: String?
    @State private var showingError = false

    private var imageType: UTType { UTType.image }

    var body: some View {
        Form {
            Section {
                Picker("背景类型", selection: $appearance.backgroundMode) {
                    ForEach(NativeBackgroundMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
            } header: {
                Text("背景")
            }

            Section("内置主题") {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(NativeBackgroundTheme.presets) { theme in
                            Button {
                                appearance.applyTheme(theme)
                            } label: {
                                VStack(spacing: 7) {
                                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                                        .fill(
                                            LinearGradient(
                                                colors: theme.colors.map { Color(nativeHex: $0) },
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 76, height: 52)
                                        .overlay {
                                            RoundedRectangle(cornerRadius: 13, style: .continuous)
                                                .strokeBorder(.white.opacity(0.82), lineWidth: 1)
                                        }
                                    Text(theme.name)
                                        .font(.system(size: 10, weight: .semibold))
                                        .foregroundStyle(.primary)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
            }

            switch appearance.backgroundMode {
            case .solid:
                Section("纯色") {
                    colorPicker("背景颜色", hex: $appearance.solidColorHex)
                }
            case .gradient:
                Section("渐变颜色") {
                    colorPicker("颜色 1", hex: $appearance.gradientStartHex)
                    colorPicker("颜色 2", hex: $appearance.gradientMid1Hex)
                    colorPicker("颜色 3", hex: $appearance.gradientMid2Hex)
                    colorPicker("颜色 4", hex: $appearance.gradientEndHex)
                    Toggle("渐变流动", isOn: $appearance.gradientFlowEnabled)
                        .tint(Color(red: 0.42, green: 0.60, blue: 0.72))
                    HStack {
                        Text("渐变角度")
                        Spacer()
                        Text("\(Int(appearance.gradientAngle))°")
                            .monospacedDigit()
                            .foregroundStyle(.secondary)
                    }
                    Slider(value: $appearance.gradientAngle, in: 0...360, step: 5)
                        .tint(Color(red: 0.42, green: 0.57, blue: 0.78))
                }
            case .image:
                Section("背景图片") {
                    if let image = appearance.backgroundImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(maxWidth: .infinity)
                            .frame(height: 170)
                            .clipped()
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    } else {
                        ContentUnavailableView("还没有背景图片", systemImage: "photo", description: Text("从“文件”中导入图片作为背景。"))
                    }

                    Button {
                        showingImporter = true
                    } label: {
                        Label("选择背景图片", systemImage: "photo.badge.plus")
                    }

                    if appearance.backgroundImage != nil {
                        Button(role: .destructive) {
                            appearance.removeBackground()
                        } label: {
                            Label("移除背景图片", systemImage: "trash")
                        }
                    }
                }

                Section("图片效果") {
                    HStack {
                        Text("模糊")
                        Spacer()
                        Text("\(Int(appearance.backgroundBlur))")
                            .monospacedDigit()
                            .foregroundStyle(.secondary)
                    }
                    Slider(value: $appearance.backgroundBlur, in: 0...36, step: 1)
                        .tint(Color(red: 0.42, green: 0.57, blue: 0.78))
                }
            }

            Section("封面") {
                if let cover = appearance.coverImage {
                    Image(uiImage: cover)
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity)
                        .frame(height: 150)
                        .clipped()
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                } else {
                    Label("使用默认音乐封面", systemImage: "music.note")
                        .foregroundStyle(.secondary)
                }

                Button {
                    showingCoverImporter = true
                } label: {
                    Label("导入自定义封面", systemImage: "photo.badge.plus")
                }

                if appearance.coverImage != nil {
                    Button(role: .destructive) {
                        appearance.removeCover()
                    } label: {
                        Label("恢复默认封面", systemImage: "arrow.uturn.backward")
                    }
                }
            }

            Section("画面") {
                HStack {
                    Text("暗色遮罩")
                    Spacer()
                    Text("\(Int(appearance.backgroundDim * 100))%")
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
                Slider(value: $appearance.backgroundDim, in: 0...0.72, step: 0.02)
                    .tint(Color(red: 0.42, green: 0.57, blue: 0.78))
            }

            Section {
                Button("恢复默认背景", role: .destructive) {
                    appearance.reset()
                }
            } footer: {
                Text("背景图片保存在应用的本地文件目录中；颜色、渐变、模糊和遮罩设置会自动保存。")
            }
        }
        .navigationTitle("背景与封面")
        .navigationBarTitleDisplayMode(.inline)
        .fileImporter(
            isPresented: $showingImporter,
            allowedContentTypes: [imageType],
            allowsMultipleSelection: false
        ) { result in
            do {
                guard let url = try result.get().first else { return }
                try appearance.importBackground(from: url)
            } catch {
                importError = error.localizedDescription
                showingError = true
            }
        }
        .fileImporter(
            isPresented: $showingCoverImporter,
            allowedContentTypes: [imageType],
            allowsMultipleSelection: false
        ) { result in
            do {
                guard let url = try result.get().first else { return }
                try appearance.importCover(from: url)
            } catch {
                importError = error.localizedDescription
                showingError = true
            }
        }
        .alert("无法导入背景", isPresented: $showingError) {
            Button("好", role: .cancel) {}
        } message: {
            Text(importError ?? "导入失败")
        }
    }

    private func colorPicker(_ title: String, hex: Binding<String>) -> some View {
        ColorPicker(
            title,
            selection: Binding(
                get: { Color(nativeHex: hex.wrappedValue) },
                set: { hex.wrappedValue = $0.nativeHex }
            ),
            supportsOpacity: false
        )
    }
}

struct NativeTypographySettingsView: View {
    @ObservedObject var textDeck: NativeTextDeckStore
    @ObservedObject var appearance: NativeAppearanceStore
    @AppStorage("yiufm.native.typography.family") private var familyID = NativeFontFamily.serif.rawValue
    @AppStorage("yiufm.native.typography.scale") private var fontScale = 1.0
    @AppStorage("yiufm.native.typography.weight") private var fontWeightValue = 0.78
    @AppStorage("yiufm.native.typography.color") private var textColorHex = "#FFFFFF"

    private var family: NativeFontFamily {
        NativeFontFamily(rawValue: familyID) ?? .serif
    }

    private var weight: Font.Weight {
        switch fontWeightValue {
        case ..<0.48: return .medium
        case ..<0.62: return .semibold
        case ..<0.78: return .bold
        case ..<0.91: return .heavy
        default: return .black
        }
    }

    var body: some View {
        Form {
            Section("字体") {
                Picker("字体风格", selection: $familyID) {
                    ForEach(NativeFontFamily.allCases) { item in
                        Text(item.title).tag(item.rawValue)
                    }
                }

                HStack {
                    Text("字号")
                    Spacer()
                    Text("\(Int(fontScale * 100))%")
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
                Slider(value: $fontScale, in: 0.75...1.55, step: 0.05)
                    .tint(Color(red: 0.42, green: 0.57, blue: 0.78))

                HStack {
                    Text("字重")
                    Spacer()
                    Text("\(Int(fontWeightValue * 100))")
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
                Slider(value: $fontWeightValue, in: 0.4...1, step: 0.05)
                    .tint(Color(red: 0.42, green: 0.57, blue: 0.78))
            }

            Section("颜色") {
                ColorPicker(
                    "歌词颜色",
                    selection: Binding(
                        get: { Color(nativeHex: textColorHex) },
                        set: { textColorHex = $0.nativeHex }
                    ),
                    supportsOpacity: false
                )
            }

            Section("文字内容") {
                NavigationLink {
                    NativeTextDeckView(store: textDeck, appearance: appearance)
                } label: {
                    Label("逐句卡片与文字显示器", systemImage: "text.alignleft")
                }
                Text("编辑文字卡片、文件包、每句动画和停留时间，并打开原生文字显示舞台。")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            Section("预览") {
                VStack(spacing: 10) {
                    Text("让音乐，成为画面。")
                        .font(.system(size: CGFloat(26 * fontScale), weight: weight, design: family.design))
                        .foregroundStyle(Color(nativeHex: textColorHex))
                        .multilineTextAlignment(.center)
                    Text("The moment becomes a memory.")
                        .font(.system(size: CGFloat(14 * fontScale), weight: .medium, design: family.design))
                        .foregroundStyle(Color(nativeHex: textColorHex).opacity(0.65))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 22)
                .background(
                    LinearGradient(
                        colors: [Color(red: 0.20, green: 0.27, blue: 0.40), Color(red: 0.35, green: 0.28, blue: 0.43)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    in: RoundedRectangle(cornerRadius: 18, style: .continuous)
                )
                .listRowInsets(EdgeInsets(top: 12, leading: 12, bottom: 12, trailing: 12))
            }

            Section {
                Button("恢复默认排版", role: .destructive) {
                    familyID = NativeFontFamily.serif.rawValue
                    fontScale = 1
                    fontWeightValue = 0.78
                    textColorHex = "#FFFFFF"
                }
            } footer: {
                Text("这些偏好由原生 SwiftUI 字体系统渲染，并保存在本机。")
            }
        }
        .navigationTitle("文字与排版")
        .navigationBarTitleDisplayMode(.inline)
    }
}
