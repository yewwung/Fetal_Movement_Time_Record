import XCTest
@testable import FetalMovementDiary

@MainActor
final class DiaryStoreTests: XCTestCase {
    func testRecordsPersistAndFilterLocally() {
        let suiteName = "fetal-diary-tests-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        let store = DiaryStore(defaults: defaults)
        let now = Date()

        store.addMovement(at: now)
        store.addMovement(at: now.addingDiaryDays(-2))

        XCTAssertEqual(store.records.count, 2)
        XCTAssertEqual(store.filteredRecords(.today).count, 1)
        XCTAssertEqual(store.filteredRecords(.week).count, 2)

        let reloaded = DiaryStore(defaults: defaults)
        XCTAssertEqual(reloaded.records.count, 2)
        defaults.removePersistentDomain(forName: suiteName)
    }

    func testPregnancyCalculationAndCSVExport() throws {
        let suiteName = "fetal-diary-tests-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        let store = DiaryStore(defaults: defaults)
        let lmp = Calendar.diary.date(from: DateComponents(year: 2026, month: 1, day: 1))!
        store.setDueType(.lmp)
        store.setDueDate(lmp)
        store.addMovement(at: lmp)

        XCTAssertEqual(store.pregnancyInfo?.dueDate.diaryDateKey, "2026-10-08")
        let url = try store.exportCSV(from: lmp, to: lmp)
        let csv = try String(contentsOf: url, encoding: .utf8)
        XCTAssertTrue(csv.contains("日期"))
        XCTAssertTrue(csv.contains("时间"))
        XCTAssertTrue(csv.contains("2026-01-01"))

        try? FileManager.default.removeItem(at: url)
        defaults.removePersistentDomain(forName: suiteName)
    }
}
