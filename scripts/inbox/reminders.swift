// Read and complete Apple Reminders through EventKit, which is much faster than AppleScript.
// Usage: swift reminders.swift list <list name> | swift reminders.swift complete <id>

import EventKit
import Foundation

let store = EKEventStore()
let arguments = CommandLine.arguments

/** Print a message to stderr and exit with failure. */
func fail(_ message: String) -> Never {
  FileHandle.standardError.write("\(message)\n".data(using: .utf8)!)
  exit(1)
}

let access = DispatchSemaphore(value: 0)
store.requestFullAccessToReminders { granted, error in
  if !granted { fail("Reminders access denied: \(String(describing: error))") }
  access.signal()
}
access.wait()

switch (arguments.count > 1 ? arguments[1] : "", arguments.count > 2 ? arguments[2] : "") {
case ("list", let name) where !name.isEmpty:
  let calendars = store.calendars(for: .reminder).filter { $0.title == name }
  if calendars.isEmpty { fail("No Reminders list named \(name)") }
  let predicate = store.predicateForIncompleteReminders(
    withDueDateStarting: nil, ending: nil, calendars: calendars)
  let fetched = DispatchSemaphore(value: 0)
  store.fetchReminders(matching: predicate) { reminders in
    let items = (reminders ?? []).map {
      ["id": $0.calendarItemIdentifier, "name": $0.title ?? "", "body": $0.notes ?? ""]
    }
    let json = try! JSONSerialization.data(withJSONObject: items)
    print(String(data: json, encoding: .utf8)!)
    fetched.signal()
  }
  fetched.wait()
case ("complete", let id) where !id.isEmpty:
  guard let reminder = store.calendarItem(withIdentifier: id) as? EKReminder else {
    fail("No reminder with id \(id)")
  }
  reminder.isCompleted = true
  do { try store.save(reminder, commit: true) } catch { fail("Could not complete reminder: \(error)") }
default:
  fail("Usage: reminders.swift list <list name> | reminders.swift complete <id>")
}
