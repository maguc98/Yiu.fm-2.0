import SwiftUI

struct NativeTextDisplayView: View {
    @ObservedObject var store: NativeTextDeckStore
    @AppStorage("yiufm.native.typography.family") private var familyID = NativeFontFamily.serif.rawValue
    @AppStorage("yiufm.native.typography.scale") private var globalScale = 1.0
    @AppStorage("yiufm.native.typography.weight") private var globalWeight = 0.78
    @AppStorage("yiufm.native.typography.color") private var globalColorHex = "#FFFFFF"
    @AppStorage("yiufm.native.system.targetFPS") private var targetFPS = 30
    @AppStorage("yiufm.native.system.animationSpeed") private var animationSpeed = 1.0
    @AppStorage("yiufm.native.system.reduceMotion") private var reduceMotion = false

    @State private var isPlaying = true
    @State private var startDate = Date()
    @State private var accumulatedTime: Double = 0
    @State private var shuffleOrder: [String] = []

    private var family: NativeFontFamily {
        NativeFontFamily(rawValue: familyID) ?? .serif
    }
    private var fontWeight: Font.Weight {
        switch globalWeight {
        case ..<0.48: return .medium
        case ..<0.62: return .semibold
        case ..<0.78: return .bold
        case ..<0.91: return .heavy
        default: return .black
        }
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.05, green: 0.08, blue: 0.14),
                        Color(red: 0.10, green: 0.13, blue: 0.22),
                        Color(red: 0.16, green: 0.10, blue: 0.20)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                TimelineView(.animation(minimumInterval: 1.0 / Double(max(15, min(60, targetFPS))), paused: !isPlaying || reduceMotion)) { timeline in
                    let elapsed = elapsedTime(at: timeline.date)
                    let frame = currentFrame(at: elapsed)

                    ZStack {
                        if let frame {
                            textCard(frame: frame, elapsed: elapsed, size: geometry.size)
                                .id(frame.card.id)
                                .transition(.opacity.combined(with: .scale(scale: 0.97)))
                                .padding(.horizontal, 28)
                        } else {
                            VStack(spacing: 12) {
                                Image(systemName: "text.quote")
                                    .font(.system(size: 38, weight: .light))
                                Text("添加一些文字")
                                    .font(.system(size: 19, weight: .semibold))
                                Text("返回编辑页面添加逐句卡片")
                                    .font(.system(size: 12))
                                    .foregroundStyle(.white.opacity(0.62))
                            }
                            .foregroundStyle(.white)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }

                VStack {
                    HStack {
                        Text(store.activePackage?.name ?? "文字显示器")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.55))
                        Spacer()
                        Button {
                            togglePlayback()
                        } label: {
                            Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 42, height: 42)
                                .background(.white.opacity(0.14), in: Circle())
                        }
                        .accessibilityLabel(isPlaying ? "暂停播放" : "继续播放")
                    }
                    Spacer()
                    HStack(spacing: 22) {
                        Button {
                            restart()
                        } label: {
                            Image(systemName: "backward.end.fill")
                        }
                        Button {
                            togglePlayback()
                        } label: {
                            Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 20, weight: .bold))
                                .frame(width: 58, height: 58)
                                .background(.white.opacity(0.16), in: Circle())
                        }
                        Button {
                            advanceToNextCard()
                        } label: {
                            Image(systemName: "forward.end.fill")
                        }
                    }
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.bottom, 26)
                }
                .padding(.horizontal, 22)
                .padding(.top, 18)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            refreshShuffleOrder()
            startDate = Date()
            isPlaying = true
        }
        .onChange(of: store.activePackageID) { _, _ in
            refreshShuffleOrder()
            restart()
        }
        .onChange(of: store.cards.map(\.id)) { _, _ in
            refreshShuffleOrder()
        }
        .onChange(of: store.activePackage?.shuffle ?? false) { _, _ in
            refreshShuffleOrder()
            restart()
        }
        .onDisappear {
            isPlaying = false
        }
    }

    private var playbackCards: [NativeTextCard] {
        let usable = store.cards.filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        guard store.activePackage?.shuffle == true else { return usable }
        let lookup = Dictionary(uniqueKeysWithValues: usable.map { ($0.id, $0) })
        let ordered = shuffleOrder.compactMap { lookup[$0] }
        return ordered.count == usable.count ? ordered : usable
    }

    private func refreshShuffleOrder() {
        let ids = store.cards
            .filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            .map(\.id)
        if store.activePackage?.shuffle == true {
            shuffleOrder = ids.shuffled()
        } else {
            shuffleOrder = ids
        }
    }

    private func elapsedTime(at date: Date) -> Double {
        accumulatedTime + (isPlaying ? max(0, date.timeIntervalSince(startDate)) * animationSpeed : 0)
    }

    private func currentFrame(at elapsed: Double) -> (card: NativeTextCard, progress: Double, start: Double)? {
        let usable = playbackCards
        guard !usable.isEmpty else { return nil }

        let total = usable.reduce(0.0) { $0 + max(0.5, $1.duration) }
        guard total > 0 else { return nil }
        let position = elapsed.truncatingRemainder(dividingBy: total)
        var start = 0.0
        for card in usable {
            let duration = max(0.5, card.duration)
            let end = start + duration
            if position < end {
                return (card, min(1, max(0, (position - start) / duration)), start)
            }
            start = end
        }
        let last = usable[usable.count - 1]
        return (last, 1, max(0, total - last.duration))
    }

    @ViewBuilder
    private func textCard(frame: (card: NativeTextCard, progress: Double, start: Double), elapsed: Double, size: CGSize) -> some View {
        let card = frame.card
        let progress = frame.progress
        let text = visibleText(for: card, progress: progress)
        let color = Color(nativeHex: card.colorHex ?? globalColorHex)
        let fontSize = CGFloat(card.fontSize * globalScale)

        Text(text.isEmpty ? " " : text)
            .font(.system(size: fontSize, weight: fontWeight, design: family.design))
            .foregroundStyle(color)
            .multilineTextAlignment(.center)
            .lineSpacing(card.animation == .poster ? 12 : 5)
            .opacity(opacity(for: card.animation, progress: progress))
            .scaleEffect(scale(for: card.animation, progress: progress))
            .offset(x: horizontalOffset(for: card.animation, progress: progress, width: size.width))
            .offset(y: verticalOffset(for: card.animation, progress: progress))
            .blur(radius: blurRadius(for: card.animation, progress: progress))
            .rotation3DEffect(
                .degrees(card.animation == .flip ? (1 - progress) * 76 : 0),
                axis: (x: 1, y: 0, z: 0)
            )
            .rotationEffect(.degrees(rotation(for: card.animation, elapsed: elapsed)))
            .shadow(color: color.opacity(card.animation == .star ? 0.55 : 0.14), radius: card.animation == .star ? 18 : 7, x: 0, y: 3)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .animation(reduceMotion ? nil : .easeInOut(duration: 0.18), value: progress)
    }

    private func visibleText(for card: NativeTextCard, progress: Double) -> String {
        guard card.animation == .type else { return card.text }
        let characters = Array(card.text)
        let count = min(characters.count, max(0, Int(Double(characters.count) * progress)))
        return String(characters.prefix(count))
    }

    private func opacity(for mode: NativeTextAnimation, progress: Double) -> Double {
        switch mode {
        case .fade: return 0.12 + progress * 0.88
        case .glitch: return progress < 0.04 ? 0.45 : 1
        default: return 1
        }
    }

    private func scale(for mode: NativeTextAnimation, progress: Double) -> CGFloat {
        switch mode {
        case .bounce: return CGFloat(0.78 + 0.22 * min(1, progress * 1.8))
        case .scatter: return CGFloat(0.92 + 0.08 * progress)
        case .poster: return CGFloat(1.04)
        default: return 1
        }
    }

    private func horizontalOffset(for mode: NativeTextAnimation, progress: Double, width: CGFloat) -> CGFloat {
        switch mode {
        case .pan: return CGFloat((1 - progress) * 0.32) * width
        case .glitch: return CGFloat(sin(progress * 74) * (1 - progress) * 7)
        case .scatter: return CGFloat(sin(progress * 18) * (1 - progress) * 18)
        default: return 0
        }
    }

    private func verticalOffset(for mode: NativeTextAnimation, progress: Double) -> CGFloat {
        switch mode {
        case .bounce: return CGFloat((1 - progress) * 35)
        case .scatter: return CGFloat(cos(progress * 14) * (1 - progress) * 20)
        case .star: return CGFloat(sin(progress * .pi) * -14)
        default: return 0
        }
    }

    private func blurRadius(for mode: NativeTextAnimation, progress: Double) -> CGFloat {
        switch mode {
        case .focus: return CGFloat((1 - progress) * 8)
        default: return 0
        }
    }

    private func rotation(for mode: NativeTextAnimation, elapsed: Double) -> Double {
        switch mode {
        case .wave: return sin(elapsed * 2.4) * 1.2
        case .glitch: return sin(elapsed * 21) * 0.35
        default: return 0
        }
    }

    private func togglePlayback() {
        if isPlaying {
            accumulatedTime = elapsedTime(at: Date())
            isPlaying = false
        } else {
            startDate = Date()
            isPlaying = true
        }
    }

    private func restart() {
        accumulatedTime = 0
        startDate = Date()
        isPlaying = true
    }

    private func advanceToNextCard() {
        let elapsed = elapsedTime(at: Date())
        guard let current = currentFrame(at: elapsed) else { restart(); return }
        let usable = playbackCards
        guard !usable.isEmpty else { restart(); return }
        let index = usable.firstIndex(where: { $0.id == current.card.id }) ?? 0
        let nextIndex = (index + 1) % usable.count
        let elapsedBefore = usable.prefix(nextIndex).reduce(0.0) { $0 + max(0.5, $1.duration) }
        accumulatedTime = elapsedBefore
        startDate = Date()
        isPlaying = true
    }
}
