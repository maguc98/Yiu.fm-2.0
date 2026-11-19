import SwiftUI

struct NativeHomeView: View {
    @ObservedObject var player: YiuAudioPlayer
    @ObservedObject var appearance: NativeAppearanceStore
    let openMusic: () -> Void
    let openVisualizer: () -> Void
    let openText: () -> Void
    let openCategories: () -> Void
    let openControlCenter: () -> Void

    @AppStorage("yiufm.native.visual.engine") private var engineID = NativeVisualEngine.sonnet.rawValue
    @AppStorage("yiufm.native.visual.intensity") private var intensity = 0.85
    @AppStorage("yiufm.native.visual.audioReactive") private var audioReactive = true
    @AppStorage("yiufm.native.system.targetFPS") private var targetFPS = 30
    @AppStorage("yiufm.native.system.animationSpeed") private var animationSpeed = 1.0
    @AppStorage("yiufm.native.system.reduceMotion") private var reduceMotion = false
    @AppStorage("yiufm.native.visual.motionStrength") private var motionStrength = 1.0
    @AppStorage("yiufm.native.visual.cameraIntensity") private var cameraIntensity = 1.0
    @AppStorage("yiufm.native.visual.graphicDensity") private var graphicDensity = 0.55
    @AppStorage("yiufm.native.visual.lyricsFontScale") private var lyricsFontScale = 1.0
    @AppStorage("yiufm.native.visual.edgeDispersion") private var edgeDispersion = 0.8
    @AppStorage("yiufm.native.visual.edgeBand") private var edgeBand = 0.7
    @AppStorage("yiufm.native.visual.rgbEdgeIntensity") private var rgbEdgeIntensity = 0.7
    @AppStorage("yiufm.native.visual.rgbEdgeWidth") private var rgbEdgeWidth = 14.0
    @AppStorage("yiufm.native.visual.rgbEdgeRate") private var rgbEdgeRate = 1.0
    @AppStorage("yiufm.native.visual.primaryColor") private var primaryColorHex = "#FFFFFF"
    @AppStorage("yiufm.native.visual.secondaryColor") private var secondaryColorHex = "#AFC5FF"
    @AppStorage("yiufm.native.visual.accentColor") private var accentColorHex = "#8FB0FF"
    @AppStorage("yiufm.native.visual.backgroundColor") private var backgroundColorHex = "#08080C"
    @AppStorage("yiufm.native.visual.showGuide") private var showGuide = false
    @AppStorage("yiufm.native.visual.postProcessEnabled") private var postProcessEnabled = true
    @AppStorage("yiufm.native.visual.showBackgroundMG") private var showBackgroundMG = true
    @AppStorage("yiufm.native.visual.showFixedGeometry") private var showFixedGeometry = true
    @AppStorage("yiufm.native.visual.showBackgroundDecor") private var showBackgroundDecor = true
    @AppStorage("yiufm.native.visual.showGiantText") private var showGiantText = false
    @AppStorage("yiufm.native.visual.showOnlyText") private var showOnlyText = false
    @AppStorage("yiufm.native.visual.enableTransitions") private var enableTransitions = true
    @AppStorage("yiufm.native.visual.interludeDots") private var interludeDots = true
    @AppStorage("yiufm.native.visual.rgbEdge") private var rgbEdge = false
    @AppStorage("yiufm.native.typography.family") private var fontFamilyID = NativeFontFamily.serif.rawValue
    @AppStorage("yiufm.native.typography.scale") private var typographyScale = 1.0
    @AppStorage("yiufm.native.typography.weight") private var fontWeightValue = 0.78
    @AppStorage("yiufm.native.typography.color") private var textColorHex = "#FFFFFF"

    private var engine: NativeVisualEngine {
        NativeVisualEngine(rawValue: engineID) ?? .sonnet
    }

    private var fontFamily: NativeFontFamily {
        NativeFontFamily(rawValue: fontFamilyID) ?? .serif
    }

    private var fontWeight: Font.Weight {
        switch fontWeightValue {
        case ..<0.48: return .medium
        case ..<0.62: return .semibold
        case ..<0.78: return .bold
        case ..<0.91: return .heavy
        default: return .black
        }
    }

    var body: some View {
        GeometryReader { geometry in
            let stageSide = min(max(geometry.size.width - 24, 0), geometry.size.height * 0.62)

            ZStack {
                NativeAppBackground(appearance: appearance)
                    .ignoresSafeArea()

                Color.black.opacity(0.18)
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    lyricStage
                        .frame(width: stageSide, height: stageSide)
                    Spacer(minLength: 0)
                }
                .padding(.top, max(geometry.safeAreaInsets.top, 50) + 12)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .toolbar(.hidden, for: .navigationBar)
        .background(Color.black.ignoresSafeArea())
    }

    private var lyricStage: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.black)

            if !showOnlyText {
                NativeVisualBackdrop(
                    engine: engine,
                    audioLevel: player.audioLevel,
                    isPlaying: player.isPlaying,
                    intensity: intensity,
                    audioReactive: audioReactive,
                    targetFPS: targetFPS,
                    animationSpeed: animationSpeed,
                    reduceMotion: reduceMotion,
                    motionStrength: motionStrength,
                    cameraIntensity: cameraIntensity,
                    graphicDensity: graphicDensity,
                    primaryColor: Color(nativeHex: primaryColorHex),
                    secondaryColor: Color(nativeHex: secondaryColorHex),
                    accentColor: Color(nativeHex: accentColorHex),
                    backgroundColor: Color(nativeHex: backgroundColorHex),
                    showBackgroundMG: showBackgroundMG,
                    showFixedGeometry: showFixedGeometry,
                    showBackgroundDecor: showBackgroundDecor,
                    interludeDots: interludeDots
                )
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            }

            LinearGradient(
                stops: [
                    .init(color: .black.opacity(0.20), location: 0),
                    .init(color: .clear, location: 0.36),
                    .init(color: .clear, location: 0.68),
                    .init(color: .black.opacity(0.30), location: 1)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))

            if showGiantText {
                Text(engine.rawValue.uppercased())
                    .font(.system(size: 54, weight: .black, design: .rounded))
                    .tracking(3)
                    .foregroundStyle(Color(nativeHex: secondaryColorHex).opacity(0.07))
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                    .allowsHitTesting(false)
            }

            if showGuide {
                NativeVisualGuideOverlay()
            }

            lyricContent
                .padding(.horizontal, 22)
                .padding(.vertical, 24)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(.white.opacity(0.12), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.28), radius: 22, x: 0, y: 10)
        .clipped()
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder
    private var lyricContent: some View {
        VStack(spacing: 18) {
            if player.lyrics.isEmpty {
                VStack(spacing: 12) {
                    Text(player.currentTrack?.title ?? "让音乐，成为画面。")
                        .font(.system(size: 25, weight: .semibold, design: .serif))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                        .lineLimit(3)
                    Text(player.currentTrack.map { $0.artist.isEmpty ? "本地音乐" : $0.artist } ?? "让文字、光线与节奏在这里相遇")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.white.opacity(0.60))
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(spacing: 22) {
                    if player.currentLyricIndex > 0,
                       player.currentLyricIndex - 1 < player.lyrics.count {
                        Text(player.lyrics[player.currentLyricIndex - 1].text)
                            .font(.system(size: 13, weight: .medium, design: .serif))
                            .foregroundStyle(.white.opacity(0.32))
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                    }

                    if let lyric = player.currentLyric {
                        Text(lyric.text)
                            .font(.system(
                                size: CGFloat(29 * typographyScale),
                                weight: fontWeight,
                                design: fontFamily.design
                            ))
                            .tracking(engine == .sonnet ? 1.1 : 0.35)
                            .foregroundStyle(Color(nativeHex: textColorHex))
                            .multilineTextAlignment(.center)
                            .lineSpacing(8)
                            .shadow(color: .black.opacity(0.22), radius: 9, x: 0, y: 3)
                            .shadow(
                                color: postProcessEnabled ? Color(nativeHex: accentColorHex).opacity(min(0.65, edgeDispersion * 0.28)) : .clear,
                                radius: postProcessEnabled ? CGFloat(4 + edgeBand * 12) : 0
                            )
                            .shadow(
                                color: rgbEdge && postProcessEnabled ? Color(nativeHex: secondaryColorHex).opacity(rgbEdgeIntensity * (0.35 + 0.1 * sin(Date().timeIntervalSinceReferenceDate * rgbEdgeRate))) : .clear,
                                radius: rgbEdge && postProcessEnabled ? CGFloat(rgbEdgeWidth) * 0.35 : 0,
                                x: 1,
                                y: 0
                            )
                            .frame(maxWidth: .infinity)
                            .id(player.currentLyricIndex)
                            .transition(enableTransitions ? .opacity.combined(with: .scale(scale: 0.97)) : .identity)
                    } else {
                        Text(" ")
                            .frame(height: 52)
                    }

                    if player.currentLyricIndex + 1 < player.lyrics.count {
                        Text(player.lyrics[player.currentLyricIndex + 1].text)
                            .font(.system(size: 13, weight: .medium, design: .serif))
                            .foregroundStyle(.white.opacity(0.40))
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .animation(.easeInOut(duration: 0.32), value: player.currentLyricIndex)
            }
        }
    }
}
