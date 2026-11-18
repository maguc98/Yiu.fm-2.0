import Foundation

struct YiuLyricLine: Identifiable, Hashable {
    let id: Int
    let time: Double
    let text: String
    let wordTimes: [Double]?
}

struct YiuParsedLyrics {
    let lines: [YiuLyricLine]
    let metadata: [String: String]
}

enum YiuLRCParser {
    private static let timePattern = try! NSRegularExpression(
        pattern: #"\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]"#
    )
    private static let metadataPattern = try! NSRegularExpression(
        pattern: #"^\[(ti|ar|al|by|offset):(.*)\]\s*$"#,
        options: [.caseInsensitive]
    )

    static func parse(_ source: String) -> YiuParsedLyrics {
        let text = source.replacingOccurrences(of: "\u{FEFF}", with: "")
        let nsText = text as NSString
        let rawLines = text.components(separatedBy: .newlines)
        var metadata: [String: String] = [:]
        var parsed: [(time: Double, text: String, words: [Double]?)] = []

        for rawLine in rawLines {
            let line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
            if line.isEmpty { continue }

            let fullRange = NSRange(line.startIndex..<line.endIndex, in: line)
            if let meta = metadataPattern.firstMatch(in: line, range: fullRange),
               let keyRange = Range(meta.range(at: 1), in: line),
               let valueRange = Range(meta.range(at: 2), in: line) {
                metadata[String(line[keyRange]).lowercased()] = String(line[valueRange]).trimmingCharacters(in: .whitespaces)
                continue
            }

            let lineNSString = line as NSString
            let range = NSRange(location: 0, length: lineNSString.length)
            let matches = timePattern.matches(in: line, range: range)
            guard !matches.isEmpty else { continue }

            struct Segment {
                let time: Double
                let text: String
                let tagRange: NSRange
            }

            var segments: [Segment] = []
            for (index, match) in matches.enumerated() {
                guard match.numberOfRanges >= 4,
                      let minuteRange = Range(match.range(at: 1), in: line),
                      let secondRange = Range(match.range(at: 2), in: line) else { continue }

                let minutes = Double(line[minuteRange]) ?? 0
                let seconds = Double(line[secondRange]) ?? 0
                var fraction = 0.0
                if let fractionRange = Range(match.range(at: 3), in: line) {
                    fraction = Double("0." + line[fractionRange]) ?? 0
                }
                let nextStart = index + 1 < matches.count ? matches[index + 1].range.location : lineNSString.length
                let contentStart = NSMaxRange(match.range)
                let contentLength = max(0, nextStart - contentStart)
                let content = lineNSString.substring(with: NSRange(location: contentStart, length: contentLength))
                segments.append(Segment(
                    time: minutes * 60 + seconds + fraction,
                    text: content,
                    tagRange: match.range
                ))
            }

            guard !segments.isEmpty else { continue }
            let filled = segments.filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }.count

            if filled <= 1 {
                var plain = line
                for segment in segments.reversed() {
                    if let stringRange = Range(segment.tagRange, in: plain) {
                        plain.removeSubrange(stringRange)
                    }
                }
                plain = plain.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !plain.isEmpty else { continue }
                for segment in segments {
                    parsed.append((segment.time, plain, nil))
                }
            } else {
                var characters: [Character] = []
                var wordTimes: [Double] = []
                for segment in segments {
                    for character in segment.text {
                        characters.append(character)
                        wordTimes.append(segment.time)
                    }
                }
                while let first = characters.first, first.isWhitespace {
                    characters.removeFirst()
                    wordTimes.removeFirst()
                }
                while let last = characters.last, last.isWhitespace {
                    characters.removeLast()
                    wordTimes.removeLast()
                }
                guard !characters.isEmpty else { continue }
                parsed.append((segments[0].time, String(characters), wordTimes))
            }
        }

        parsed.sort { $0.time < $1.time }
        let lines = parsed.enumerated().map { index, item in
            YiuLyricLine(id: index, time: item.time, text: item.text, wordTimes: item.words)
        }
        return YiuParsedLyrics(lines: lines, metadata: metadata)
    }
}

