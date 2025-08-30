import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var app: AppState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        #if os(macOS)
        VStack(spacing: 12) {
            Form {
                Section(header: Text("OpenRouter")) {
                    SecureField("API Key", text: $app.settings.openRouterKey)
                        .textFieldStyle(.roundedBorder)
                    TextField("Default Model", text: $app.settings.defaultModel)
                        .textFieldStyle(.roundedBorder)
                    Picker("Reasoning Effort", selection: $app.settings.reasoningEffort) {
                        ForEach(ReasoningEffort.allCases) { val in
                            Text(val.label).tag(val)
                        }
                    }
                }
                Section(header: Text("Postmark")) {
                    SecureField("API Key", text: $app.settings.postmarkKey)
                        .textFieldStyle(.roundedBorder)
                    TextField("From Email", text: $app.settings.fromEmail)
                        .textFieldStyle(.roundedBorder)
                    TextField("To Tentative Email", text: $app.settings.toTentativeEmail)
                        .textFieldStyle(.roundedBorder)
                    TextField("To Confirmed Email", text: $app.settings.toConfirmedEmail)
                        .textFieldStyle(.roundedBorder)
                }
            }
            HStack {
                Spacer()
                Button("Save") {
                    Log.general.info("Settings: save tapped (model=\(app.settings.defaultModel, privacy: .public), from=\(app.settings.fromEmail, privacy: .public))")
                    app.saveSettings()
                    dismiss()
                }
                .keyboardShortcut(.defaultAction)
            }
        }
        .padding(16)
        .frame(minWidth: 360, idealWidth: 380, maxWidth: 420,
               minHeight: 360, idealHeight: 420, maxHeight: 520,
               alignment: .top)
        #else
        NavigationView {
            Form {
                Section(header: Text("OpenRouter")) {
                    SecureField("API Key", text: $app.settings.openRouterKey)
                    TextField("Default Model", text: $app.settings.defaultModel)
                    Picker("Reasoning Effort", selection: $app.settings.reasoningEffort) {
                        ForEach(ReasoningEffort.allCases) { val in
                            Text(val.label).tag(val)
                        }
                    }
                }
                Section(header: Text("Postmark")) {
                    SecureField("API Key", text: $app.settings.postmarkKey)
                    #if canImport(UIKit)
                    TextField("From Email", text: $app.settings.fromEmail)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                    TextField("To Tentative Email", text: $app.settings.toTentativeEmail)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                    TextField("To Confirmed Email", text: $app.settings.toConfirmedEmail)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                    #else
                    TextField("From Email", text: $app.settings.fromEmail)
                    TextField("To Tentative Email", text: $app.settings.toTentativeEmail)
                    TextField("To Confirmed Email", text: $app.settings.toConfirmedEmail)
                    #endif
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Log.general.info("Settings: save tapped (model=\(app.settings.defaultModel, privacy: .public), from=\(app.settings.fromEmail, privacy: .public))")
                        app.saveSettings()
                        dismiss()
                    }
                }
            }
        }
        #endif
    }
}
