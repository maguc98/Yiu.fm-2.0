import SwiftUI

struct NativeTextDisplayView: View {
    @ObservedObject var store: NativeTextDeckStore
    @EnvironmentObject private var presentation: NativePresentationState
    @ObservedObject var appearance: NativeAppearanceStore
    @AppStorage("yiufm.native.typography.family") private var familyID = NativeFontFamily.serif.rawValue
    @AppStorage("yiufm.native.typography.scale") private var globalScale = 1.0
    @AppStorage("yiufm.native.typography.weight") private var globalWeight = 0.78
    @AppStorage("yiufm.native.typography.color") private var globalColorHex = "#FFFFFF"
    @AppStorage("yiufm.native.typography.alignment") private var horizontalAlignment = "center"
    @AppStorage("yiufm.native.typography.position") private var verticalPosition = "center"
    @AppStorage("yiufm.native.typography.wrap") private var wrapMode = "fill"
    @AppStorage("yiufm.native.typography.padding") private var sidePadding = 22.0
    @AppStorage("yiufm.native.typography.lineSpacing") private var lineSpacingMultiplier = 1.35
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
    private var textAlignment: TextAlignment {
        switch horizontalAlignment {
        case "left": return .leading
        case "right": return .trailing
        default: return .center
        }
    }

    private var contentAlignment: Alignment {
        let horizontal: HorizontalAlignment
        switch horizontalAlignment {
        case "left": horizontal = .leading
        case "right": horizontal = .trailing
        default: horizontal = .center
        }
        switch verticalPosition {
        case "top":
            return Alignment(horizontal: horizontal, vertical: .top)
        case "bottom":
            return Alignment(horizontal: horizontal, vertical: .bottom)
        default:
            return Alignment(horizontal: horizontal, vertical: .center)
        }
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
                NativeAppBackground(appearance: appearance)
                Color.black.opacity(0.28).ignoresSafeArea()

                TimelineView(.animation(minimumInterval: 1.0 / Double(max(15, min(60, targetFPS))), paused: !isPlaying)) { timeline in
                    let elapsed = elapsedTime(at: timeline.date)
                    let frame = currentFrame(at: elapsed)

                    ZStack {
                        if let frame {
                            textCard(frame: frame, elapsed: elapsed, size: geometry.size)
                                .id(frame.card.id)
                                .transition(.opacity.combined(with: .scale(scale: 0.97)))
                                .animation(reduceMotion ? nil : .easeInOut(duration: 0.3), value: frame.card.id)
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
            presentation.hideMiniPlayer = true
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
            presentation.hideMiniPlayer = false
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
        let animation = card.animation == .follow ? store.defaultAnimation : card.animation
        let progress = frame.progress
        let animationProgress = reduceMotion ? 1.0 : progress
        let sourceText = visibleText(for: card, progress: animationProgress)
        let text = layoutText(sourceText, mode: wrapMode, availableWidth: max(120, Double(size.width) - sidePadding * 2), fontSize: Double(card.fontSize * globalScale))
        let color = Color(nativeHex: card.colorHex ?? globalColorHex)
        let fontSize = CGFloat(card.fontSize * globalScale)
        let spacing = CGFloat(max(0, lineSpacingMultiplier - 1) * 20 + (animation == .poster ? 5 : 0))

        Text(text.isEmpty ? " " : text)
            .font(.system(size: fontSize, weight: fontWeight, design: family.design))
            .foregroundStyle(color)
            .multilineTextAlignment(textAlignment)
            .lineSpacing(spacing)
            .opacity(opacity(for: animation, progress: animationProgress))
            .scaleEffect(scale(for: animation, progress: animationProgress))
            .offset(x: horizontalOffset(for: animation, progress: animationProgress, width: size.width))
            .offset(y: verticalOffset(for: animation, progress: animationProgress))
            .blur(radius: blurRadius(for: animation, progress: animationProgress))
            .rotation3DEffect(
                .degrees(animation == .flip ? (1 - animationProgress) * 76 : 0),
                axis: (x: 1, y: 0, z: 0)
            )
            .rotationEffect(.degrees(reduceMotion ? 0 : rotation(for: animation, elapsed: elapsed)))
            .shadow(color: color.opacity(animation == .star ? 0.55 : 0.14), radius: animation == .star ? 18 : 7, x: 0, y: 3)
            .padding(.horizontal, CGFloat(sidePadding))
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: contentAlignment)
    }

    private func layoutText(_ text: String, mode: String, availableWidth: Double, fontSize: Double) -> String {
        guard mode != "word", fontSize > 0, availableWidth > 0 else { return text }
        if mode == "fill" {
            return text.split(separator: "\n", omittingEmptySubsequences: false)
                .map { paragraph in String(paragraph).map { String($0) }.joined(separator: "\u{200B}") }
                .joined(separator: "\n")
        }
        guard mode == "balance" else { return text }

        return text.split(separator: "\n", omittingEmptySubsequences: false)
            .map { paragraph in
                let tokens = balancedTokens(String(paragraph))
                guard tokens.count > 1 else { return String(paragraph) }
                let totalWidth = tokens.reduce(0.0) { $0 + $1.width(fontSize: fontSize) }
                let lineCount = max(1, Int(ceil(totalWidth / availableWidth)))
                let targetWidth = totalWidth / Double(lineCount)
                var lines: [String] = []
                var current = ""
                var currentWidth = 0.0
                var remainingWidth = totalWidth
                var remainingLines = lineCount

                for token in tokens {
                    let tokenWidth = token.width(fontSize: fontSize)
                    let shouldBreak = !current.isEmpty &&
                        remainingLines > 1 &&
                        currentWidth + tokenWidth > targetWidth &&
                        abs((remainingWidth - currentWidth) - targetWidth * Double(remainingLines - 1)) < abs(remainingWidth - currentWidth - targetWidth * Double(remainingLines))
                    if shouldBreak {
                        lines.append(current)
                        remainingWidth -= currentWidth
                        remainingLines -= 1
                        current = ""
                        currentWidth = 0
                    }
                    current += token.text
                    currentWidth += tokenWidth
                }
                if !current.isEmpty { lines.append(current) }
                return lines.joined(separator: "\n")
            }
            .joined(separator: "\n")
    }

    private func balancedTokens(_ text: String) -> [NativeTextToken] {
        var tokens: [NativeTextToken] = []
        var word = ""
        func flushWord() {
            guard !word.isEmpty else { return }
            tokens.append(NativeTextToken(text: word, isWide: false))
            word = ""
        }
        for character in text {
            let scalar = character.unicodeScalars.first?.value ?? 0
            let isWide = (0x2E80...0x9FFF).contains(scalar) || (0xF900...0xFAFF).contains(scalar) || (0xFF01...0xFF60).contains(scalar)
            if character.isWhitespace {
                flushWord()
                tokens.append(NativeTextToken(text: String(character), isWide: false))
            } else if isWide {
                flushWord()
                tokens.append(NativeTextToken(text: String(character), isWide: true))
            } else {
                word.append(character)
            }
        }
        flushWord()
        return tokens
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

private struct NativeTextToken {
    let text: String
    let isWide: Bool

    func width(fontSize: Double) -> Double {
        if isWide { return fontSize }
        if text.trimmingCharacters(in: .whitespaces).isEmpty { return fontSize * 0.28 }
        return Double(text.count) * fontSize * 0.54
    }
}
