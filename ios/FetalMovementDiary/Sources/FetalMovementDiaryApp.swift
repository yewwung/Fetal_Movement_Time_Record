import SwiftUI

@main
struct FetalMovementDiaryApp: App {
    @StateObject private var store = DiaryStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .tint(.coral)
        }
    }
}
