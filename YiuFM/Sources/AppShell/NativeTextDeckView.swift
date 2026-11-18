import SwiftUI

struct NativeTextDeckView: View {
    @ObservedObject var store: NativeTextDeckStore
    @State private var showingNewPackage = false
    @State private var newPackageName = ""
    @State private var renamePackageName = ""
    @State private var showingRenamePackage = false
    @State private var showingDeletePackage = false

    var body: some View {
        List {
            Section {
                if store.packages.count > 1 {
                    Picker("文件包", selection: Binding(
                        get: { store.activePackageID ?? "" },
                        set: { store.selectPackage($0) }
                    )) {
                        ForEach(store.packages) { package in
                            Text(package.name).tag(package.id)
                        }
                    }
                }

                HStack {
                    Label("逐句卡片", systemImage: "text.alignleft")
                    Spacer()
                    Text("\(store.cards.count) 句")
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }

                Toggle("随机播放", isOn: Binding(
                    get: { store.activePackage?.shuffle ?? false },
                    set: { store.setShuffle($0) }
                ))
                .tint(Color(red: 0.42, green: 0.60, blue: 0.72))
            } header: {
                Text("文字内容")
            }

            Section {
                ForEach(Array(store.cards.enumerated()), id: \.element.id) { index, card in
                    NativeTextCardEditor(card: card, index: index, store: store)
                        .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
                }
                .onMove(perform: store.moveCards)
                .onDelete { offsets in
                    for index in offsets.sorted(by: >) {
                        if store.cards.indices.contains(index) {
                            store.removeCard(store.cards[index].id)
                        }
                    }
                }
            } header: {
                HStack {
                    Text("卡片编辑")
                    Spacer()
                    EditButton()
                }
            } footer: {
                Text("每张卡片可以单独设置字号、颜色、停留时间和动画。留空的卡片不会参与播放。")
            }

            Section {
                Button {
                    store.addCard()
                } label: {
                    Label("添加一句", systemImage: "plus.circle.fill")
                }

                Button {
                    newPackageName = ""
                    showingNewPackage = true
                } label: {
                    Label("新建文件包", systemImage: "folder.badge.plus")
                }


                Button {
                    renamePackageName = store.activePackage?.name ?? ""
                    showingRenamePackage = true
                } label: {
                    Label("重命名当前文件包", systemImage: "pencil")
                }

                Button(role: .destructive) {
                    showingDeletePackage = true
                } label: {
                    Label("删除当前文件包", systemImage: "trash")
                }
                NavigationLink {
                    NativeTypographySettingsView(textDeck: store)
                } label: {
                    Label("全局字体与排版", systemImage: "textformat")
                }
            } header: {
                Text("管理")
            }

            Section {
                NavigationLink {
                    NativeTextDisplayView(store: store)
                        .toolbar(.hidden, for: .tabBar)
                } label: {
                    HStack {
                        Label("打开文字显示器", systemImage: "play.rectangle.fill")
                            .font(.system(size: 15, weight: .semibold))
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 5)
                }
            } footer: {
                Text("文字显示器采用原生 SwiftUI 舞台，不依赖网页渲染。")
            }
        }
        .navigationTitle("文字内容")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                EditButton()
            }
        }
        .alert("新建文件包", isPresented: $showingNewPackage) {
            TextField("文件包名称", text: $newPackageName)
            Button("创建") { store.addPackage(named: newPackageName) }
            Button("取消", role: .cancel) {}
        } message: {
            Text("新的文件包会单独保存自己的文字卡片。")
        }
        .alert("重命名文件包", isPresented: $showingRenamePackage) {
            TextField("文件包名称", text: $renamePackageName)
            Button("保存") { store.renameActivePackage(renamePackageName) }
            Button("取消", role: .cancel) {}
        }
        .confirmationDialog("删除当前文件包？", isPresented: $showingDeletePackage, titleVisibility: .visible) {
            Button("删除文件包", role: .destructive) {
                store.removeActivePackage()
            }
            Button("取消", role: .cancel) {}
        } message: {
            Text("删除只影响这个文件包，不会删除你的音乐曲库。")
        }
    }
}

private struct NativeTextCardEditor: View {
    let card: NativeTextCard
    let index: Int
    @ObservedObject var store: NativeTextDeckStore

    @AppStorage("yiufm.native.typography.family") private var familyID = NativeFontFamily.serif.rawValue
    @AppStorage("yiufm.native.typography.scale") private var globalScale = 1.0
    @AppStorage("yiufm.native.typography.weight") private var globalWeight = 0.78
    @AppStorage("yiufm.native.typography.color") private var globalColorHex = "#FFFFFF"

    private var family: NativeFontFamily {
        NativeFontFamily(rawValue: familyID) ?? .serif
    }
    private var color: Color {
        Color(nativeHex: card.colorHex ?? globalColorHex)
    }
    private var weight: Font.Weight {
        switch globalWeight {
        case ..<0.48: return .medium
        case ..<0.62: return .semibold
        case ..<0.78: return .bold
        case ..<0.91: return .heavy
        default: return .black
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("第 \(index + 1) 句")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)
                Spacer()
                Text(String(format: "%.1fs", card.duration))
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.tertiary)
                Button(role: .destructive) {
                    store.removeCard(card.id)
                } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 12, weight: .semibold))
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("删除第 \(index + 1) 句")
            }

            TextEditor(text: Binding(
                get: { store.cards.first(where: { $0.id == card.id })?.text ?? "" },
                set: { value in store.updateCard(card.id) { $0.text = value } }
            ))
            .font(.system(size: CGFloat(min(28, card.fontSize * 0.55)), weight: weight, design: family.design))
            .foregroundStyle(color)
            .scrollContentBackground(.hidden)
            .frame(minHeight: 66, maxHeight: 110)
            .padding(8)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

            HStack {
                Text("字号")
                    .font(.system(size: 11, weight: .medium))
                Spacer()
                Text("\(Int(card.fontSize))")
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
            Slider(value: binding(\.fontSize), in: 14...80, step: 1)
                .tint(Color(red: 0.42, green: 0.57, blue: 0.78))

            HStack(spacing: 10) {
                Picker("动画", selection: binding(\.animation)) {
                    ForEach(NativeTextAnimation.allCases) { animation in
                        Text(animation.title).tag(animation)
                    }
                }
                .labelsHidden()
                .pickerStyle(.menu)

                Spacer()

                ColorPicker(
                    "颜色",
                    selection: Binding(
                        get: { color },
                        set: { newColor in store.updateCard(card.id) { $0.colorHex = newColor.nativeHex } }
                    ),
                    supportsOpacity: false
                )
                .labelsHidden()

                Button("跟随") {
                    store.updateCard(card.id) { $0.colorHex = nil }
                }
                .font(.system(size: 10, weight: .semibold))
                .buttonStyle(.bordered)
            }

            HStack {
                Text("停留时间")
                    .font(.system(size: 11, weight: .medium))
                Spacer()
                Text(String(format: "%.1fs", card.duration))
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
            Slider(value: binding(\.duration), in: 0.5...20, step: 0.1)
                .tint(Color(red: 0.42, green: 0.57, blue: 0.78))
        }
    }

    private func binding<Value>(_ keyPath: WritableKeyPath<NativeTextCard, Value>) -> Binding<Value> {
        Binding(
            get: { store.cards.first(where: { $0.id == card.id })?[keyPath: keyPath] ?? card[keyPath: keyPath] },
            set: { value in store.updateCard(card.id) { $0[keyPath: keyPath] = value } }
        )
    }
}
