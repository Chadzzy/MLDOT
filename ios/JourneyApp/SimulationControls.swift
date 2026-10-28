import SwiftUI

struct SimulationControls: View {
    @ObservedObject var store: SimulationStore
    @Environment(\.dismiss) private var dismiss
    @State private var confirmReset = false
    var body: some View {
        NavigationStack {
            Form {
                Section("Demonstration journey") {
                    Label("CX383 · Hong Kong → Zurich", systemImage: "airplane")
                    Text("Emma Chan · Diamond · Business").foregroundStyle(.secondary)
                    Text("Replay itinerary: 28 Oct 2026, 00:25 HKT. No ticket is purchased.").font(.footnote)
                    if !store.simulation.booked {
                        Button("Confirm demonstration booking") { Task { if await store.confirmBooking() { dismiss() } } }.disabled(store.busy)
                    } else {
                        Label("Demonstration booking confirmed", systemImage: "checkmark.circle")
                    }
                }
                if store.simulation.booked {
                  Group {
                    Section("Playback") {
                        Picker("Mode", selection: Binding(get: { store.simulation.mode }, set: { mode in Task { await store.change("set_mode", args: ["mode": mode.rawValue]) } })) {
                            Text("Guided").tag(JourneySimulation.Mode.guided)
                            Text("10-minute playback").tag(JourneySimulation.Mode.accelerated)
                            Text("Real time").tag(JourneySimulation.Mode.realtime)
                        }
                        if store.simulation.mode != .guided {
                            Button(store.simulation.running ? "Pause" : "Play") { Task { await store.change(store.simulation.running ? "pause" : "play") } }
                                .disabled(store.simulation.progress(at: store.now) >= JourneySimulation.duration || store.simulation.event != nil)
                        }
                        ProgressView(value: store.simulation.progress(at: store.now), total: JourneySimulation.duration)
                        Text(store.simulation.phase(at: store.now).title)
                        Text("Demonstration time: \(clockText)")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    Section("Jump to a moment") {
                        ForEach(JourneySimulation.Phase.allCases, id: \.self) { phase in
                            Button(phase.title) { Task { if await store.change("jump", args: ["phase": phase.rawValue]) { dismiss() } } }
                        }
                    }
                    if [.pretravel, .airport, .boarding].contains(store.simulation.phase(at: store.now)) {
                        Section("Introduce a change") {
                            Button("Gate changes to 62") { inject(.gate) }
                            Button("Departure delayed") { inject(.delay) }
                            Button("Flight cancelled") { inject(.cancelled) }
                            if store.simulation.event != nil { Button("Clear injected change") { inject(nil) } }
                            Text("Injecting a change pauses playback. Clear it or jump to another moment before playing again.").font(.footnote)
                        }
                    }
                  }.disabled(!store.canChange)
                }
                Section("Connection") {
                    if store.busy { ProgressView("Syncing journey…") }
                    if let message = store.errorMessage {
                        Text(message).foregroundStyle(.red)
                        Button(store.hasPendingChange ? "Reconnect and retry pending change" : "Retry connection") { Task { await store.refresh() } }.disabled(store.busy)
                    } else {
                        Label(store.simulation.booked ? "Journey saved in Supabase" : "Ready to save your demonstration", systemImage: "checkmark.icloud")
                    }
                    Text("The server keeps your journey clock. The app checks for changes while open and reconnects when you return. Live flight monitoring and push notifications are not connected.").font(.footnote).foregroundStyle(.secondary)
                }
                Button("Reset demonstration", role: .destructive) { confirmReset = true }.disabled(store.busy || store.hasPendingChange)
            }
            .navigationTitle("Journey simulation")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .confirmationDialog("Reset this demonstration journey?", isPresented: $confirmReset) {
                Button("Reset", role: .destructive) { store.reset() }
            }
        }
        .tint(Color(red: 0, green: 0.37, blue: 0.39))
    }
    private var clockText: String {
        let formatter = DateFormatter()
        formatter.timeZone = TimeZone(identifier: "Asia/Hong_Kong")
        formatter.dateFormat = "d MMM, HH:mm 'HKT'"
        return formatter.string(from: JourneySimulation.flightStart.addingTimeInterval(store.simulation.progress(at: store.now)))
    }
    private func inject(_ event: JourneySimulation.Event?) {
        Task {
            let success = await store.change(event == nil ? "clear_event" : "inject", args: event.map { ["event": $0.rawValue] } ?? [:])
            if success { dismiss() }
        }
    }
}
