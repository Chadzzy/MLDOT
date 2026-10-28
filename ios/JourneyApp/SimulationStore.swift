import Foundation
import Combine

@MainActor final class SimulationStore: ObservableObject {
    @Published private(set) var simulation = JourneySimulation()
    @Published private(set) var now = Date(timeIntervalSinceReferenceDate: ProcessInfo.processInfo.systemUptime)
    @Published private(set) var busy = false
    @Published private(set) var errorMessage: String?
    @Published private(set) var hasPendingChange = false
    @Published private(set) var serverPreferences: JourneyServerSnapshot.Preferences?
    private let service = SupabaseJourneyService()
    private let currentKey = "journey-server-current-id"
    private let creationKey = "journey-server-creation-id"
    private var timer: AnyCancellable?
    private var foreground = true
    private var lastAttempt: TimeInterval = 0
    private var currentID: UUID? { UserDefaults.standard.string(forKey: currentKey).flatMap(UUID.init(uuidString:)) }
    private var creationID: UUID? { UserDefaults.standard.string(forKey: creationKey).flatMap(UUID.init(uuidString:)) }
    private var monotonicNow: Date { Date(timeIntervalSinceReferenceDate: ProcessInfo.processInfo.systemUptime) }
    var canChange: Bool { !busy && errorMessage == nil && !hasPendingChange }
    var payload: [String: Any] {
        var result = simulation.payload(at: now)
        result["connection"] = errorMessage == nil ? "supabase" : "stale"
        if let prefs = serverPreferences {
            result["preferences"] = ["recoveryPriority": prefs.recoveryPriority, "recoveryText": prefs.recoveryText]
        }
        return result
    }
    init() {
        timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect().sink { [weak self] _ in
            guard let self, foreground else { return }
            now = monotonicNow
            // Foreground snapshot reconciliation, not provider/flight monitoring.
            let interval: TimeInterval = errorMessage == nil ? 10 : 30
            if currentID != nil && !busy && ProcessInfo.processInfo.systemUptime - lastAttempt > interval {
                Task { await refresh() }
            }
        }
        if currentID != nil || creationID != nil { Task { await refresh() } }
    }
    private func accept(_ value: JourneyServerSnapshot) {
        now = monotonicNow
        simulation = value.presentation(at: now)
        serverPreferences = value.preferences
        errorMessage = nil
    }
    private func failed(_ error: Error) {
        now = monotonicNow
        simulation.elapsed = simulation.progress(at: now)
        simulation.anchor = now; simulation.running = false
        errorMessage = error.localizedDescription
    }
    private func pending() throws -> JourneyPendingCommand? {
        guard let data = try JourneyKeychain.read("pending-command") else { return nil }
        return try JSONDecoder().decode(JourneyPendingCommand.self, from: data)
    }
    private func submit(_ value: JourneyPendingCommand) async throws {
        do {
            let receipt = try await service.command(value)
            try JourneyKeychain.remove("pending-command"); hasPendingChange = false
            accept(receipt)
        } catch let error as BackendFailure where (400..<500).contains(error.status) && error.status != 429 {
            // A definite rejection has no unknown effect. Do not change its version and retry silently.
            try JourneyKeychain.remove("pending-command"); hasPendingChange = false
            if error.status == 409, let latest = try? await service.snapshot(value.journeyID) { accept(latest) }
            throw error
        }
    }
    @discardableResult func confirmBooking() async -> Bool {
        guard !busy, currentID == nil else { return false }
        busy = true; defer { busy = false }
        let id = creationID ?? UUID()
        UserDefaults.standard.set(id.uuidString, forKey: creationKey)
        do {
            let value = try await service.create(id)
            UserDefaults.standard.set(id.uuidString, forKey: currentKey)
            UserDefaults.standard.removeObject(forKey: creationKey)
            accept(value); lastAttempt = ProcessInfo.processInfo.systemUptime
            return true
        } catch { failed(error); return false }
    }
    func refresh() async {
        guard !busy else { return }
        if currentID == nil {
            if creationID != nil { _ = await confirmBooking() }
            return
        }
        guard let id = currentID else { return }
        busy = true; lastAttempt = ProcessInfo.processInfo.systemUptime
        defer { busy = false }
        do {
            guard try JourneyKeychain.read("session") != nil else {
                throw BackendFailure(status: 401, message: "This installation no longer has the saved journey identity. The existing journey has not been changed.")
            }
            if let change = try pending() { hasPendingChange = true; try await submit(change) }
            accept(try await service.snapshot(id))
        } catch { failed(error) }
    }
    @discardableResult func change(_ kind: String, args: [String: String] = [:]) async -> Bool {
        guard canChange, let id = currentID else { return false }
        busy = true; defer { busy = false }
        let command = JourneyPendingCommand(journeyID: id, commandID: UUID(), expectedVersion: simulation.revision, kind: kind, arguments: args)
        do {
            guard try pending() == nil else { hasPendingChange = true; throw BackendFailure(status: 0, message: "Reconnect to finish the pending change first.") }
            try JourneyKeychain.write(JSONEncoder().encode(command), account: "pending-command")
            hasPendingChange = true
            try await submit(command)
            accept(try await service.snapshot(id))
            lastAttempt = ProcessInfo.processInfo.systemUptime
            return true
        } catch { failed(error); return false }
    }
    func reset() {
        guard !busy && !hasPendingChange else { return }
        do { if try pending() != nil { hasPendingChange = true; return } }
        catch { failed(error); return }
        // Keep the identity and old server history. The next booking receives a new UUID.
        UserDefaults.standard.removeObject(forKey: currentKey)
        UserDefaults.standard.removeObject(forKey: creationKey)
        simulation = JourneySimulation(); serverPreferences = nil; errorMessage = nil
    }
    func resume() { foreground = true; now = monotonicNow; Task { await refresh() } }
    func suspend() { foreground = false }
}
