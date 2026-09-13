import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("首页", systemImage: "house") }
            RecordsView()
                .tabItem { Label("时间线", systemImage: "list.bullet.rectangle") }
            StatsView()
                .tabItem { Label("统计", systemImage: "chart.bar.xaxis") }
            SettingsView()
                .tabItem { Label("设置", systemImage: "gearshape") }
        }
        .background(Color.appBackground.ignoresSafeArea())
    }
}

struct ScreenContainer<Content: View>: View {
    let title: String
    let note: String
    let content: Content

    init(title: String, note: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.note = note
        self.content = content()
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(title)
                            .font(.system(size: 30, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.ink)
                        Spacer()
                        Text(note)
                            .font(.footnote)
                            .foregroundStyle(Color.slate)
                    }
                    content
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
            .background(Color.appBackground.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
    }
}

struct SectionHeading: View {
    let eyebrow: String
    let title: String
    let note: String?

    init(_ eyebrow: String, _ title: String, note: String? = nil) {
        self.eyebrow = eyebrow
        self.title = title
        self.note = note
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(eyebrow.uppercased())
                .font(.caption2.weight(.semibold))
                .tracking(1.2)
                .foregroundStyle(Color.coral)
            HStack(alignment: .firstTextBaseline) {
                Text(title)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.ink)
                if let note {
                    Spacer()
                    Text(note)
                        .font(.caption)
                        .foregroundStyle(Color.slate)
                }
            }
        }
    }
}

struct MetricTile: View {
    let value: String
    let label: String
    var tint: Color = .coral

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(value)
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(tint)
            Text(label)
                .font(.caption)
                .foregroundStyle(Color.slate)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.white.opacity(0.82), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

struct AnalogClockView: View {
    let date: Date

    var body: some View {
        GeometryReader { proxy in
            let size = min(proxy.size.width, proxy.size.height)
            let calendar = Calendar.diary
            let hour = Double(calendar.component(.hour, from: date) % 12)
            let minute = Double(calendar.component(.minute, from: date))
            let second = Double(calendar.component(.second, from: date))
            ZStack {
                Circle().fill(Color.white.opacity(0.8))
                Circle().stroke(Color.sageSoft, lineWidth: 2)
                ForEach(0..<12, id: \.self) { index in
                    Capsule()
                        .fill(index % 3 == 0 ? Color.ink : Color.sage)
                        .frame(width: index % 3 == 0 ? 3 : 2, height: index % 3 == 0 ? 12 : 7)
                        .offset(y: -size * 0.39)
                        .rotationEffect(.degrees(Double(index) * 30))
                }
                ClockHand(length: size * 0.24, width: 5, color: .ink)
                    .rotationEffect(.degrees(hour * 30 + minute * 0.5))
                ClockHand(length: size * 0.33, width: 3, color: .slate)
                    .rotationEffect(.degrees(minute * 6 + second * 0.1))
                ClockHand(length: size * 0.37, width: 1.5, color: .coral)
                    .rotationEffect(.degrees(second * 6))
                Circle().fill(Color.coral).frame(width: 10, height: 10)
            }
            .frame(width: size, height: size)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

private struct ClockHand: View {
    let length: CGFloat
    let width: CGFloat
    let color: Color

    var body: some View {
        Capsule()
            .fill(color)
            .frame(width: width, height: length)
            .offset(y: -length / 2)
    }
}

struct SimpleBarChart: View {
    let values: [Int]
    let labels: [String]
    let tint: Color

    var body: some View {
        let maximum = max(values.max() ?? 0, 1)
        HStack(alignment: .bottom, spacing: 10) {
            ForEach(Array(values.indices), id: \.self) { index in
                VStack(spacing: 7) {
                    Text("\(values[index])")
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(Color.slate)
                    GeometryReader { proxy in
                        VStack {
                            Spacer(minLength: 0)
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(values[index] == 0 ? Color.sageSoft : tint)
                                .frame(height: max(6, proxy.size.height * CGFloat(values[index]) / CGFloat(maximum)))
                        }
                    }
                    .frame(height: 120)
                    Text(labels[index])
                        .font(.caption2)
                        .foregroundStyle(Color.slate)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
}

struct WaveChart: View {
    let records: [MovementRecord]

    var values: [Int] {
        (0..<12).map { slot in
            records.filter {
                let hour = Calendar.diary.component(.hour, from: $0.timestamp)
                return hour >= slot * 2 && hour < slot * 2 + 2
            }.count
        }
    }

    var body: some View {
        let maximum = max(values.max() ?? 0, 1)
        HStack(alignment: .bottom, spacing: 5) {
            ForEach(Array(values.indices), id: \.self) { index in
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .fill(index % 4 == 0 ? Color.coral : Color.sage)
                    .frame(maxWidth: .infinity)
                    .frame(height: max(8, 96 * CGFloat(values[index]) / CGFloat(maximum)))
            }
        }
        .frame(height: 108, alignment: .bottom)
    }
}
