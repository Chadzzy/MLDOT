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
                        Button("Confirm demonstration booking") { store.update { $0.start(at: $1) }; dismiss() }
                    } else {
                        Label("Demonstration booking confirmed", systemImage: "checkmark.circle")
                    }
                }
                if store.simulation.booked {
                    Section("Playback") {
                        Picker("Mode", selection: Binding(get: { store.simulation.mode }, set: { mode in store.update { $0.setMode(mode, at: $1) } })) {
                            Text("Guided").tag(JourneySimulation.Mode.guided)
                            Text("10-minute playback").tag(JourneySimulation.Mode.accelerated)
                            Text("Real time").tag(JourneySimulation.Mode.realtime)
                        }
                        if store.simulation.mode != .guided {
                            Button(store.simulation.running ? "Pause" : "Play") { store.update { $0.toggle(at: $1) } }
                                .disabled(store.simulation.progress(at: store.now) >= JourneySimulation.duration)
                        }
                        ProgressView(value: store.simulation.progress(at: store.now), total: JourneySimulation.duration)
                        Text(store.simulation.phase(at: store.now).title)
                        Text("Demonstration time: \(clockText)")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    Section("Jump to a moment") {
                        ForEach(JourneySimulation.Phase.allCases, id: \.self) { phase in
                            Button(phase.title) { store.update { $0.jump(phase, at: $1) }; dismiss() }
                        }
                    }
                    if [.pretravel, .airport, .boarding].contains(store.simulation.phase(at: store.now)) {
                        Section("Introduce a change") {
                            Button("Gate changes to 62") { inject(.gate) }
                            Button("Departure delayed") { inject(.delay) }
                            Button("Flight cancelled") { inject(.cancelled) }
                            if store.simulation.event != nil { Button("Clear injected change") { inject(nil) } }
                            Text("Injecting a change pauses playback. Jumping to a moment clears it.").font(.footnote)
                        }
                    }
                }
                Section("Connection") {
                    Text("Local playback · backend not connected")
                    Text("Progress resumes from the saved clock when you return. This version does not monitor flights or send background notifications.").font(.footnote).foregroundStyle(.secondary)
                }
                Button("Reset demonstration", role: .destructive) { confirmReset = true }
            }
            .navigationTitle("Journey simulation")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .confirmationDialog("Reset this demonstration journey?", isPresented: $confirmReset) {
                Button("Reset", role: .destructive) { store.update { value, _ in value = JourneySimulation() } }
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
    private func inject(_ event: JourneySimulation.Event?) { store.update { $0.inject(event, at: $1) }; dismiss() }
}
