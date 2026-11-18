import Foundation

@main
enum NativeTextProjectCodecTests {
    static func main() throws {
        try testNativeRoundTrip()
        try testLegacyPackagesImport()
        try testLegacyLinesAndConfigImport()
        print("Native text project codec: 3 tests passed")
    }

    private static func testNativeRoundTrip() throws {
        let cards = [
            NativeTextCard(text: "原生文字", fontSize: 36, colorHex: "#AABBCC", duration: 3.5, animation: .type),
            NativeTextCard(text: "第二句", fontSize: 52, duration: 5, animation: .wave)
        ]
        let package = NativeTextPackage(name: "测试文件包", shuffle: true, cards: cards)
        let data = try NativeTextProjectCodec.encode(packages: [package], activePackageID: package.id)
        let decoded = try NativeTextProjectCodec.decode(data)
        precondition(decoded.packages.count == 1)
        precondition(decoded.packages[0].name == "测试文件包")
        precondition(decoded.packages[0].shuffle)
        precondition(decoded.packages[0].cards == cards)
        precondition(decoded.activePackageID == package.id)
    }

    private static func testLegacyPackagesImport() throws {
        let source = """
        {
          "app": "text-display",
          "v": 1,
          "ACTIVE_PKG": 0,
          "G": { "style": "scatter" },
          "PACKAGES": [
            {
              "name": "旧版文件包",
              "shuffle": true,
              "items": [
                { "t": "旧版第一句", "size": 34, "color": "#123456", "mode": "type", "dur": 2.5 },
                { "t": "旧版第二句", "size": 50, "dur": 5 }
              ]
            }
          ]
        }
        """
        let decoded = try NativeTextProjectCodec.decode(Data(source.utf8))
        precondition(decoded.packages.count == 1)
        let package = decoded.packages[0]
        precondition(package.name == "旧版文件包")
        precondition(package.shuffle)
        precondition(package.cards.count == 2)
        precondition(package.cards[0].text == "旧版第一句")
        precondition(package.cards[0].animation == .type)
        precondition(package.cards[0].colorHex == "#123456")
        precondition(package.cards[1].animation == .scatter)
        precondition(abs(package.cards[1].duration - 5) < 0.0001)
    }

    private static func testLegacyLinesAndConfigImport() throws {
        let source = """
        {
          "LN": ["一行文字", "第二行"],
          "CF": [
            { "size": 28, "color": "#FFFFFF", "mode": "fade", "dur": 1.5 },
            { "size": 44, "dur": 4 }
          ],
          "G": { "style": "poster" },
          "LY": { "a": "left", "v": "bottom", "w": "word" },
          "X": { "ui": { "lyPad": 34, "lyFw": 6, "lyLh": 155 } }
        }
        """
        let decoded = try NativeTextProjectCodec.decode(Data(source.utf8))
        precondition(decoded.packages.count == 1)
        let cards = decoded.packages[0].cards
        precondition(cards.count == 2)
        precondition(cards[0].animation == .fade)
        precondition(cards[0].fontSize == 28)
        precondition(abs(cards[0].duration - 1.5) < 0.0001)
        precondition(cards[1].animation == .poster)
        precondition(cards[1].fontSize == 44)
        precondition(decoded.layout?.horizontalAlignment == "left")
        precondition(decoded.layout?.verticalPosition == "bottom")
        precondition(decoded.layout?.wrapMode == "word")
        precondition(abs((decoded.layout?.sidePadding ?? 0) - 34) < 0.0001)
        precondition(abs((decoded.layout?.fontWeight ?? 0) - 0.6) < 0.0001)
        precondition(abs((decoded.layout?.lineSpacing ?? 0) - 1.55) < 0.0001)
    }
}
