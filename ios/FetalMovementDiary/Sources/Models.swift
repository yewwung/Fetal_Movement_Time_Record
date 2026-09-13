import Foundation
import SwiftUI

struct MovementRecord: Identifiable, Codable, Equatable {
    let id: UUID
    var timestamp: Date

    init(id: UUID = UUID(), timestamp: Date = Date()) {
        self.id = id
        self.timestamp = timestamp
    }
}

enum ClockMode: String, Codable, CaseIterable, Identifiable {
    case digital
    case analog

    var id: String { rawValue }
    var title: String { self == .digital ? "数字" : "表盘" }
}

enum DueDateType: String, Codable, CaseIterable, Identifiable {
    case lmp
    case due

    var id: String { rawValue }
    var title: String { self == .lmp ? "末次月经" : "预产期" }
}

enum RecordFilter: String, CaseIterable, Identifiable {
    case today
    case week
    case all

    var id: String { rawValue }
    var title: String {
        switch self {
        case .today: return "今天"
        case .week: return "近 7 天"
        case .all: return "全部"
        }
    }
}

struct DiarySettings: Codable, Equatable {
    var clockMode: ClockMode = .digital
    var dueType: DueDateType = .lmp
    var dueDate: Date? = nil
}

struct PregnancyInfo {
    let weeks: Int
    let days: Int
    let dueDate: Date
}

struct DayGroup: Identifiable {
    let id: String
    let date: Date
    let records: [MovementRecord]
}

struct DailyStat: Identifiable {
    let id: String
    let date: Date
    let count: Int
}

struct HourlyStat: Identifiable {
    let id: Int
    let startHour: Int
    let count: Int
}

enum DateFormatters {
    static let dateKey: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static let fullDate: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "yyyy年M月d日 EEEE"
        return formatter
    }()

    static let monthDay: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "M月d日"
        return formatter
    }()

    static let time: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "HH:mm:ss"
        return formatter
    }()

    static let timeWithoutSeconds: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "HH:mm"
        return formatter
    }()

    static let iso8601 = ISO8601DateFormatter()
}

extension Calendar {
    static var diary: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "zh_CN")
        calendar.timeZone = .current
        return calendar
    }
}

extension Date {
    var diaryDateKey: String { DateFormatters.dateKey.string(from: self) }
    var diaryFullDate: String { DateFormatters.fullDate.string(from: self) }
    var diaryMonthDay: String { DateFormatters.monthDay.string(from: self) }
    var diaryTime: String { DateFormatters.time.string(from: self) }
    var diaryTimeWithoutSeconds: String { DateFormatters.timeWithoutSeconds.string(from: self) }

    func addingDiaryDays(_ days: Int) -> Date {
        Calendar.diary.date(byAdding: .day, value: days, to: self) ?? self
    }

    var diaryStartOfDay: Date {
        Calendar.diary.startOfDay(for: self)
    }
}

extension Color {
    static let coral = Color(red: 0.941, green: 0.420, blue: 0.337)
    static let coralSoft = Color(red: 0.992, green: 0.914, blue: 0.894)
    static let ink = Color(red: 0.118, green: 0.165, blue: 0.220)
    static let slate = Color(red: 0.349, green: 0.404, blue: 0.435)
    static let sage = Color(red: 0.608, green: 0.718, blue: 0.659)
    static let sageSoft = Color(red: 0.910, green: 0.937, blue: 0.914)
    static let appBackground = Color(red: 0.965, green: 0.969, blue: 0.953)
}
