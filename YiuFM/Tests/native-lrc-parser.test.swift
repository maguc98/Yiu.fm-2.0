import Foundation

@main
enum NativeLRCTests {
    static func main() {
        testMetadataAndMultipleTimestamps()
        testEnhancedWordTiming()
        testSortsChronologically()
        print("Native LRC parser: 3 tests passed")
    }

    private static func testMetadataAndMultipleTimestamps() {
        let source = """
        [ti:示例歌曲]
        [ar:示例歌手]
        [al:专辑]
        [offset:-120]
        [00:01.20]第一句
        [00:02.50][00:03.00]重复歌词
        """
        let parsed = YiuLRCParser.parse(source)
        precondition(parsed.metadata["ti"] == "示例歌曲")
        precondition(parsed.metadata["ar"] == "示例歌手")
        precondition(parsed.metadata["al"] == "专辑")
        precondition(parsed.metadata["offset"] == "-120")
        precondition(parsed.lines.count == 3)
        precondition(parsed.lines[0].text == "第一句")
        precondition(abs(parsed.lines[0].time - 1.2) < 0.0001)
        precondition(parsed.lines[1].text == "重复歌词")
        precondition(abs(parsed.lines[1].time - 2.5) < 0.0001)
        precondition(abs(parsed.lines[2].time - 3.0) < 0.0001)
    }

    private static func testEnhancedWordTiming() {
        let parsed = YiuLRCParser.parse("[00:01.00]你[00:01.50]好")
        precondition(parsed.lines.count == 1)
        precondition(parsed.lines[0].text == "你好")
        precondition(parsed.lines[0].wordTimes?.count == 2)
        precondition(abs((parsed.lines[0].wordTimes?[0] ?? 0) - 1.0) < 0.0001)
        precondition(abs((parsed.lines[0].wordTimes?[1] ?? 0) - 1.5) < 0.0001)
    }

    private static func testSortsChronologically() {
        let parsed = YiuLRCParser.parse("[00:08.00]后一句\n[00:02.00]前一句")
        precondition(parsed.lines.map(\.text) == ["前一句", "后一句"])
        precondition(parsed.lines.map(\.id) == [0, 1])
    }
}
