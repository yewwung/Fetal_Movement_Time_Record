import Foundation
import SwiftUI
import UIKit

struct HomeView: View {
    @EnvironmentObject private var store: DiaryStore
    @State private var now = Date()

    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ScreenContainer(title: "胎动记录", note: now.diaryFullDate) {
            VStack(alignment: .leading, spacing: 22) {
                ViewThatFits(in: .horizontal) {
                    HStack(alignment: .top, spacing: 16) {
                        introCopy
                        Spacer(minLength: 0)
                        pregnancySummary
                    }
                    VStack(alignment: .leading, spacing: 12) {
                        introCopy
                        pregnancySummary
                    }
                }

                VStack(spacing: 16) {
                    Picker("时钟模式", selection: Binding(get: { store.settings.clockMode }, set: store.setClockMode)) {
                        ForEach(ClockMode.allCases) { mode in
                            Text(mode.title).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)

                    if store.settings.clockMode == .digital {
                        HStack(alignment: .lastTextBaseline, spacing: 6) {
                            Text(now.diaryTimeWithoutSeconds)
                                .font(.system(size: 66, weight: .semibold, design: .monospaced))
                                .foregroundStyle(Color.ink)
                                .minimumScaleFactor(0.7)
                            Text(String(now.diaryTime.suffix(2)))
                                .font(.title3.monospacedDigit())
                                .foregroundStyle(Color.coral)
                        }
                        .frame(maxWidth: .infinity)
                    } else {
                        AnalogClockView(date: now)
                            .frame(maxWidth: 260)
                            .frame(maxWidth: .infinity)
                    }

                    Button {
                        store.addMovement()
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "plus")
                                .font(.title3.weight(.bold))
                            Text("记录一次胎动")
                                .font(.headline)
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.coral, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)

                    HStack {
                        Text("今天已记录")
                            .foregroundStyle(Color.slate)
                        Spacer()
                        Text("\(store.todayRecords.count) 次")
                            .font(.title3.weight(.bold).monospacedDigit())
                            .foregroundStyle(Color.coral)
                    }
                    .font(.subheadline)
                }
                .padding(18)
                .background(Color.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 16, style: .continuous))

                VStack(alignment: .leading, spacing: 12) {
                    SectionHeading("Today", "今日节奏", note: "每两小时")
                    WaveChart(records: store.todayRecords)
                    HStack {
                        Text("00:00")
                        Spacer()
                        Text("12:00")
                        Spacer()
                        Text("24:00")
                    }
                    .font(.caption2)
                    .foregroundStyle(Color.slate)
                }

                VStack(alignment: .leading, spacing: 12) {
                    SectionHeading("Recent", "最近记录", note: "\(store.todayRecords.count) 次")
                    if store.todayRecords.isEmpty {
                        Text("记录后会在这里显示今天的时间。")
                            .font(.subheadline)
                            .foregroundStyle(Color.slate)
                            .padding(.vertical, 8)
                    } else {
                        ForEach(store.todayRecords.prefix(3)) { record in
                            HStack(spacing: 12) {
                                Circle().fill(Color.coral).frame(width: 9, height: 9)
                                Text(record.timestamp.diaryTime)
                                    .font(.body.monospacedDigit())
                                    .foregroundStyle(Color.ink)
                                Spacer()
                                Text("胎动")
                                    .font(.caption)
                                    .foregroundStyle(Color.slate)
                            }
                            .padding(.vertical, 7)
                        }
                    }
                }
            }
        }
        .onReceive(timer) { value in now = value }
    }

    private var introCopy: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("今天，记录每一次安心")
                .font(.title2.weight(.bold))
                .foregroundStyle(Color.ink)
            Text("轻触按钮，留下当前胎动时间。")
                .font(.subheadline)
                .foregroundStyle(Color.slate)
        }
    }

    @ViewBuilder
    private var pregnancySummary: some View {
        if let pregnancy = store.pregnancyInfo {
            VStack(alignment: .trailing, spacing: 2) {
                Text("孕周")
                    .font(.caption)
                    .foregroundStyle(Color.slate)
                Text("\(pregnancy.weeks)+\(pregnancy.days)")
                    .font(.title2.weight(.bold).monospacedDigit())
                    .foregroundStyle(Color.coral)
                Text("预产期 \(pregnancy.dueDate.diaryMonthDay)")
                    .font(.caption2)
                    .foregroundStyle(Color.slate)
            }
        }
    }
}
