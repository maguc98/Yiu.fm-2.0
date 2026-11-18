import SwiftUI
import UIKit

struct NativeLibraryView: View {
    @ObservedObject var player: YiuAudioPlayer
    @ObservedObject var appearance: NativeAppearanceStore
    @AppStorage("yiufm.native.system.haptics") private var hapticsEnabled = true

    var body: some View {
        List {
            if player.tracks.isEmpty {
                ContentUnavailableView(
                    "曲库还是空的",
                    systemImage: "music.note.list",
                    description: Text("返回音乐页，导入本地音频开始建立曲库。")
                )
                .listRowBackground(Color.clear)
            } else {
                Section {
                    ForEach(player.tracks) { track in
                        Button {
                            NativeHaptics.impact(enabled: hapticsEnabled)
                            player.selectTrack(track.id, autoplay: true)
                        } label: {
                            HStack(spacing: 12) {
                                Group {
                                    if let data = track.artworkData, let image = UIImage(data: data) {
                                        Image(uiImage: image)
                                            .resizable()
                                            .scaledToFill()
                                    } else {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                .fill(Color(red: 0.87, green: 0.91, blue: 0.97))
                                            Image(systemName: track.id == player.currentTrackID ? "waveform" : "music.note")
                                                .font(.system(size: 16, weight: .semibold))
                                                .foregroundStyle(Color(red: 0.38, green: 0.51, blue: 0.71))
                                        }
                                    }
                                }
                                .frame(width: 42, height: 42)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(track.title)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(track.id == player.currentTrackID ? Color(red: 0.34, green: 0.47, blue: 0.68) : Color.primary)
                                        .lineLimit(1)
                                    HStack(spacing: 6) {
                                        Text(track.artist.isEmpty ? track.sourceName : track.artist).lineLimit(1)
                                        if track.hasLyrics {
                                            Text("LRC")
                                                .font(.system(size: 9, weight: .bold))
                                                .foregroundStyle(Color(red: 0.35, green: 0.61, blue: 0.53))
                                        }
                                    }
                                    .font(.system(size: 10))
                                    .foregroundStyle(.secondary)
                                }
                                Spacer(minLength: 4)
                                Text(player.formattedTime(track.duration))
                                    .font(.system(size: 10, weight: .medium, design: .rounded))
                                    .monospacedDigit()
                                    .foregroundStyle(.tertiary)
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                player.removeTrack(track.id)
                            } label: {
                                Label("删除", systemImage: "trash")
                            }
                        }
                    }
                    .onMove(perform: player.moveTracks)
                    .onDelete { offsets in
                        for index in offsets.sorted(by: >) {
                            if player.tracks.indices.contains(index) {
                                player.removeTrack(player.tracks[index].id)
                            }
                        }
                    }
                } header: {
                    HStack {
                        Text("所有歌曲")
                        Spacer()
                        Text("\(player.tracks.count) 首")
                    }
                } footer: {
                    Text("点选歌曲立即播放。编辑模式下可以调整播放队列顺序。删除只会移除应用内部副本，不会删除“文件”App 中的原文件。")
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(NativeAppBackground(appearance: appearance))
        .navigationTitle("播放队列")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) { EditButton() }
        }
    }
}
