import Foundation
import SwiftUI

@MainActor
final class DiaryStore: ObservableObject {
    @Published private(set) var records: [MovementRecord] = []
    @Published var settings: DiarySettings = DiarySettings()

    private let recordsKey = "fetal-diary-records-v1"
    private let settingsKey = "fetal-diary-settings-v1"
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        load()
    }

    var todayRecords: [MovementRecord] {
        let start = Date().diaryStartOfDay
        let end = Calendar.diary.date(byAdding: .day, value: 1, to: start) ?? start
        return records.filter { $0.timestamp >= start && $0.timestamp < end }
            .sorted { $0.timestamp > $1.timestamp }
    }

    var pregnancyInfo: PregnancyInfo? {
        guard let selectedDate = settings.dueDate else { return nil }
        let lmp: Date
        let dueDate: Date
        if settings.dueType == .lmp {
            lmp = selectedDate.diaryStartOfDay
            dueDate = Calendar.diary.date(byAdding: .day, value: 280, to: lmp) ?? lmp
        } else {
            dueDate = selectedDate.diaryStartOfDay
            lmp = Calendar.diary.date(byAdding: .day, value: -280, to: dueDate) ?? dueDate
        }
        let elapsed = max(0, min(280, Calendar.diary.dateComponents([.day], from: lmp.diaryStartOfDay, to: Date().diaryStartOfDay).day ?? 0))
        return PregnancyInfo(weeks: elapsed / 7, days: elapsed % 7, dueDate: dueDate)
    }

    func addMovement(at date: Date = Date()) {
        records.insert(MovementRecord(timestamp: date), at: 0)
        saveRecords()
    }

    func update(_ record: MovementRecord, timestamp: Date) {
        guard timestamp <= Date(), let index = records.firstIndex(where: { $0.id == record.id }) else { return }
        records[index].timestamp = timestamp
        records.sort { $0.timestamp > $1.timestamp }
        saveRecords()
    }

    func delete(_ record: MovementRecord) {
        records.removeAll { $0.id == record.id }
        saveRecords()
    }

    func delete(at offsets: IndexSet, from visibleRecords: [MovementRecord]) {
        let ids = offsets.compactMap { visibleRecords.indices.contains($0) ? visibleRecords[$0].id : nil }
        records.removeAll { ids.contains($0.id) }
        saveRecords()
    }

    func clearAll() {
        records = []
        saveRecords()
    }

    func setClockMode(_ mode: ClockMode) {
        settings.clockMode = mode
        saveSettings()
    }

    func setDueType(_ type: DueDateType) {
        settings.dueType = type
        saveSettings()
    }

    func setDueDate(_ date: Date?) {
        settings.dueDate = date
        saveSettings()
    }

    func filteredRecords(_ filter: RecordFilter) -> [MovementRecord] {
        let now = Date()
        switch filter {
        case .today:
            return records.filter { $0.timestamp >= now.diaryStartOfDay && $0.timestamp <= now }
        case .week:
            let start = now.diaryStartOfDay.addingDiaryDays(-6)
            return records.filter { $0.timestamp >= start && $0.timestamp <= now }
        case .all:
            return records
        }
    }

    func dayGroups(for filter: RecordFilter) -> [DayGroup] {
        let grouped = Dictionary(grouping: filteredRecords(filter)) { $0.timestamp.diaryDateKey }
        return grouped.keys.sorted(by: >).compactMap { key in
            guard let dayRecords = grouped[key], let date = dayRecords.first?.timestamp else { return nil }
            return DayGroup(id: key, date: date, records: dayRecords.sorted { $0.timestamp > $1.timestamp })
        }
    }

    func dailyStats(referenceDate: Date = Date()) -> [DailyStat] {
        (0..<7).map { index in
            let date = referenceDate.addingDiaryDays(index - 6).diaryStartOfDay
            let count = records.filter { $0.timestamp.diaryDateKey == date.diaryDateKey }.count
            return DailyStat(id: date.diaryDateKey, date: date, count: count)
        }
    }

    func hourlyStats() -> [HourlyStat] {
        (0..<6).map { index in
            let startHour = index * 4
            let count = records.filter {
                let hour = Calendar.diary.component(.hour, from: $0.timestamp)
                return hour >= startHour && hour < startHour + 4
            }.count
            return HourlyStat(id: index, startHour: startHour, count: count)
        }
    }

    func exportCSV(from: Date, to: Date) throws -> URL {
        let start = from.diaryStartOfDay
        let end = Calendar.diary.date(byAdding: DateComponents(day: 1, second: -1), to: to.diaryStartOfDay) ?? to
        let selected = records.filter { $0.timestamp >= start && $0.timestamp <= end }.sorted { $0.timestamp < $1.timestamp }
        let rows = [["日期", "时间", "时间戳"],] + selected.map {
            [$0.timestamp.diaryDateKey, $0.timestamp.diaryTime, DateFormatters.iso8601.string(from: $0.timestamp)]
        }
        let csv = "\u{FEFF}" + rows.map { $0.map(quoteCSV).joined(separator: ",") }.joined(separator: "\r\n")
        let fileName = "胎动记录-\(from.diaryDateKey)-\(to.diaryDateKey).csv"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        try csv.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    private func quoteCSV(_ value: String) -> String {
        "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\""
    }

    private func load() {
        if let data = defaults.data(forKey: recordsKey),
           let decoded = try? JSONDecoder.diary.decode([MovementRecord].self, from: data) {
            records = decoded.sorted { $0.timestamp > $1.timestamp }
        }
        if let data = defaults.data(forKey: settingsKey),
           let decoded = try? JSONDecoder.diary.decode(DiarySettings.self, from: data) {
            settings = decoded
        }
    }

    private func saveRecords() {
        guard let data = try? JSONEncoder.diary.encode(records) else { return }
        defaults.set(data, forKey: recordsKey)
    }

    private func saveSettings() {
        guard let data = try? JSONEncoder.diary.encode(settings) else { return }
        defaults.set(data, forKey: settingsKey)
    }
}

private extension JSONEncoder {
    static var diary: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}

private extension JSONDecoder {
    static var diary: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
