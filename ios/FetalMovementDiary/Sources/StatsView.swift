import Foundation
import SwiftUI

struct StatsView: View {
    @EnvironmentObject private var store: DiaryStore

    private var daily: [DailyStat] { store.dailyStats() }
    private var hourly: [HourlyStat] { store.hourlyStats() }
    private var weeklyCount: Int { daily.reduce(0) { $0 + $1.count } }
    private var mostActive: HourlyStat? { hourly.max { $0.count < $1.count } }

    var body: some View {
        ScreenContainer(title: "统计", note: "近 7 天") {
            VStack(alignment: .leading, spacing: 22) {
                HStack(spacing: 12) {
                    MetricTile(value: "\(store.records.count)", label: "累计记录")
                    MetricTile(value: "\(weeklyCount)", label: "近 7 天", tint: .sage)
                }

                VStack(alignment: .leading, spacing: 14) {
                    SectionHeading("Trend", "每日记录", note: "最近 7 天")
                    SimpleBarChart(
                        values: daily.map(\.count),
                        labels: daily.map { Calendar.diary.component(.day, from: $0.date).description },
                        tint: .coral
                    )
                    HStack {
                        Text("日期")
                        Spacer()
                        Text("次数")
                    }
                    .font(.caption2)
                    .foregroundStyle(Color.slate)
                }
                .padding(16)
                .background(Color.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                VStack(alignment: .leading, spacing: 14) {
                    SectionHeading("Time of day", "活跃时段", note: "每 4 小时")
                    SimpleBarChart(
                        values: hourly.map(\.count),
                        labels: hourly.map { String(format: "%02d", $0.startHour) },
                        tint: .sage
                    )
                    if let mostActive {
                        HStack(spacing: 10) {
                            Image(systemName: "waveform.path.ecg")
                                .foregroundStyle(Color.coral)
                            Text(mostActive.count == 0
                                 ? "记录后会显示活跃时段"
                                 : "最活跃时段 \(String(format: "%02d:00", mostActive.startHour))-\(String(format: "%02d:00", mostActive.startHour + 4))")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Color.ink)
                            Spacer()
                            if mostActive.count > 0 {
                                Text("\(mostActive.count) 次")
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(Color.slate)
                            }
                        }
                        .padding(12)
                        .background(Color.coralSoft, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                }
                .padding(16)
                .background(Color.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                Text("统计仅基于本机保存的胎动记录，用于回顾趋势，不替代医生的专业判断。")
                    .font(.footnote)
                    .foregroundStyle(Color.slate)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}
